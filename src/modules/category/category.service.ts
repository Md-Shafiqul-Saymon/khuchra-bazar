import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../../schemas/category.schema';
import slugify from 'slugify';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) {}

  async findAll() {
    return this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).lean();
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
    return this.categoryModel.create(data);
  }

  async update(id: string, data: any) {
    return this.categoryModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string) {
    return this.categoryModel.findByIdAndDelete(id);
  }
}
