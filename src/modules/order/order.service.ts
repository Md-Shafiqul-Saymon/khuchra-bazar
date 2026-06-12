import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../../schemas/order.schema';

@Injectable()
export class OrderService {
  constructor(@InjectModel(Order.name) private orderModel: Model<Order>) {}

  generateOrderNumber(): string {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const r = Math.floor(1000 + Math.random() * 9000);
    return `KB${y}${m}${d}${r}`;
  }

  async create(data: any) {
    data.orderNumber = this.generateOrderNumber();
    return this.orderModel.create(data);
  }

  async findById(id: string) {
    return this.orderModel.findById(id).lean();
  }

  async findByOrderNumber(orderNumber: string) {
    return this.orderModel.findOne({ orderNumber }).lean();
  }

  async findAll(query: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 20, status } = query;
    const filter: any = {};
    if (status) filter.status = status;

    const total = await this.orderModel.countDocuments(filter);
    const orders = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { orders, total, page, pages: Math.ceil(total / limit) };
  }

  async updateStatus(id: string, status: string) {
    return this.orderModel.findByIdAndUpdate(id, { status }, { new: true });
  }

  async delete(id: string) {
    return this.orderModel.findByIdAndDelete(id);
  }

  async getStats() {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      todayOrders,
      thisMonthOrders,
      revenueResult,
      todayRevenueResult,
      thisMonthRevenueResult,
      dailyStats,
      topProductsRaw,
      recentOrders,
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: 'pending' }),
      this.orderModel.countDocuments({ status: 'confirmed' }),
      this.orderModel.countDocuments({ status: 'shipped' }),
      this.orderModel.countDocuments({ status: 'delivered' }),
      this.orderModel.countDocuments({ status: 'cancelled' }),
      this.orderModel.countDocuments({ createdAt: { $gte: todayStart } }),
      this.orderModel.countDocuments({ createdAt: { $gte: monthStart } }),
      this.orderModel.aggregate([
        { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.orderModel.aggregate([
        { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.name',
            qty: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { qty: -1 } },
        { $limit: 5 },
      ]),
      this.orderModel.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const todayRevenue = todayRevenueResult[0]?.total || 0;
    const thisMonthRevenue = thisMonthRevenueResult[0]?.total || 0;
    const completedCount = (confirmedOrders as number) + (shippedOrders as number) + (deliveredOrders as number);
    const avgOrderValue = completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0;

    const dailyMap = new Map((dailyStats as any[]).map((d) => [d._id, d]));
    const last7Days: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const entry = dailyMap.get(key) as any;
      last7Days.push({ date: label, revenue: entry?.revenue || 0, orders: entry?.orders || 0 });
    }

    const topProducts = (topProductsRaw as any[]).map((p) => ({
      name: p._id,
      qty: p.qty,
      revenue: p.revenue,
    }));

    return {
      totalOrders, pendingOrders, confirmedOrders, shippedOrders,
      deliveredOrders, cancelledOrders, totalRevenue,
      todayOrders, todayRevenue, thisMonthOrders, thisMonthRevenue,
      avgOrderValue, last7Days, topProducts, recentOrders,
    };
  }
}
