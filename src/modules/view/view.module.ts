import { Module } from '@nestjs/common';
import { ViewController } from './view.controller';
import { AdminViewController } from './admin-view.controller';
import { ProductModule } from '../product/product.module';
import { CategoryModule } from '../category/category.module';
import { CartModule } from '../cart/cart.module';
import { OrderModule } from '../order/order.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminModule } from '../admin/admin.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    ProductModule,
    CategoryModule,
    CartModule,
    OrderModule,
    SettingsModule,
    AdminModule,
    UploadModule,
  ],
  controllers: [ViewController, AdminViewController],
})
export class ViewModule {}
