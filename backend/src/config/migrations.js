/** SQL migration files — applied in order by src/migrations/run.js */
export const MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_farmers_vets.sql',
  '003_batches_tasks.sql',
  '004_enrich_schema.sql',
  '005_escalation_inventory.sql',
  '006_warehouse_inventory.sql',
  '007_auth_security.sql',
  '008_vet_inventory_unique.sql',
];
