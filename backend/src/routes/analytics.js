import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { query } from '../db/index.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const [
      callsTotal, callsByStatus, callsLast7,
      dispatchTotal, dispatchByStatus,
      farmerTotal,
      vetBoardTotal, vetBoardByStatus,
      agentPerf,
    ] = await Promise.all([
      query(`SELECT COUNT(*) AS n FROM calls`),
      query(`SELECT status, COUNT(*) AS n FROM calls GROUP BY status`),
      query(`SELECT DATE(created_at) AS day, COUNT(*) AS n FROM calls WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY day ORDER BY day ASC`),
      query(`SELECT COUNT(*) AS n FROM dispatches`),
      query(`SELECT status, COUNT(*) AS n FROM dispatches GROUP BY status`),
      query(`SELECT COUNT(*) AS n FROM farmers`),
      query(`SELECT COUNT(*) AS n FROM vet_reviews`),
      query(`SELECT verdict AS status, COUNT(*) AS n FROM vet_reviews GROUP BY verdict`),
      query(`SELECT a.name, a.role, COUNT(DISTINCT c.id) AS calls_handled
              FROM agents a
              LEFT JOIN calls c ON c.agent_id = a.id
              GROUP BY a.id, a.name, a.role
              ORDER BY calls_handled DESC LIMIT 10`),
    ]);

    res.json({
      calls: {
        total: Number(callsTotal.rows[0].n),
        by_status: callsByStatus.rows,
        last_7_days: callsLast7.rows,
      },
      dispatch: {
        total: Number(dispatchTotal.rows[0].n),
        by_status: dispatchByStatus.rows,
      },
      farmers: { total: Number(farmerTotal.rows[0].n) },
      vetboard: {
        total: Number(vetBoardTotal.rows[0].n),
        by_status: vetBoardByStatus.rows,
      },
      agents: agentPerf.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
