import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings } from '../../schemas/settings.schema';

@Injectable()
export class SettingsService {
  private cache: { data: any; at: number } | null = null;
  private readonly TTL = 120_000;

  constructor(@InjectModel(Settings.name) private settingsModel: Model<Settings>) {}

  async seed() {
    const count = await this.settingsModel.countDocuments();
    if (count === 0) {
      await this.settingsModel.create({
        siteName: 'খুচরা বাজার',
        announcementBar: 'খুচরা বাজার-এ আপনাকে স্বাগতম! সারা দেশে হোম ডেলিভারি।',
        contactPhone: '01XXXXXXXXX',
        contactEmail: 'info@khuchrabazar.com',
        address: 'ঢাকা, বাংলাদেশ',
        deliveryChargeDhakaInside: 130,
        deliveryChargeDhakaOutside: 100,
        deliveryChargeExpress: 60,
      });
      console.log('Default settings created');
    }
  }

  async get() {
    if (this.cache && Date.now() - this.cache.at < this.TTL) return this.cache.data;
    const data = await this.settingsModel.findOne().lean();
    this.cache = { data, at: Date.now() };
    return data;
  }

  async update(data: any) {
    this.cache = null;
    return this.settingsModel.findOneAndUpdate({}, data, { new: true, upsert: true });
  }
}
