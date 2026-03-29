import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { OrderService } from '../order/order.service';
import { SettingsService } from '../settings/settings.service';
import { JwtAuthGuard } from '../admin/jwt-auth.guard';

@Controller('admin')
export class AdminViewController {
  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private orderService: OrderService,
    private settingsService: SettingsService,
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
    const categories = await this.categoryService.findAll();
    res.render('admin/products', { ...result, categories, search });
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
    const product = await this.productService.findById(id);
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
    const order = await this.orderService.findById(id);
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
    const settings = await this.settingsService.get();
    res.render('admin/settings', { settings });
  }
}
