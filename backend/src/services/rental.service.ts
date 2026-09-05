import { pool } from '../database/db';
import { now, getEnrichedRentals } from '../utils/helpers';
import { invalidateCache } from '../config/redis';

/**
 * Tarih çakışma kontrolü: Belirtilen aracın belirtilen tarih aralığında aktif kiralaması var mı?
 */
export async function checkDateConflict(
  carDocId: string,
  startDate: string,
  endDate: string,
  excludeDocId?: string
): Promise<boolean> {
  const carResult = await pool.query('SELECT id FROM cars WHERE document_id = $1', [carDocId]);
  if (carResult.rows.length === 0) return false;
  const carId = carResult.rows[0].id;

  const rentals = await pool.query(
    `SELECT r.* FROM rentals r 
     JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
     WHERE rcl.car_id = $1 AND r.rental_status NOT IN ('bitti', 'iptal')`,
    [carId]
  );

  for (const r of rentals.rows) {
    if (excludeDocId && r.document_id === excludeDocId) continue;
    const rEnd = r.requested_end_date || r.end_date;
    if (new Date(startDate) <= new Date(rEnd) && new Date(r.start_date) <= new Date(endDate)) {
      return true;
    }
  }
  return false;
}

/**
 * Admin istatistiklerini hesaplar
 */
export async function getRentalStats() {
  const rentals = await pool.query('SELECT rental_status FROM rentals');
  const cars = await pool.query('SELECT is_available FROM cars WHERE published_at IS NOT NULL');

  return {
    totalCars: cars.rows.length,
    availableCars: cars.rows.filter((c) => c.is_available !== false).length,
    totalRentals: rentals.rows.length,
    pending: rentals.rows.filter((r) => r.rental_status === 'bekliyor').length,
    active: rentals.rows.filter((r) => r.rental_status === 'aktif').length,
    extensionRequests: rentals.rows.filter((r) => r.rental_status === 'uzatma_talep').length,
    returnNotices: rentals.rows.filter((r) => r.rental_status === 'iade_bildirildi').length,
    completed: rentals.rows.filter((r) => r.rental_status === 'bitti').length,
    cancelled: rentals.rows.filter((r) => r.rental_status === 'iptal').length,
  };
}

/**
 * Kiralama onaylama
 */
export async function approveRentalService(rentalId: string) {
  await pool.query(
    "UPDATE rentals SET rental_status = 'aktif', approval_status = 'approved', updated_at = $1 WHERE document_id = $2",
    [now(), rentalId]
  );
  await invalidateCache('cars:*');
}

/**
 * Kiralama iptal/reddetme
 */
export async function rejectRentalService(rentalId: string) {
  await pool.query(
    "UPDATE rentals SET rental_status = 'iptal', approval_status = 'rejected', updated_at = $1 WHERE document_id = $2",
    [now(), rentalId]
  );
  await invalidateCache('cars:*');
}

/**
 * Erken teslim talebini reddetme
 */
export async function rejectEarlyReturnService(rentalId: string) {
  await pool.query(
    "UPDATE rentals SET rental_status = 'aktif', approval_status = 'approved', requested_end_date = NULL, updated_at = $1 WHERE document_id = $2",
    [now(), rentalId]
  );
  await invalidateCache('cars:*');
}

/**
 * Kiralama süresi uzatma talebini onaylama (çakışma kontrolüyle)
 */
export async function approveExtensionService(rentalId: string) {
  const rental = await pool.query('SELECT * FROM rentals WHERE document_id = $1', [rentalId]);
  if (rental.rows.length === 0 || !rental.rows[0].requested_end_date) {
    throw new Error('Uzatma talebi bulunamadı.');
  }
  const r = rental.rows[0];

  const carLnk = await pool.query('SELECT car_id FROM rentals_car_lnk WHERE rental_id = $1', [r.id]);
  if (carLnk.rows.length > 0) {
    const car = await pool.query('SELECT document_id FROM cars WHERE id = $1', [carLnk.rows[0].car_id]);
    if (car.rows.length > 0) {
      const conflict = await checkDateConflict(
        car.rows[0].document_id,
        String(r.end_date),
        String(r.requested_end_date),
        r.document_id
      );
      if (conflict) throw new Error('Uzatma tarihleri başka bir kiralama ile çakışıyor.');
    }
  }

  await pool.query(
    "UPDATE rentals SET end_date = requested_end_date, requested_end_date = NULL, rental_status = 'aktif', approval_status = 'approved', updated_at = $1 WHERE document_id = $2",
    [now(), rentalId]
  );
  await invalidateCache('cars:*');
}

/**
 * Kiralama süresi uzatma talebini reddetme
 */
export async function rejectExtensionService(rentalId: string) {
  await pool.query(
    "UPDATE rentals SET requested_end_date = NULL, rental_status = 'aktif', approval_status = 'approved', updated_at = $1 WHERE document_id = $2",
    [now(), rentalId]
  );
  await invalidateCache('cars:*');
}

/**
 * Kiralama tamamlama ve aracı bırakılan ofise taşıma
 */
export async function completeRentalService(rentalId: string) {
  await pool.query("UPDATE rentals SET rental_status = 'bitti', updated_at = $1 WHERE document_id = $2", [
    now(),
    rentalId,
  ]);

  try {
    const rentalResult = await pool.query(
      'SELECT r.dropoff_office, rcl.car_id FROM rentals r JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id WHERE r.document_id = $1',
      [rentalId]
    );
    if (rentalResult.rows.length > 0) {
      const { dropoff_office, car_id } = rentalResult.rows[0];
      await pool.query('UPDATE cars SET current_office_id = $1, updated_at = $2 WHERE id = $3', [
        dropoff_office,
        now(),
        car_id,
      ]);
    }
  } catch (relocErr) {
    console.error('Araç konum güncellemesi başarısız:', relocErr);
  }

  await invalidateCache('cars:*');
}

/**
 * Erken iade talebini onaylama
 */
export async function approveEarlyReturnService(rentalId: string) {
  const rentalResult = await pool.query(
    'SELECT r.*, rcl.car_id FROM rentals r LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id WHERE r.document_id = $1',
    [rentalId]
  );
  if (rentalResult.rows.length === 0) throw new Error('Kiralama bulunamadı.');
  const rental = rentalResult.rows[0];

  const earlyDate = rental.requested_end_date || rental.end_date;
  await pool.query(
    "UPDATE rentals SET rental_status = 'iade_bildirildi', approval_status = 'approved', end_date = $1, requested_end_date = NULL, updated_at = $2 WHERE document_id = $3",
    [earlyDate, now(), rentalId]
  );
  await invalidateCache('cars:*');
}

/**
 * Ödemeyi ödendi olarak işaretle
 */
export async function markRentalPaidService(rentalId: string) {
  await pool.query(
    "UPDATE rentals SET payment_status = 'paid', paid_at = $1, updated_at = $1 WHERE document_id = $2",
    [now(), rentalId]
  );
}

/**
 * Ödemeyi bekliyor olarak işaretle
 */
export async function unmarkRentalPaidService(rentalId: string) {
  await pool.query(
    "UPDATE rentals SET payment_status = 'pending', paid_at = NULL, updated_at = $1 WHERE document_id = $2",
    [now(), rentalId]
  );
}
