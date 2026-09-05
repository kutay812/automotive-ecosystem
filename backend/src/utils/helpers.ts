import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, ADMIN_JWT_SECRET } from '../config/env';
import { pool } from '../database/db';

export function genDocId(): string {
  return crypto.randomBytes(12).toString('hex').slice(0, 24);
}

export function signToken(userId: number, docId: string): string {
  return jwt.sign({ id: userId, documentId: docId }, JWT_SECRET, { expiresIn: '7d' });
}

export function signAdminToken(adminUser: { id: number; document_id: string; email: string; role: string; first_name: string; last_name: string }): string {
  return jwt.sign(
    { adminId: adminUser.id, documentId: adminUser.document_id, email: adminUser.email, role: adminUser.role, firstName: adminUser.first_name, lastName: adminUser.last_name },
    ADMIN_JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function now(): string {
  return new Date().toISOString();
}

// Helper: Yeni kullanıcıya varsayılan 'authenticated' rolünü ata
export async function assignDefaultRole(userId: number): Promise<void> {
  try {
    const roleResult = await pool.query("SELECT id FROM up_roles WHERE type = 'authenticated'");
    if (roleResult.rows.length > 0) {
      await pool.query(
        "INSERT INTO up_users_role_lnk (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
        [userId, roleResult.rows[0].id]
      );
    }
  } catch (e) {
    console.error('Rol atama hatası:', e);
  }
}

// Araç resmini çek
export async function getCarImage(carId: number): Promise<any> {
  const result = await pool.query(
    `SELECT f.url, f.name, f.formats FROM files f
     JOIN files_related_mph frm ON frm.file_id = f.id
     WHERE frm.related_id = $1 AND frm.related_type = 'api::car.car' AND frm.field = 'image'
     LIMIT 1`, [carId]
  );
  if (result.rows.length === 0) return null;
  return { url: result.rows[0].url, name: result.rows[0].name };
}

// Strapi formatında araç objesi
export async function formatCar(row: any): Promise<any> {
  let image = null;
  if (row.image_url) {
    image = { url: row.image_url, name: 'car-image' };
  } else if (row.car_file_url) {
    image = { url: row.car_file_url, name: row.car_file_name || 'car-image' };
  } else {
    image = await getCarImage(row.id);
  }

  return {
    id: row.id,
    documentId: row.document_id,
    brand: row.brand,
    model: row.model,
    year: row.year ? Number(row.year) : null,
    pricePerDay: row.price_per_day,
    description: row.description,
    isAvailable: row.is_available,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    passengerCount: row.passenger_count,
    luggageCount: row.luggage_count,
    availableUntil: row.available_until,
    image: image,
    imageUrl: row.image_url,
    currentOfficeId: row.current_office_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatUser(row: any) {
  return {
    id: row.id,
    documentId: row.document_id,
    username: row.username,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    provider: row.provider,
    googleId: row.google_id || null,
    confirmed: row.confirmed,
    blocked: row.blocked,
    phoneNumber: row.phone_number || null,
    phoneVerifiedAt: row.phone_verified_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Single-query JOIN for enriched cars (elimination of N+1)
export const ENRICHED_CARS_SELECT = `
  SELECT c.*, f.url AS car_file_url, f.name AS car_file_name
  FROM cars c
  LEFT JOIN files_related_mph frm ON (frm.related_id = c.id AND frm.related_type = 'api::car.car' AND frm.field = 'image')
  LEFT JOIN files f ON f.id = frm.file_id
`;

export async function getEnrichedCars(whereClause: string = '', params: any[] = []): Promise<any[]> {
  const query = `${ENRICHED_CARS_SELECT} ${whereClause}`;
  const result = await pool.query(query, params);
  return Promise.all(result.rows.map(formatCar));
}

// Single-query JOIN for enriched rentals (elimination of N+1)
export const ENRICHED_RENTALS_SELECT = `
  SELECT
    r.id,
    r.document_id,
    r.rental_status,
    r.pickup_office,
    r.dropoff_office,
    r.start_date,
    r.end_date,
    r.requested_end_date,
    r.payment_method,
    r.payment_status,
    r.approval_status,
    r.created_at,
    r.updated_at,
    c.id AS car_id,
    c.document_id AS car_document_id,
    c.brand AS car_brand,
    c.model AS car_model,
    c.year AS car_year,
    c.price_per_day AS car_price_per_day,
    c.description AS car_description,
    c.is_available AS car_is_available,
    c.transmission AS car_transmission,
    c.fuel_type AS car_fuel_type,
    c.passenger_count AS car_passenger_count,
    c.luggage_count AS car_luggage_count,
    c.available_until AS car_available_until,
    c.image_url AS car_image_url,
    c.current_office_id AS car_current_office_id,
    c.created_at AS car_created_at,
    c.updated_at AS car_updated_at,
    f.url AS car_file_url,
    f.name AS car_file_name,
    u.id AS user_id,
    u.document_id AS user_document_id,
    u.username AS user_username,
    u.email AS user_email,
    u.first_name AS user_first_name,
    u.last_name AS user_last_name,
    u.provider AS user_provider,
    u.google_id AS user_google_id,
    u.confirmed AS user_confirmed,
    u.blocked AS user_blocked,
    u.phone_number AS user_phone_number,
    u.phone_verified_at AS user_phone_verified_at,
    u.created_at AS user_created_at,
    u.updated_at AS user_updated_at,
    po.city AS pickup_office_city,
    do.city AS dropoff_office_city
  FROM rentals r
  LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
  LEFT JOIN cars c ON c.id = rcl.car_id
  LEFT JOIN files_related_mph frm ON (frm.related_id = c.id AND frm.related_type = 'api::car.car' AND frm.field = 'image')
  LEFT JOIN files f ON f.id = frm.file_id
  LEFT JOIN rentals_user_lnk rul ON rul.rental_id = r.id
  LEFT JOIN up_users u ON u.id = rul.user_id
  LEFT JOIN offices po ON po.name = r.pickup_office
  LEFT JOIN offices do ON do.name = r.dropoff_office
`;

export function mapEnrichedRentalRow(row: any): any {
  let car = null;
  if (row.car_id) {
    let image = null;
    if (row.car_image_url) {
      image = { url: row.car_image_url, name: 'car-image' };
    } else if (row.car_file_url) {
      image = { url: row.car_file_url, name: row.car_file_name || 'car-image' };
    }
    car = {
      id: row.car_id,
      documentId: row.car_document_id,
      brand: row.car_brand,
      model: row.car_model,
      year: row.car_year ? Number(row.car_year) : null,
      pricePerDay: row.car_price_per_day,
      description: row.car_description,
      isAvailable: row.car_is_available,
      transmission: row.car_transmission,
      fuelType: row.car_fuel_type,
      passengerCount: row.car_passenger_count,
      luggageCount: row.car_luggage_count,
      availableUntil: row.car_available_until,
      image,
      imageUrl: row.car_image_url,
      currentOfficeId: row.car_current_office_id || null,
      createdAt: row.car_created_at,
      updatedAt: row.car_updated_at,
    };
  } else if (row.car) {
    car = row.car;
  }

  let user = null;
  if (row.user_id) {
    user = {
      id: row.user_id,
      documentId: row.user_document_id,
      username: row.user_username,
      email: row.user_email,
      firstName: row.user_first_name,
      lastName: row.user_last_name,
      provider: row.user_provider,
      googleId: row.user_google_id || null,
      confirmed: row.user_confirmed,
      blocked: row.user_blocked,
      phoneNumber: row.user_phone_number || null,
      phoneVerifiedAt: row.user_phone_verified_at || null,
      createdAt: row.user_created_at,
      updatedAt: row.user_updated_at,
    };
  } else if (row.user) {
    user = row.user;
  }

  let pickupOffice = row.pickup_office;
  if (row.pickup_office && row.pickup_office_city) {
    pickupOffice = `${row.pickup_office} (${row.pickup_office_city})`;
  }

  let dropoffOffice = row.dropoff_office;
  if (row.dropoff_office && row.dropoff_office_city) {
    dropoffOffice = `${row.dropoff_office} (${row.dropoff_office_city})`;
  }

  return {
    id: row.id,
    documentId: row.document_id,
    rentalStatus: row.rental_status,
    pickupOffice,
    dropoffOffice,
    startDate: row.start_date,
    endDate: row.end_date,
    requestedEndDate: row.requested_end_date || null,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    car,
    user,
  };
}

export async function getEnrichedRentals(whereClause: string = '', params: any[] = []): Promise<any[]> {
  const query = `${ENRICHED_RENTALS_SELECT} ${whereClause}`;
  const result = await pool.query(query, params);
  return result.rows.map(mapEnrichedRentalRow);
}

export async function formatRental(row: any): Promise<any> {
  // Eğer zaten JOIN edilmiş satır ise doğrudan bellek içi eşleme yap (0 SQL)
  if (row.car_id !== undefined || row.user_id !== undefined) {
    return mapEnrichedRentalRow(row);
  }

  // Tekil satır geldiyse tek sorguda enriched çek (7 SQL yerine 1 SQL)
  if (row.id) {
    const result = await pool.query(`${ENRICHED_RENTALS_SELECT} WHERE r.id = $1`, [row.id]);
    if (result.rows.length > 0) {
      return mapEnrichedRentalRow(result.rows[0]);
    }
  }

  return mapEnrichedRentalRow(row);
}
