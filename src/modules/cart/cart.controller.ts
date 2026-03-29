import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Req, Ip,
} from '@nestjs/common';
import { Request } from 'express';
import { CartService } from './cart.service';

@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private getIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1'
    );
  }

  @Get()
  async getCart(@Req() req: Request) {
    return this.cartService.getCartWithProducts(this.getIp(req));
  }

  @Get('count')
  async getCount(@Req() req: Request) {
    const count = await this.cartService.getItemCount(this.getIp(req));
    return { count };
  }

  @Post('add')
  async addItem(@Req() req: Request, @Body() body: { productId: string; quantity?: number }) {
    await this.cartService.addItem(this.getIp(req), body.productId, body.quantity || 1);
    return this.cartService.getCartWithProducts(this.getIp(req));
  }

  @Put(':productId')
  async updateQuantity(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    await this.cartService.updateQuantity(this.getIp(req), productId, body.quantity);
    return this.cartService.getCartWithProducts(this.getIp(req));
  }

  @Delete(':productId')
  async removeItem(@Req() req: Request, @Param('productId') productId: string) {
    await this.cartService.removeItem(this.getIp(req), productId);
    return this.cartService.getCartWithProducts(this.getIp(req));
  }

  @Delete()
  async clearCart(@Req() req: Request) {
    await this.cartService.clearCart(this.getIp(req));
    return { items: [], totalItems: 0, subtotal: 0 };
  }
}
