import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { OrderService } from '../order/order.service';
import { SettingsService } from '../settings/settings.service';
import { JwtAuthGuard } from '../admin/jwt-auth.guard';
import { S3ImageUrlService } from '../upload/s3-image-url.service';

@Controller('admin')
export class AdminViewController {
  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private orderService: OrderService,
    private settingsService: SettingsService,
    private s3ImageUrlService: S3ImageUrlService,
  ) {}

  @Get('login')
  async loginPage(@Res() res: Response) {
    res.render('admin/login');
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async dashboard(@Res() res: Response) {
    const stats = await this.orderService.getStats();
    const productCount = await this.productService.count();
    res.render('admin/dashboard', { stats, productCount });
  }

  @UseGuards(JwtAuthGuard)
  @Get('products')
  async products(@Res() res: Response, @Query('page') page: string, @Query('search') search: string) {
    const result = await this.productService.findAllAdmin({
      page: parseInt(page) || 1,
      search,
    });
    const products = await this.s3ImageUrlService.signProducts(result.products);
    const categories = await this.categoryService.findAll();
    res.render('admin/products', { ...result, products, categories, search });
  }

  @UseGuards(JwtAuthGuard)
  @Get('products/new')
  async newProduct(@Res() res: Response) {
    const categories = await this.categoryService.findAll();
    res.render('admin/product-form', { product: null, categories });
  }

  @UseGuards(JwtAuthGuard)
  @Get('products/:id/edit')
  async editProduct(@Res() res: Response, @Param('id') id: string) {
    const productRaw = await this.productService.findById(id);
    if (!productRaw) return res.redirect('/admin/products');
    const product = await this.s3ImageUrlService.signProduct(productRaw);
    const categories = await this.categoryService.findAll();
    res.render('admin/product-form', { product, categories });
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  async orders(@Res() res: Response, @Query('page') page: string, @Query('status') status: string) {
    const result = await this.orderService.findAll({
      page: parseInt(page) || 1,
      status,
    });
    res.render('admin/orders', { ...result, statusFilter: status });
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:id')
  async orderDetail(@Res() res: Response, @Param('id') id: string) {
    const orderRaw = await this.orderService.findById(id);
    if (!orderRaw) return res.redirect('/admin/orders');
    const order = await this.s3ImageUrlService.signOrder(orderRaw);
    res.render('admin/order-detail', { order });
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  async categories(@Res() res: Response) {
    const categories = await this.categoryService.findAll();
    res.render('admin/categories', { categories });
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings')
  async settings(@Res() res: Response) {
    const settingsRaw = await this.settingsService.get();
    const settings = await this.s3ImageUrlService.signSettings(settingsRaw);
    res.render('admin/settings', { settings });
  }
}
