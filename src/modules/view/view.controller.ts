import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { CartService } from '../cart/cart.service';
import { OrderService } from '../order/order.service';
import { SettingsService } from '../settings/settings.service';
import { S3ImageUrlService } from '../upload/s3-image-url.service';
import { MetaPixelService } from '../../common/meta-pixel.service';

@Controller()
export class ViewController {
  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private orderService: OrderService,
    private settingsService: SettingsService,
    private s3ImageUrlService: S3ImageUrlService,
    private metaPixelService: MetaPixelService,
  ) {}

  private getIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1'
    );
  }

  private async settingsView() {
    const settings = await this.settingsService.get();
    return this.s3ImageUrlService.signSettings(settings);
  }

  private getMetaPixel(settings: { metaPixelId?: string } | null | undefined) {
    return this.metaPixelService.getBundle(settings?.metaPixelId);
  }

  @Get()
  async home(@Req() req: Request, @Res() res: Response, @Query('page') page: string) {
    const settings = await this.settingsView();
    const categories = await this.categoryService.findAll();
    const flashSaleRaw = await this.productService.findFlashSale();
    const flashSale = await this.s3ImageUrlService.signProducts(flashSaleRaw);
    const { products: productsRaw, total, pages } = await this.productService.findAll({
      page: parseInt(page) || 1,
      limit: 20,
    });
    const products = await this.s3ImageUrlService.signProducts(productsRaw);
    const cartCount = await this.cartService.getItemCount(this.getIp(req));

    res.render('pages/home', {
      settings, categories, flashSale, products, total, pages,
      currentPage: parseInt(page) || 1, cartCount,
      metaPixel: this.getMetaPixel(settings),
    });
  }

  @Get('product/:slug')
  async productDetail(@Req() req: Request, @Res() res: Response, @Param('slug') slug: string) {
    const settings = await this.settingsView();
    const productRaw = await this.productService.findBySlug(slug);
    if (!productRaw) {
      const categories = await this.categoryService.findAll();
      const cartCount = await this.cartService.getItemCount(this.getIp(req));
      return res.status(404).render('pages/404', {
        settings, categories, cartCount,
        metaPixel: this.getMetaPixel(settings),
      });
    }

    const product = await this.s3ImageUrlService.signProduct(productRaw);
    const catId = (product!.category as any)?._id || product!.category;
    const relatedRaw = catId
      ? await this.productService.findRelated(catId.toString(), product!._id.toString())
      : [];
    const related = await this.s3ImageUrlService.signProducts(relatedRaw);
    const cartCount = await this.cartService.getItemCount(this.getIp(req));
    const categories = await this.categoryService.findAll();

    res.render('pages/product-detail', { settings, product, related, cartCount, categories, metaPixel: this.getMetaPixel(settings) });
  }

  @Get('cart')
  async cart(@Req() req: Request, @Res() res: Response) {
    const settings = await this.settingsView();
    const cart = await this.cartService.getCartWithProducts(this.getIp(req));
    const categories = await this.categoryService.findAll();

    res.render('pages/cart', { settings, cart, cartCount: cart.totalItems, categories, metaPixel: this.getMetaPixel(settings) });
  }

  @Get('checkout')
  async checkout(@Req() req: Request, @Res() res: Response) {
    const settings = await this.settingsView();
    const cart = await this.cartService.getCartWithProducts(this.getIp(req));
    const categories = await this.categoryService.findAll();

    if (!cart.items.length) return res.redirect('/cart');

    res.render('pages/checkout', { settings, cart, cartCount: cart.totalItems, categories, metaPixel: this.getMetaPixel(settings) });
  }

  @Get('order-success/:id')
  async orderSuccess(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const settings = await this.settingsView();
    const order = await this.orderService.findById(id);
    if (!order) {
      const categories = await this.categoryService.findAll();
      const cartCount = await this.cartService.getItemCount(this.getIp(req));
      return res.status(404).render('pages/404', {
        settings, categories, cartCount,
        metaPixel: this.getMetaPixel(settings),
      });
    }
    const categories = await this.categoryService.findAll();

    res.render('pages/order-success', { settings, order, cartCount: 0, categories, metaPixel: this.getMetaPixel(settings) });
  }

  @Get('search')
  async search(@Req() req: Request, @Res() res: Response, @Query('q') q: string, @Query('page') page: string) {
    const settings = await this.settingsView();
    const categories = await this.categoryService.findAll();
    const cartCount = await this.cartService.getItemCount(this.getIp(req));

    let products: any[] = [], total = 0, pages = 0;
    if (q) {
      const result = await this.productService.findAll({
        page: parseInt(page) || 1,
        limit: 20,
        search: q,
      });
      products = await this.s3ImageUrlService.signProducts(result.products);
      total = result.total;
      pages = result.pages;
    }

    res.render('pages/search', {
      settings, products, total, pages, q,
      currentPage: parseInt(page) || 1, cartCount, categories,
      metaPixel: this.getMetaPixel(settings),
    });
  }

  @Get('category/:slug')
  async categoryPage(
    @Req() req: Request, @Res() res: Response,
    @Param('slug') slug: string, @Query('page') page: string,
  ) {
    const settings = await this.settingsView();
    const categories = await this.categoryService.findAll();
    const category = await this.categoryService.findBySlug(slug);
    if (!category) {
      const cartCount = await this.cartService.getItemCount(this.getIp(req));
      return res.status(404).render('pages/404', {
        settings, categories, cartCount,
        metaPixel: this.getMetaPixel(settings),
      });
    }

    const { products: productsRaw, total, pages } = await this.productService.findAll({
      page: parseInt(page) || 1,
      limit: 20,
      category: (category as any)._id,
    });
    const products = await this.s3ImageUrlService.signProducts(productsRaw);
    const cartCount = await this.cartService.getItemCount(this.getIp(req));

    res.render('pages/category', {
      settings, category, categories, products, total, pages,
      currentPage: parseInt(page) || 1, cartCount,
      metaPixel: this.getMetaPixel(settings),
    });
  }
}
