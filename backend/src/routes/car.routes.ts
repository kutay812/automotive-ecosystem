import { Router } from 'express';
import { pool } from '../database/db';
import { genDocId, now, formatCar, getEnrichedCars } from '../utils/helpers';
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

carRouter.post('/cars', async (req, res) => {
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

carRouter.put('/cars/:id', async (req, res) => {
  try {
    const d = req.body.data;
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    const fields: any = {
      brand: 'brand', model: 'model', year: 'year', pricePerDay: 'price_per_day',
      description: 'description', isAvailable: 'is_available', transmission: 'transmission',
      fuelType: 'fuel_type', passengerCount: 'passenger_count', luggageCount: 'luggage_count',
      imageUrl: 'image_url', currentOfficeId: 'current_office_id',
    };

    for (const [key, col] of Object.entries(fields)) {
      if (d[key] !== undefined) { sets.push(`${col} = $${idx}`); vals.push(d[key]); idx++; }
    }
    sets.push(`updated_at = $${idx}`); vals.push(now()); idx++;
    vals.push(req.params.id);

    await pool.query(`UPDATE cars SET ${sets.join(', ')} WHERE document_id = $${idx} OR id::text = $${idx}`, vals);

    await invalidateCache('cars:*');

    res.json({ data: { ok: true } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

carRouter.delete('/cars/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cars WHERE document_id = $1 OR id::text = $1', [req.params.id]);

    await invalidateCache('cars:*');

    res.json({ data: { ok: true } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});
