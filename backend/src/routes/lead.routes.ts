import { Router } from 'express';
import { pool } from '../database/db';
import { genDocId, now } from '../utils/helpers';

export const leadRouter = Router();

leadRouter.post('/leads', async (req, res) => {
  try {
    const d = req.body.data;
    const docId = genDocId();
    await pool.query(
      `INSERT INTO leads (document_id, name, email, phone, message, source, created_at, updated_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$7)`,
      [docId, d.name, d.email, d.phone || null, d.message || null, d.source || null, now()]
    );
    res.json({ data: { id: docId } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});
