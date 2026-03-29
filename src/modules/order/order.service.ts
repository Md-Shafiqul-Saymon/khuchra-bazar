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
    const totalOrders = await this.orderModel.countDocuments();
    const pendingOrders = await this.orderModel.countDocuments({ status: 'pending' });
    const confirmedOrders = await this.orderModel.countDocuments({ status: 'confirmed' });
    const deliveredOrders = await this.orderModel.countDocuments({ status: 'delivered' });

    const revenueResult = await this.orderModel.aggregate([
      { $match: { status: { $in: ['confirmed', 'shipped', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const recentOrders = await this.orderModel
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return { totalOrders, pendingOrders, confirmedOrders, deliveredOrders, totalRevenue, recentOrders };
  }
}
