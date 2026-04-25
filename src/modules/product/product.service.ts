import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from '../../schemas/product.schema';
import slugify from 'slugify';

@Injectable()
export class ProductService {
  constructor(@InjectModel(Product.name) private productModel: Model<Product>) {}

  private buildSlug(source: string): string {
    return slugify(source, { lower: true, strict: true }) || `product-${Date.now()}`;
  }

  private async ensureUniqueSlug(source: string, currentId?: string): Promise<string> {
    const baseSlug = this.buildSlug(source);
    const filter: any = { slug: baseSlug };

    if (currentId) {
      filter._id = { $ne: currentId };
    }

    const existing = await this.productModel.findOne(filter).lean();
    if (!existing) return baseSlug;

    return `${baseSlug}-${Date.now()}`;
  }

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
      data.slug = await this.ensureUniqueSlug(data.nameEn || data.name);
    } else {
      data.slug = await this.ensureUniqueSlug(data.slug);
    }
    return this.productModel.create(data);
  }

  async update(id: string, data: any) {
    this.normalizeCategoryInput(data);
    if (data.slug) {
      data.slug = await this.ensureUniqueSlug(data.slug, id);
    } else if (data.nameEn || data.name) {
      data.slug = await this.ensureUniqueSlug(data.nameEn || data.name, id);
    }

    try {
      return await this.productModel.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      });
    } catch (error: any) {
      const isDuplicateKey = error?.code === 11000 || String(error?.message || '').includes('E11000');
      if (isDuplicateKey) {
        throw new BadRequestException('A product with the same slug already exists');
      }
      throw error;
    }
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

  async listDistinctImageUrls(limit = 2000): Promise<string[]> {
    const values = await this.productModel
      .distinct('images', {
        images: { $exists: true, $ne: [] },
      });

    return values
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .slice(0, limit);
  }
}
