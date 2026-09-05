import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middlewares/auth';

export const financeRouter = Router();

financeRouter.get('/admin/finance/report', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const period = (req.query.period as string) || 'monthly';
    const reqStart = req.query.startDate as string;
    const reqEnd = req.query.endDate as string;

    const nowDate = new Date();
    let startDate: Date;
    let endDate: Date = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 23, 59, 59, 999));

    if (period === 'custom' && reqStart) {
      const parseStart = new Date(reqStart);
      startDate = new Date(Date.UTC(parseStart.getFullYear(), parseStart.getMonth(), parseStart.getDate(), 0, 0, 0));
      if (reqEnd) {
        const parseEnd = new Date(reqEnd);
        endDate = new Date(Date.UTC(parseEnd.getFullYear(), parseEnd.getMonth(), parseEnd.getDate(), 23, 59, 59, 999));
      }
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0));
          break;
        case 'weekly':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 7, 0, 0, 0));
          break;
        case 'monthly':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0));
          break;
        case 'semi-annual':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth() - 6, nowDate.getDate(), 0, 0, 0));
          break;
        case 'yearly':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), 0, 1, 0, 0, 0));
          break;
        default:
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0));
      }
    }

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    function calcDays(startStr: string, endStr: string): number {
      if (!startStr || !endStr) return 0;
      const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
      return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    function calcTotal(days: number, pricePerDay: string | number): number {
      const price = typeof pricePerDay === 'string' ? parseFloat(pricePerDay) : pricePerDay;
      if (!price || isNaN(price)) return 0;
      return Math.round(days * price * 100) / 100;
    }

    function calcRevenue(rows: any[]): number {
      let total = 0;
      for (const r of rows) {
        if (!r.price_per_day || !r.start_date || !r.end_date) continue;
        total += calcTotal(calcDays(r.start_date, r.end_date), r.price_per_day);
      }
      return Math.round(total * 100) / 100;
    }

    function detectEarlyReturn(r: any): { isEarlyReturn: boolean; savedDays: number; refundAmount: number } {
      if (!r.original_end_date || !r.end_date || !r.price_per_day) {
        return { isEarlyReturn: false, savedDays: 0, refundAmount: 0 };
      }
      const planned = new Date(r.original_end_date).getTime();
      const actual = new Date(r.end_date).getTime();
      if (actual < planned) {
        const savedDays = Math.max(0, Math.ceil((planned - actual) / (1000 * 60 * 60 * 24)));
        return {
          isEarlyReturn: true,
          savedDays,
          refundAmount: calcTotal(savedDays, r.price_per_day),
        };
      }
      return { isEarlyReturn: false, savedDays: 0, refundAmount: 0 };
    }

    const completedRentals = await pool.query(
      `SELECT DISTINCT ON (r.id)
              r.id, r.document_id, r.start_date, r.end_date, r.original_end_date, r.requested_end_date,
              r.updated_at, r.created_at, r.pickup_office, r.dropoff_office,
              r.rental_status, r.payment_type,
              c.price_per_day, c.brand, c.model, c.id as car_id,
              u.first_name as user_first_name, u.last_name as user_last_name,
              u.email as user_email, u.username as user_username
       FROM rentals r
       LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
       LEFT JOIN cars c ON c.id = rcl.car_id
       LEFT JOIN rentals_user_lnk rul ON rul.rental_id = r.id
       LEFT JOIN up_users u ON u.id = rul.user_id
       WHERE r.rental_status != 'iptal' 
         AND (r.payment_status = 'paid' OR (r.rental_status = 'bitti' AND (r.payment_method IS NULL OR (r.payment_method != 'ofis' AND r.payment_method != 'office'))))
         AND r.updated_at >= $1 AND r.updated_at <= $2
       ORDER BY r.id, r.updated_at DESC`,
      [startISO, endISO]
    );

    const cancelledRentals = await pool.query(
      `SELECT DISTINCT ON (r.id)
              r.id, r.document_id, r.start_date, r.end_date, r.original_end_date, r.requested_end_date,
              r.updated_at, r.created_at, r.pickup_office, r.dropoff_office,
              r.rental_status, r.payment_type,
              c.price_per_day, c.brand, c.model,
              u.first_name as user_first_name, u.last_name as user_last_name,
              u.email as user_email, u.username as user_username
       FROM rentals r
       LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
       LEFT JOIN cars c ON c.id = rcl.car_id
       LEFT JOIN rentals_user_lnk rul ON rul.rental_id = r.id
       LEFT JOIN up_users u ON u.id = rul.user_id
       WHERE r.rental_status = 'iptal' AND r.updated_at >= $1 AND r.updated_at <= $2
       ORDER BY r.id, r.updated_at DESC`,
      [startISO, endISO]
    );

    const rentalGross = calcRevenue(completedRentals.rows);
    const rentalCancelled = calcRevenue(cancelledRentals.rows);
    const rentalCount = completedRentals.rows.length;
    const cancelledCount = cancelledRentals.rows.length;

    let totalEarlyReturnRefund = 0;
    let earlyReturnCount = 0;
    for (const r of completedRentals.rows) {
      const earlyInfo = detectEarlyReturn(r);
      if (earlyInfo.isEarlyReturn) {
        totalEarlyReturnRefund += earlyInfo.refundAmount;
        earlyReturnCount++;
      }
    }
    totalEarlyReturnRefund = Math.round(totalEarlyReturnRefund * 100) / 100;

    const completedOrders = await pool.query(
      `SELECT o.*, si.title as item_title, si.platform as item_platform
       FROM shop_orders o
       LEFT JOIN shop_items si ON si.id = o.shop_item_id
       WHERE o.status = 'completed' AND o.created_at >= $1 AND o.created_at <= $2
       ORDER BY o.created_at DESC`,
      [startISO, endISO]
    );

    const cancelledOrders = await pool.query(
      `SELECT o.*, si.title as item_title, si.platform as item_platform
       FROM shop_orders o
       LEFT JOIN shop_items si ON si.id = o.shop_item_id
       WHERE o.status = 'cancelled' AND o.updated_at >= $1 AND o.updated_at <= $2
       ORDER BY o.created_at DESC`,
      [startISO, endISO]
    );

    let ecommerceGross = 0;
    for (const o of completedOrders.rows) {
      ecommerceGross += Math.round(parseFloat(o.total || 0) * 100) / 100;
    }
    ecommerceGross = Math.round(ecommerceGross * 100) / 100;

    let ecommerceCancelled = 0;
    for (const o of cancelledOrders.rows) {
      ecommerceCancelled += Math.round(parseFloat(o.total || 0) * 100) / 100;
    }
    ecommerceCancelled = Math.round(ecommerceCancelled * 100) / 100;

    const grossRevenue = Math.round((rentalGross + ecommerceGross) * 100) / 100;
    const cancelledAmount = Math.round((rentalCancelled + ecommerceCancelled) * 100) / 100;
    const transactionCount = rentalCount + completedOrders.rows.length;

    const netRevenue = Math.round((grossRevenue - cancelledAmount - totalEarlyReturnRefund) * 100) / 100;

    const activeRentals = await pool.query(
      `SELECT DISTINCT ON (r.id) r.id, r.start_date, r.end_date, c.price_per_day
       FROM rentals r
       LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
       LEFT JOIN cars c ON c.id = rcl.car_id
       WHERE r.rental_status = 'aktif'
       ORDER BY r.id`
    );
    const projectedRevenue = calcRevenue(activeRentals.rows);

    const carBreakdown: Record<string, { brand: string; model: string; revenue: number; count: number }> = {};
    for (const r of completedRentals.rows) {
      if (!r.car_id || !r.price_per_day) continue;
      const key = `${r.car_id}`;
      if (!carBreakdown[key]) {
        carBreakdown[key] = { brand: r.brand || '?', model: r.model || '?', revenue: 0, count: 0 };
      }
      carBreakdown[key].revenue += calcTotal(calcDays(r.start_date, r.end_date), r.price_per_day);
      carBreakdown[key].count += 1;
    }
    for (const k of Object.keys(carBreakdown)) {
      carBreakdown[k].revenue = Math.round(carBreakdown[k].revenue * 100) / 100;
    }

    const officeBreakdown: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const r of completedRentals.rows) {
      if (!r.pickup_office || !r.price_per_day) continue;
      const key = r.pickup_office;
      if (!officeBreakdown[key]) {
        officeBreakdown[key] = { name: key, revenue: 0, count: 0 };
      }
      officeBreakdown[key].revenue += calcTotal(calcDays(r.start_date, r.end_date), r.price_per_day);
      officeBreakdown[key].count += 1;
    }
    for (const k of Object.keys(officeBreakdown)) {
      officeBreakdown[k].revenue = Math.round(officeBreakdown[k].revenue * 100) / 100;
    }

    for (const oId of Object.keys(officeBreakdown)) {
      const officeResult = await pool.query('SELECT name FROM offices WHERE id::text = $1 OR document_id = $1', [oId]);
      if (officeResult.rows.length > 0) {
        officeBreakdown[oId].name = officeResult.rows[0].name;
      }
    }

    function buildTransaction(r: any, status: 'completed' | 'cancelled') {
      const days = calcDays(r.start_date, r.end_date);
      const total = calcTotal(days, r.price_per_day);
      const earlyInfo = detectEarlyReturn(r);
      const customerName = [r.user_first_name, r.user_last_name].filter(Boolean).join(' ') || r.user_username || 'Bilinmeyen';

      return {
        id: r.id,
        documentId: r.document_id,
        transactionType: 'rental' as const,
        car: r.brand && r.model ? `${r.brand} ${r.model}` : 'Bilinmeyen Araç',
        customerName,
        customerEmail: r.user_email || '',
        paymentType: r.payment_type || 'Belirtilmemiş',
        startDate: r.start_date,
        endDate: r.end_date,
        requestedEndDate: r.original_end_date || r.requested_end_date || null,
        days,
        pricePerDay: Math.round(parseFloat(r.price_per_day || 0) * 100) / 100,
        total,
        status,
        rentalStatus: r.rental_status,
        isEarlyReturn: earlyInfo.isEarlyReturn,
        earlyReturnDays: earlyInfo.savedDays,
        refundAmount: earlyInfo.refundAmount,
        completedAt: r.updated_at,
      };
    }

    function buildOrderTransaction(o: any, status: 'completed' | 'cancelled') {
      return {
        id: o.id + 100000,
        documentId: `SHOP-${o.id}`,
        transactionType: 'product_sale' as const,
        car: o.item_title || 'E-Ticaret Ürünü',
        customerName: o.customer_name || 'Bilinmeyen',
        customerEmail: o.customer_email || '',
        paymentType: o.payment_type || 'Belirtilmemiş',
        startDate: null,
        endDate: null,
        requestedEndDate: null,
        days: o.quantity || 1,
        pricePerDay: Math.round(parseFloat(o.unit_price || 0) * 100) / 100,
        total: Math.round(parseFloat(o.total || 0) * 100) / 100,
        status,
        isEarlyReturn: false,
        earlyReturnDays: 0,
        refundAmount: status === 'cancelled' ? Math.round(parseFloat(o.total || 0) * 100) / 100 : 0,
        completedAt: o.updated_at || o.created_at,
      };
    }

    const completedTransactions = completedRentals.rows.map((r: any) => buildTransaction(r, 'completed'));
    const cancelledTransactions = cancelledRentals.rows.map((r: any) => buildTransaction(r, 'cancelled'));
    const completedOrderTxs = completedOrders.rows.map((o: any) => buildOrderTransaction(o, 'completed'));
    const cancelledOrderTxs = cancelledOrders.rows.map((o: any) => buildOrderTransaction(o, 'cancelled'));

    const allTransactions = [...completedTransactions, ...cancelledTransactions, ...completedOrderTxs, ...cancelledOrderTxs]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    res.json({
      period,
      startDate: startISO,
      endDate: endISO,
      summary: {
        grossRevenue,
        cancelledAmount: Math.round(cancelledAmount * 100) / 100,
        netRevenue,
        transactionCount,
        cancelledCount: cancelledCount + cancelledOrders.rows.length,
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        activeRentalCount: activeRentals.rows.length,
        earlyReturnCount,
        totalEarlyReturnRefund,
        rentalGross,
        rentalCancelled,
        ecommerceGross,
        ecommerceCancelled,
        rentalCount,
        ecommerceCount: completedOrders.rows.length,
        ecommerceCancelledCount: cancelledOrders.rows.length,
      },
      carBreakdown: Object.values(carBreakdown).sort((a, b) => b.revenue - a.revenue),
      officeBreakdown: Object.values(officeBreakdown).sort((a, b) => b.revenue - a.revenue),
      allTransactions,
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});
