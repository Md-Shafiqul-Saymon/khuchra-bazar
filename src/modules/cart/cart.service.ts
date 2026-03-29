import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from '../../schemas/cart.schema';
import { ProductService } from '../product/product.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    private productService: ProductService,
  ) {}

  async getCart(ip: string) {
    let cart = await this.cartModel.findOne({ ipAddress: ip });
    if (!cart) {
      cart = await this.cartModel.create({ ipAddress: ip, items: [] });
    }
    return cart;
  }

  async getCartWithProducts(ip: string) {
    const cart = await this.getCart(ip);
    if (!cart.items.length) return { items: [], totalItems: 0, subtotal: 0 };

    const productIds = cart.items.map((i) => i.productId.toString());
    const products = await this.productService.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const items = cart.items
      .map((item) => {
        const product = productMap.get(item.productId.toString());
        if (!product) return null;
        const price = product.discountPrice || product.price;
        return {
          productId: product._id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] || '',
          price,
          originalPrice: product.price,
          quantity: item.quantity,
          lineTotal: price * item.quantity,
        };
      })
      .filter(Boolean);

    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);

    return { items, totalItems, subtotal };
  }

  async addItem(ip: string, productId: string, quantity = 1) {
    const cart = await this.getCart(ip);
    const existing = cart.items.find((i) => i.productId.toString() === productId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ productId: productId as any, quantity });
    }
    cart.updatedAt = new Date();
    return cart.save();
  }

  async updateQuantity(ip: string, productId: string, quantity: number) {
    const cart = await this.getCart(ip);
    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (item) {
      if (quantity <= 0) {
        cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
      } else {
        item.quantity = quantity;
      }
      cart.updatedAt = new Date();
      await cart.save();
    }
    return cart;
  }

  async removeItem(ip: string, productId: string) {
    const cart = await this.getCart(ip);
    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    cart.updatedAt = new Date();
    return cart.save();
  }

  async clearCart(ip: string) {
    return this.cartModel.findOneAndUpdate(
      { ipAddress: ip },
      { items: [], updatedAt: new Date() },
    );
  }

  async getItemCount(ip: string) {
    const cart = await this.cartModel.findOne({ ipAddress: ip }).lean();
    if (!cart) return 0;
    return cart.items.reduce((s, i) => s + i.quantity, 0);
  }
}
