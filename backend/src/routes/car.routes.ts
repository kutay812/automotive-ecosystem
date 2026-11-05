import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middlewares/auth';
import { genDocId, now, formatCar, getEnrichedCars, buildUpdateQuery } from '../utils/helpers';
import { getCache, setCache, invalidateCache } from '../config/redis';

export const carRouter = Router();

carRouter.get('/cars', async (req, res) => {
  try {
    const pickupOffice = req.query.pickupOffice as string | undefined;
    const cacheKey = pickupOffice ? `cars:office:${pickupOffice}` : 'cars:all';

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let cars;
    if (pickupOffice) {
      cars = await getEnrichedCars(
        'WHERE c.published_at IS NOT NULL AND c.current_office_id = $1 ORDER BY c.id DESC',
        [pickupOffice]
      );
    } else {
      cars = await getEnrichedCars('WHERE c.published_at IS NOT NULL ORDER BY c.id DESC');
    }
    const responsePayload = { data: cars };

    // 5 dakika önbellekle
    await setCache(cacheKey, responsePayload, 300);

    res.json(responsePayload);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

carRouter.post('/cars', requireRole('superadmin', 'admin', 'editor'), async (req, res) => {
  try {
    const d = req.body.data;
    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO cars (document_id, brand, model, year, price_per_day, description, is_available, transmission, fuel_type, passenger_count, luggage_count, image_url, current_office_id, created_at, updated_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$14) RETURNING *`,
      [docId, d.brand, d.model, d.year, d.pricePerDay, d.description || null, d.isAvailable !== false, d.transmission || 'Otomatik', d.fuelType || 'Benzin', d.passengerCount || 5, d.luggageCount || 2, d.imageUrl || null, d.currentOfficeId || null, now()]
    );
    const car = await formatCar(result.rows[0]);

    await invalidateCache('cars:*');

    res.json({ data: car });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

carRouter.put('/cars/:id', requireRole('superadmin', 'admin', 'editor'), async (req, res) => {
  try {
    const d = req.body.data;
    const fieldsToUpdate: Record<string, any> = {
      brand: d.brand,
      model: d.model,
      year: d.year,
      price_per_day: d.pricePerDay,
      description: d.description,
      is_available: d.isAvailable,
      transmission: d.transmission,
      fuel_type: d.fuelType,
      passenger_count: d.passengerCount,
      luggage_count: d.luggageCount,
      image_url: d.imageUrl,
      current_office_id: d.currentOfficeId,
    };

    const query = buildUpdateQuery(
      'cars',
      fieldsToUpdate,
      'document_id =  OR id::text = ',
      [req.params.id]
    );

    await pool.query(query.text, query.values);

    await invalidateCache('cars:*');

    res.json({ data: { ok: true } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

carRouter.delete('/cars/:id', requireRole('superadmin', 'admin', 'editor'), async (req, res) => {
  try {
    await pool.query('DELETE FROM cars WHERE document_id = $1 OR id::text = $1', [req.params.id]);

    await invalidateCache('cars:*');

    res.json({ data: { ok: true } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});
