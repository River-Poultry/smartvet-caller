import { query } from '../config/db.js';

// ─── Vet field inventory ───────────────────────────────────────────────────────

export async function getInventory(req, res) {
  const { vet_id, disease, category } = req.query;
  const conditions = [];
  const params = [];

  if (vet_id)    { params.push(vet_id);    conditions.push(`vet_django_id = $${params.length}`); }
  if (category)  { params.push(category);  conditions.push(`category = $${params.length}`); }
  if (disease)   { params.push(disease);   conditions.push(`$${params.length} = ANY(diseases)`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT vi.*,
            w.quantity AS warehouse_quantity
     FROM vet_inventory vi
     LEFT JOIN warehouse_inventory w ON w.product_name = vi.product_name
     ${where}
     ORDER BY vi.vet_name, vi.category, vi.product_name`,
    params
  );
  res.json(rows);
}

export async function getDrugSuggestions(req, res) {
  const { diseases } = req.query;
  if (!diseases) return res.json([]);

  const diseaseList = diseases.split(',').map(d => d.trim());

  const { rows } = await query(
    `SELECT
       vi.product_name, vi.category, vi.unit,
       array_agg(DISTINCT vi.vet_name) AS available_from_vets,
       array_agg(DISTINCT vi.vet_django_id) AS vet_ids,
       sum(vi.quantity_in_stock) AS total_vet_stock,
       max(w.quantity) AS warehouse_stock,
       vi.diseases, vi.notes
     FROM vet_inventory vi
     LEFT JOIN warehouse_inventory w ON w.product_name = vi.product_name
     WHERE vi.quantity_in_stock > 0
       AND vi.diseases && $1
     GROUP BY vi.product_name, vi.category, vi.unit, vi.diseases, vi.notes
     ORDER BY vi.category, vi.product_name`,
    [diseaseList]
  );

  res.json(rows);
}

export async function upsertInventoryItem(req, res) {
  const {
    vet_django_id, vet_name, product_name, category,
    unit, quantity, quantity_in_stock, min_stock, diseases, notes
  } = req.body;

  if (!vet_django_id || !product_name) {
    return res.status(400).json({ error: 'vet_django_id and product_name required' });
  }

  const stock = quantity_in_stock ?? quantity ?? 0;
  const { rows } = await query(
    `INSERT INTO vet_inventory
       (vet_django_id, vet_name, product_name, category, unit, quantity, quantity_in_stock, min_stock, diseases, notes, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,NOW())
     ON CONFLICT (vet_django_id, product_name) DO UPDATE SET
       quantity_in_stock = EXCLUDED.quantity_in_stock,
       quantity = EXCLUDED.quantity_in_stock,
       min_stock = COALESCE(EXCLUDED.min_stock, vet_inventory.min_stock),
       diseases = COALESCE(EXCLUDED.diseases, vet_inventory.diseases),
       notes = COALESCE(EXCLUDED.notes, vet_inventory.notes),
       updated_at = NOW()
     RETURNING *`,
    [vet_django_id, vet_name, product_name, category || 'other',
     unit || 'dose', stock, min_stock || 5, diseases || [], notes]
  );

  res.json(rows[0]);
}

// Vet self-reports their remaining field stock (no admin required)
export async function vetUpdateStock(req, res) {
  const { id } = req.params;
  const { quantity_in_stock, notes } = req.body;
  const agentName = req.agent?.name || 'vet';

  if (quantity_in_stock == null) {
    return res.status(400).json({ error: 'quantity_in_stock required' });
  }

  const { rows } = await query(
    `UPDATE vet_inventory
     SET quantity_in_stock = $1,
         quantity = $1,
         last_updated_by = $2,
         notes = COALESCE($3, notes),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [quantity_in_stock, agentName, notes || null, id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Item not found' });
  res.json(rows[0]);
}

// Admin adjusts stock by delta or sets absolute value
export async function adjustStock(req, res) {
  const { id } = req.params;
  const { delta, quantity } = req.body;

  const { rows } = await query(
    quantity != null
      ? `UPDATE vet_inventory SET quantity_in_stock=$1, quantity=$1, updated_at=NOW() WHERE id=$2 RETURNING *`
      : `UPDATE vet_inventory SET quantity_in_stock=GREATEST(0,quantity_in_stock+$1), quantity=GREATEST(0,quantity+$1), updated_at=NOW() WHERE id=$2 RETURNING *`,
    [quantity ?? delta, id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Item not found' });
  res.json(rows[0]);
}

// ─── Warehouse / central store ────────────────────────────────────────────────

export async function getWarehouse(req, res) {
  const { rows } = await query(
    `SELECT w.*,
            coalesce(sum(vi.quantity_in_stock), 0) AS allocated_to_vets
     FROM warehouse_inventory w
     LEFT JOIN vet_inventory vi ON vi.product_name = w.product_name
     GROUP BY w.id
     ORDER BY w.category, w.product_name`
  );
  res.json(rows);
}

export async function updateWarehouseStock(req, res) {
  const { id } = req.params;
  const { quantity, delta, notes } = req.body;

  const { rows } = await query(
    quantity != null
      ? `UPDATE warehouse_inventory SET quantity=$1, notes=COALESCE($2,notes), updated_at=NOW() WHERE id=$3 RETURNING *`
      : `UPDATE warehouse_inventory SET quantity=GREATEST(0,quantity+$1), updated_at=NOW() WHERE id=$2 RETURNING *`,
    quantity != null ? [quantity, notes || null, id] : [delta, id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Item not found' });
  res.json(rows[0]);
}

// Allocate from warehouse → vet's field kit
export async function allocateToVet(req, res) {
  const { product_name, vet_django_id, vet_name, quantity_allocated, notes } = req.body;
  if (!product_name || !vet_django_id || !quantity_allocated) {
    return res.status(400).json({ error: 'product_name, vet_django_id, quantity_allocated required' });
  }

  const warehouseRes = await query(
    `UPDATE warehouse_inventory
     SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
     WHERE product_name = $2 AND quantity >= $1
     RETURNING *`,
    [quantity_allocated, product_name]
  );
  if (!warehouseRes.rows.length) {
    return res.status(400).json({ error: 'Insufficient warehouse stock or product not found' });
  }

  const vetRes = await query(
    `INSERT INTO vet_inventory (vet_django_id, vet_name, product_name, category, unit, quantity, quantity_in_stock, diseases, updated_at)
     SELECT $1, $2, product_name, category, unit, $3, $3, diseases, NOW()
     FROM warehouse_inventory WHERE product_name = $4
     ON CONFLICT (vet_django_id, product_name) DO UPDATE SET
       quantity_in_stock = vet_inventory.quantity_in_stock + EXCLUDED.quantity_in_stock,
       quantity = vet_inventory.quantity + EXCLUDED.quantity,
       updated_at = NOW()
     RETURNING *`,
    [vet_django_id, vet_name, quantity_allocated, product_name]
  );

  await query(
    `INSERT INTO stock_allocations
       (warehouse_item_id, vet_inventory_id, vet_django_id, vet_name, product_name, quantity_allocated, notes, allocated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      warehouseRes.rows[0].id, vetRes.rows[0].id,
      vet_django_id, vet_name, product_name,
      quantity_allocated, notes || null,
      req.agent?.name || 'admin',
    ]
  );

  res.json({ warehouse: warehouseRes.rows[0], vet_inventory: vetRes.rows[0] });
}

export async function getAllocationHistory(req, res) {
  const { vet_id, product } = req.query;
  const conditions = [];
  const params = [];
  if (vet_id)  { params.push(vet_id);  conditions.push(`vet_django_id = $${params.length}`); }
  if (product) { params.push(`%${product}%`); conditions.push(`product_name ILIKE $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM stock_allocations ${where} ORDER BY allocated_at DESC LIMIT 100`,
    params
  );
  res.json(rows);
}
