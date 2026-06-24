import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../../schemas/category.schema';
import slugify from 'slugify';

@Injectable()
export class CategoryService {
  private cache: { data: any[]; at: number } | null = null;
  private readonly TTL = 120_000;

  constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) {}

  async findAll() {
    if (this.cache && Date.now() - this.cache.at < this.TTL) return this.cache.data;
    const data = await this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).lean();
    this.cache = { data, at: Date.now() };
    return data;
  }

  async findById(id: string) {
    return this.categoryModel.findById(id).lean();
  }

  async findBySlug(slug: string) {
    return this.categoryModel.findOne({ slug }).lean();
  }

  async create(data: any) {
    if (!data.slug) {
      data.slug = slugify(data.name, { lower: true, strict: true });
    }
    const result = await this.categoryModel.create(data);
    this.cache = null;
    return result;
  }

  async update(id: string, data: any) {
    const result = await this.categoryModel.findByIdAndUpdate(id, data, { new: true });
    this.cache = null;
    return result;
  }

  async delete(id: string) {
    const result = await this.categoryModel.findByIdAndDelete(id);
    this.cache = null;
    return result;
  }
}
