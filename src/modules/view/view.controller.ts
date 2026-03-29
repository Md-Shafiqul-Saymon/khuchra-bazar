import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { CartService } from '../cart/cart.service';
import { OrderService } from '../order/order.service';
import { SettingsService } from '../settings/settings.service';

@Controller()
export class ViewController {
  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private orderService: OrderService,
    private settingsService: SettingsService,
  ) {}

  private getIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1'
    );
  }

  @Get()
  async home(@Req() req: Request, @Res() res: Response, @Query('page') page: string) {
    const settings = await this.settingsService.get();
    const categories = await this.categoryService.findAll();
    const flashSale = await this.productService.findFlashSale();
    const { products, total, pages } = await this.productService.findAll({
      page: parseInt(page) || 1,
      limit: 20,
    });
    const cartCount = await this.cartService.getItemCount(this.getIp(req));

    res.render('pages/home', {
      settings, categories, flashSale, products, total, pages,
      currentPage: parseInt(page) || 1, cartCount,
    });
  }

  @Get('product/:slug')
  async productDetail(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string) {
    const settings = await this.settingsService.get();
    const product = await this.productService.findBySlug(slug);
    if (!product) return res.status(404).render('pages/404', { settings });

    const catId = (product.category as any)?._id || product.category;
    const related = catId
      ? await this.productService.findRelated(catId.toString(), product._id.toString())
      : [];
    const cartCount = await this.cartService.getItemCount(this.getIp(req));
    const categories = await this.categoryService.findAll();

    res.render('pages/product-detail', { settings, product, related, cartCount, categories });
  }

  @Get('cart')
  async cart(@Req() req: Request, @Res() res: Response) {
    const settings = await this.settingsService.get();
    const cart = await this.cartService.getCartWithProducts(this.getIp(req));
    const categories = await this.categoryService.findAll();

    res.render('pages/cart', { settings, cart, cartCount: cart.totalItems, categories });
  }

  @Get('checkout')
  async checkout(@Req() req: Request, @Res() res: Response) {
    const settings = await this.settingsService.get();
    const cart = await this.cartService.getCartWithProducts(this.getIp(req));
    const categories = await this.categoryService.findAll();

    if (!cart.items.length) return res.redirect('/cart');

    res.render('pages/checkout', { settings, cart, cartCount: cart.totalItems, categories });
  }

  @Get('order-success/:id')
  async orderSuccess(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const settings = await this.settingsService.get();
    const order = await this.orderService.findById(id);
    if (!order) return res.status(404).render('pages/404', { settings });
    const categories = await this.categoryService.findAll();

    res.render('pages/order-success', { settings, order, cartCount: 0, categories });
  }

  @Get('search')
  async search(@Req() req: Request, @Res() res: Response, @Query('q') q: string, @Query('page') page: string) {
    const settings = await this.settingsService.get();
    const categories = await this.categoryService.findAll();
    const cartCount = await this.cartService.getItemCount(this.getIp(req));

    let products = [], total = 0, pages = 0;
    if (q) {
      const result = await this.productService.findAll({
        page: parseInt(page) || 1,
        limit: 20,
        search: q,
      });
      products = result.products;
      total = result.total;
      pages = result.pages;
    }

    res.render('pages/search', {
      settings, products, total, pages, q,
      currentPage: parseInt(page) || 1, cartCount, categories,
    });
  }

  @Get('category/:slug')
  async categoryPage(
    @Req() req: Request, @Res() res: Response,
    @Param('slug') slug: string, @Query('page') page: string,
  ) {
    const settings = await this.settingsService.get();
    const categories = await this.categoryService.findAll();
    const category = await this.categoryService.findBySlug(slug);
    if (!category) return res.status(404).render('pages/404', { settings });

    const { products, total, pages } = await this.productService.findAll({
      page: parseInt(page) || 1,
      limit: 20,
      category: (category as any)._id,
    });
    const cartCount = await this.cartService.getItemCount(this.getIp(req));

    res.render('pages/category', {
      settings, category, categories, products, total, pages,
      currentPage: parseInt(page) || 1, cartCount,
    });
  }
}
