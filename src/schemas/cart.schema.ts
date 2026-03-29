import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ default: 1, min: 1 })
  quantity: number;
}

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({ required: true, index: true })
  ipAddress: string;

  @Prop({
    type: [{ productId: { type: Types.ObjectId, ref: 'Product' }, quantity: Number }],
    default: [],
  })
  items: CartItem[];

  @Prop({ type: Date, default: Date.now, expires: 604800 })
  updatedAt: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
