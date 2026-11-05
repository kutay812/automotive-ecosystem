import path from 'path';
import crypto from 'crypto';

// İzin verilen medya uzantıları (HTML/SVG/JS gibi aynı origin'de çalışabilecek türler hariç)
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.jfif', '.png', '.webp', '.gif', '.avif',
  '.mp4', '.webm', '.mov',
  '.pdf',
]);

export const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_MB || '200') * 1024 * 1024;

export function isAllowedUpload(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

/**
 * Multipart gövde boyutunu sınırlar. Content-Length sınırı aşıyorsa hemen 413 döner;
 * header yoksa/yanlışsa akış sırasında sayılır ve bağlantı kesilir.
 */
export function uploadSizeGuard(req: any, res: any, next: any) {
  const declared = parseInt(req.headers['content-length'] || '0');
  if (declared > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ error: { message: 'Dosya boyutu sınırı aşıldı.' } });
  }
  let received = 0;
  req.on('data', (chunk: Buffer) => {
    received += chunk.length;
    if (received > MAX_UPLOAD_BYTES && !res.headersSent) {
      res.status(413).json({ error: { message: 'Dosya boyutu sınırı aşıldı.' } });
      req.destroy(new Error('Dosya boyutu sınırı aşıldı.'));
    }
  });
  next();
}

export interface ParsedUploadResult {
  fileName: string;
  safeName: string;
  storedName: string;
  fileBuffer: Buffer;
  fileMime: string;
  ext: string;
  hash: string;
  fields: Record<string, string>;
}

/**
 * Tekrarlanan multipart ayrıştırma mantığını merkezi olarak yönetir.
 */
export function parseMultipartUpload(req: any): Promise<ParsedUploadResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) {
          return reject(new Error('Geçersiz form verisi: boundary eksik.'));
        }

        const boundary = boundaryMatch[1];
        const parts = body.toString('binary').split(`--${boundary}`);

        let fileName = 'upload';
        let fileBuffer: Buffer | null = null;
        let fileMime = 'application/octet-stream';
        const fields: Record<string, string> = {};

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
              fields[nameMatch[1]] = partBody.trim();
            }
          }
        }

        if (!fileBuffer) {
          return reject(new Error('Dosya bulunamadı.'));
        }

        const ext = path.extname(fileName);
        const hash = crypto.randomBytes(8).toString('hex');
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedName = `${path.basename(safeName, ext)}_${hash}${ext}`;

        resolve({
          fileName,
          safeName,
          storedName,
          fileBuffer,
          fileMime,
          ext,
          hash,
          fields,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}
