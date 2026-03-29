import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { OrderService } from './order.service';
import { CartService } from '../cart/cart.service';
import { SettingsService } from '../settings/settings.service';
import { JwtAuthGuard } from '../admin/jwt-auth.guard';

@Controller('api/orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
    private readonly settingsService: SettingsService,
  ) {}

  private getIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1'
    );
  }

  @Post()
  async placeOrder(@Req() req: Request, @Body() body: any) {
    const { customerName, customerPhone, customerAddress, deliveryArea } = body;

    if (!customerName || !customerPhone || !customerAddress || !deliveryArea) {
      throw new BadRequestException('সব তথ্য পূরণ করুন');
    }

    const ip = this.getIp(req);
    const cart = await this.cartService.getCartWithProducts(ip);

    if (!cart.items.length) {
      throw new BadRequestException('আপনার কার্ট খালি');
    }

    const settings = await this.settingsService.get();
    let deliveryCharge = settings.deliveryChargeDhakaInside;
    if (deliveryArea === 'dhaka-outside') deliveryCharge = settings.deliveryChargeDhakaOutside;
    if (deliveryArea === 'express') deliveryCharge = settings.deliveryChargeExpress;

    const order = await this.orderService.create({
      customerName,
      customerPhone,
      customerAddress,
      deliveryArea,
      deliveryCharge,
      items: cart.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        image: i.image,
        price: i.price,
        quantity: i.quantity,
      })),
      subtotal: cart.subtotal,
      total: cart.subtotal + deliveryCharge,
    });

    await this.cartService.clearCart(ip);

    return { success: true, order };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query('page') page: number, @Query('status') status: string) {
    return this.orderService.findAll({ page, status });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.orderService.updateStatus(id, body.status);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.orderService.delete(id);
  }
}
