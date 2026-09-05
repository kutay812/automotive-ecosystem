import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pool } from '../database/db';
import { requireRole } from '../middlewares/auth';
import { genDocId, now } from '../utils/helpers';

export const mediaRouter = Router();

// Medya dosyalarını listele
mediaRouter.get('/admin/media', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const files = await pool.query(`
      SELECT f.*, frm.related_type, frm.field, frm.related_id
      FROM files f
      LEFT JOIN files_related_mph frm ON frm.file_id = f.id
      ORDER BY f.created_at DESC
    `);

    const groupedFiles = new Map<number, any>();

    for (const f of files.rows) {
      if (!groupedFiles.has(f.id)) {
        groupedFiles.set(f.id, {
          id: f.id,
          documentId: f.document_id,
          name: f.name,
          alternativeText: f.alternative_text,
          caption: f.caption,
          width: f.width,
          height: f.height,
          ext: f.ext,
          mime: f.mime,
          size: f.size,
          url: f.url,
          relatedType: f.related_type || null,
          relatedField: f.field || null,
          relatedId: f.related_id || null,
          createdAt: f.created_at,
          relations: [],
        });
      }

      const file = groupedFiles.get(f.id);
      if (f.related_type || f.field || f.related_id) {
        file.relations.push({
          type: f.related_type || null,
          field: f.field || null,
          id: f.related_id || null,
        });
      }
    }

    const data = Array.from(groupedFiles.values()).map((file) => ({
      ...file,
      relatedCount: file.relations.length,
      relatedTypes: Array.from(new Set(file.relations.map((relation: any) => relation.type).filter(Boolean))),
    }));

    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Medya dosyası sil
mediaRouter.delete('/admin/media/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.id]);
    if (fileResult.rows.length === 0) return res.status(404).json({ error: { message: 'Dosya bulunamadı.' } });

    const file = fileResult.rows[0];

    await pool.query('DELETE FROM files_related_mph WHERE file_id = $1', [file.id]);
    await pool.query('DELETE FROM files WHERE id = $1', [file.id]);

    try {
      const filePath = path.join(__dirname, '../../public', file.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Medya dosyası yükle (multipart/form-data)
mediaRouter.post('/admin/media/upload', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
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
        let fileMime = 'application/octet-stream';
        let relatedType = '';
        let relatedId = '';
        let field = '';

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const nameMatch = part.match(/name="([^"]+)"/);
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const contentTypeMatch = part.match(/Content-Type: (.+)\r\n/);

            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            const partBody = part.slice(headerEnd + 4).replace(/\r\n$/, '');

            if (filenameMatch) {
              fileName = filenameMatch[1];
              if (contentTypeMatch) fileMime = contentTypeMatch[1].trim();
              fileBuffer = Buffer.from(partBody, 'binary');
            } else if (nameMatch) {
              const val = partBody.trim();
              if (nameMatch[1] === 'relatedType') relatedType = val;
              else if (nameMatch[1] === 'relatedId') relatedId = val;
              else if (nameMatch[1] === 'field') field = val;
            }
          }
        }

        if (!fileBuffer) return res.status(400).json({ error: { message: 'Dosya bulunamadı.' } });

        const ext = path.extname(fileName);
        const hash = crypto.randomBytes(8).toString('hex');
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedName = `${path.basename(safeName, ext)}_${hash}${ext}`;

        const uploadDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, storedName), fileBuffer);

        const docId = genDocId();
        const fileSize = (fileBuffer.length / 1024).toFixed(2);
        const fileResult = await pool.query(
          `INSERT INTO files (document_id, name, hash, ext, mime, size, url, provider, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'local', $8, $8) RETURNING *`,
          [docId, safeName, hash, ext, fileMime, fileSize, `/uploads/${storedName}`, now()]
        );

        if (relatedType && relatedId && field) {
          await pool.query(
            `INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order")
             VALUES ($1, $2, $3, $4, 1)`,
            [fileResult.rows[0].id, parseInt(relatedId), relatedType, field]
          );
        }

        res.json({
          id: fileResult.rows[0].id,
          url: `/uploads/${storedName}`,
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

// Anasayfa medyalarını listele (public)
mediaRouter.get('/homepage-media', async (req, res) => {
  try {
    const onlyActive = req.query.active === 'true';
    let query = 'SELECT * FROM homepage_media';
    if (onlyActive) query += ' WHERE is_active = true';
    query += ' ORDER BY sort_order ASC, created_at DESC';
    const result = await pool.query(query);
    const data = result.rows.map(r => ({
      id: r.id,
      documentId: r.document_id,
      title: r.title,
      description: r.description,
      mediaType: r.media_type,
      mediaUrl: r.media_url,
      thumbnailUrl: r.thumbnail_url,
      sortOrder: r.sort_order,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: anasayfa medya ekle
mediaRouter.post('/admin/homepage-media', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const { title, description, mediaType, mediaUrl, thumbnailUrl, sortOrder } = req.body;
    if (!mediaUrl || !mediaType) return res.status(400).json({ error: { message: 'mediaUrl ve mediaType gerekli.' } });

    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO homepage_media (document_id, title, description, media_type, media_url, thumbnail_url, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $8) RETURNING *`,
      [docId, title || '', description || '', mediaType, mediaUrl, thumbnailUrl || '', sortOrder || 0, now()]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: anasayfa medya güncelle
mediaRouter.put('/admin/homepage-media/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const { title, description, mediaType, mediaUrl, thumbnailUrl, sortOrder, isActive } = req.body;

    const sets: string[] = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (title !== undefined) { sets.push(`title = $${idx}`); vals.push(title); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); vals.push(description); idx++; }
    if (mediaType !== undefined) { sets.push(`media_type = $${idx}`); vals.push(mediaType); idx++; }
    if (mediaUrl !== undefined) { sets.push(`media_url = $${idx}`); vals.push(mediaUrl); idx++; }
    if (thumbnailUrl !== undefined) { sets.push(`thumbnail_url = $${idx}`); vals.push(thumbnailUrl); idx++; }
    if (sortOrder !== undefined) { sets.push(`sort_order = $${idx}`); vals.push(sortOrder); idx++; }
    if (isActive !== undefined) { sets.push(`is_active = $${idx}`); vals.push(isActive); idx++; }

    vals.push(req.params.id);
    await pool.query(`UPDATE homepage_media SET ${sets.join(', ')} WHERE id = $${idx} OR document_id = $${idx}::text`, vals);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: anasayfa medya sil
mediaRouter.delete('/admin/homepage-media/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    await pool.query('DELETE FROM homepage_media WHERE id = $1 OR document_id = $1::text', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});
