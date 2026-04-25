import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from '../../schemas/product.schema';
import slugify from 'slugify';

@Injectable()
export class ProductService {
  constructor(@InjectModel(Product.name) private productModel: Model<Product>) {}

  private normalizeCategoryInput(data: any) {
    if (!Object.prototype.hasOwnProperty.call(data, 'category')) return;
    const raw = data.category;

    if (raw === null || raw === undefined || raw === '') {
      data.category = null;
      return;
    }

    if (typeof raw === 'string') {
      data.category = Types.ObjectId.isValid(raw) ? raw : null;
      return;
    }

    if (typeof raw === 'object' && raw._id) {
      const id = String(raw._id);
      data.category = Types.ObjectId.isValid(id) ? id : null;
      return;
    }

    data.category = null;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: string;
  }) {
    const { page = 1, limit = 20, category, search, status = 'active' } = query;
    const filter: any = {};

    if (status) filter.status = status;
    if (category) {
      // Support legacy records where category may be stored as string instead of ObjectId.
      filter.$expr = { $eq: [{ $toString: '$category' }, String(category)] };
    }
    if (search) filter.$text = { $search: search };

    const total = await this.productModel.countDocuments(filter);
    const products = await this.productModel
      .find(filter)
      .populate('category')
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { products, total, page, pages: Math.ceil(total / limit) };
  }

  async findFlashSale() {
    return this.productModel
      .find({ isFlashSale: true, status: 'active' })
      .populate('category')
      .sort({ sortOrder: 1 })
      .limit(10)
      .lean();
  }

  async findFeatured() {
    return this.productModel
      .find({ isFeatured: true, status: 'active' })
      .populate('category')
      .sort({ sortOrder: 1 })
      .limit(10)
      .lean();
  }

  async findBySlug(slug: string) {
    return this.productModel.findOne({ slug }).populate('category').lean();
  }

  async findById(id: string) {
    return this.productModel.findById(id).populate('category').lean();
  }

  async findByIds(ids: string[]) {
    return this.productModel.find({ _id: { $in: ids } }).lean();
  }

  async findRelated(categoryId: string, excludeId: string, limit = 8) {
    return this.productModel
      .find({
        status: 'active',
        _id: { $ne: excludeId },
        $expr: { $eq: [{ $toString: '$category' }, String(categoryId)] },
      })
      .limit(limit)
      .lean();
  }

  async create(data: any) {
    this.normalizeCategoryInput(data);
    if (!data.slug) {
      data.slug = slugify(data.nameEn || data.name, { lower: true, strict: true });
    }
    const existing = await this.productModel.findOne({ slug: data.slug });
    if (existing) {
      data.slug = `${data.slug}-${Date.now()}`;
    }
    return this.productModel.create(data);
  }

  async update(id: string, data: any) {
    this.normalizeCategoryInput(data);
    if (data.nameEn && !data.slug) {
      data.slug = slugify(data.nameEn || data.name, { lower: true, strict: true });
    }
    return this.productModel.findByIdAndUpdate(id, data, { new: true });
  }

  async delete(id: string) {
    return this.productModel.findByIdAndDelete(id);
  }

  async count() {
    return this.productModel.countDocuments({ status: 'active' });
  }

  async findAllAdmin(query: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = query;
    const filter: any = {};
    if (search) filter.$text = { $search: search };

    const total = await this.productModel.countDocuments(filter);
    const products = await this.productModel
      .find(filter)
      .populate('category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { products, total, page, pages: Math.ceil(total / limit) };
  }
}
