import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pool } from '../database/db';
import { requireRole } from '../middlewares/auth';
import { genDocId, now } from '../utils/helpers';
import { getCache, setCache, invalidateCache } from '../config/redis';

export const projectRouter = Router();

// Public: Aktif projeleri listele
projectRouter.get('/projects', async (req, res) => {
  try {
    const onlyActive = req.query.active === 'true';
    const cacheKey = onlyActive ? 'projects:active' : 'projects:all';

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let query = 'SELECT * FROM projects';
    if (onlyActive) query += ' WHERE is_active = true';
    query += ' ORDER BY sort_order ASC, created_at DESC';
    const result = await pool.query(query);
    const data = result.rows.map(r => ({
      id: r.id,
      documentId: r.document_id,
      title: r.title,
      description: r.description,
      category: r.category,
      mediaType: r.media_type,
      mediaUrl: r.media_url,
      thumbnailUrl: r.thumbnail_url,
      sortOrder: r.sort_order,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
    const responsePayload = { data };

    // 15 dakika önbellekle
    await setCache(cacheKey, responsePayload, 900);

    res.json(responsePayload);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Proje ekle
projectRouter.post('/admin/projects', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const { title, description, category, mediaType, mediaUrl, thumbnailUrl, sortOrder } = req.body;
    if (!title) return res.status(400).json({ error: { message: 'Proje başlığı gerekli.' } });

    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO projects (document_id, title, description, category, media_type, media_url, thumbnail_url, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9) RETURNING *`,
      [docId, title, description || '', category || 'Genel', mediaType || 'image', mediaUrl || '', thumbnailUrl || '', sortOrder || 0, now()]
    );

    await invalidateCache('projects:*');

    res.json({ ok: true, data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Proje güncelle
projectRouter.put('/admin/projects/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const { title, description, category, mediaType, mediaUrl, thumbnailUrl, sortOrder, isActive } = req.body;

    const sets: string[] = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (title !== undefined) { sets.push(`title = $${idx}`); vals.push(title); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); vals.push(description); idx++; }
    if (category !== undefined) { sets.push(`category = $${idx}`); vals.push(category); idx++; }
    if (mediaType !== undefined) { sets.push(`media_type = $${idx}`); vals.push(mediaType); idx++; }
    if (mediaUrl !== undefined) { sets.push(`media_url = $${idx}`); vals.push(mediaUrl); idx++; }
    if (thumbnailUrl !== undefined) { sets.push(`thumbnail_url = $${idx}`); vals.push(thumbnailUrl); idx++; }
    if (sortOrder !== undefined) { sets.push(`sort_order = $${idx}`); vals.push(sortOrder); idx++; }
    if (isActive !== undefined) { sets.push(`is_active = $${idx}`); vals.push(isActive); idx++; }

    vals.push(req.params.id);
    await pool.query(`UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx} OR document_id = $${idx}::text`, vals);

    await invalidateCache('projects:*');

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Proje dosyası yükle
projectRouter.post('/admin/projects/upload', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';

        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) return res.status(400).json({ error: { message: 'Geçersiz form verisi.' } });

        const boundary = boundaryMatch[1];
        const parts = body.toString('binary').split(`--${boundary}`);

        let fileName = 'upload';
        let fileBuffer: Buffer | null = null;

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            const partBody = part.slice(headerEnd + 4).replace(/\r\n$/, '');

            if (filenameMatch) {
              fileName = filenameMatch[1];
              fileBuffer = Buffer.from(partBody, 'binary');
            }
          }
        }

        if (!fileBuffer) return res.status(400).json({ error: { message: 'Dosya bulunamadı.' } });

        const ext = path.extname(fileName);
        const hash = crypto.randomBytes(8).toString('hex');
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedName = `${path.basename(safeName, ext)}_${hash}${ext}`;

        const uploadDir = path.join(__dirname, '../../public/uploads/projects');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, storedName), fileBuffer);

        res.json({
          url: `/uploads/projects/${storedName}`,
          name: safeName,
        });
      } catch (e: any) {
        res.status(500).json({ error: { message: e.message } });
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Proje sil
projectRouter.delete('/admin/projects/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1 OR document_id = $1::text', [req.params.id]);

    await invalidateCache('projects:*');

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});
