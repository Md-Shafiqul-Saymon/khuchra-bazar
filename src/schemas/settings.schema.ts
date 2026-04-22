import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Settings extends Document {
  @Prop({ default: 'খুচরা বাজার' })
  siteName: string;

  @Prop({ type: [String], default: [] })
  bannerImages: string[];

  @Prop()
  announcementBar: string;

  @Prop()
  contactEmail: string;

  @Prop()
  contactPhone: string;

  @Prop()
  address: string;

  @Prop({ type: Object, default: {} })
  socialLinks: Record<string, string>;

  /** Meta (Facebook) Pixel ID — optional; falls back to META_PIXEL_ID env */
  @Prop()
  metaPixelId: string;

  @Prop({ default: 130 })
  deliveryChargeDhakaInside: number;

  @Prop({ default: 100 })
  deliveryChargeDhakaOutside: number;

  @Prop({ default: 60 })
  deliveryChargeExpress: number;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
