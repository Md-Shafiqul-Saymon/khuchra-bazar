import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export class OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ required: true })
  customerName: string;

  @Prop({ required: true })
  customerPhone: string;

  @Prop({ required: true })
  customerAddress: string;

  @Prop({ required: true, enum: ['dhaka-inside', 'dhaka-outside', 'express'] })
  deliveryArea: string;

  @Prop({ required: true })
  deliveryCharge: number;

  @Prop({
    type: [{ productId: String, name: String, image: String, price: Number, quantity: Number }],
    required: true,
  })
  items: OrderItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  total: number;

  @Prop({
    default: 'pending',
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
  })
  status: string;

  @Prop()
  note: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
