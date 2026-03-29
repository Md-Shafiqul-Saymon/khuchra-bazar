import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { Admin } from '../../schemas/admin.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async seedAdmin() {
    const count = await this.adminModel.countDocuments();
    if (count === 0) {
      const username = this.configService.get('ADMIN_USERNAME') || 'admin';
      const password = this.configService.get('ADMIN_PASSWORD') || 'admin123';
      const hash = await bcrypt.hash(password, 10);
      await this.adminModel.create({ username, passwordHash: hash });
      console.log(`Admin user "${username}" created`);
    }
  }

  async validateAdmin(username: string, password: string) {
    const admin = await this.adminModel.findOne({ username });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return admin;
  }

  async login(username: string, password: string) {
    const admin = await this.validateAdmin(username, password);
    const payload = { sub: admin._id, username: admin.username };
    const token = this.jwtService.sign(payload);
    return { token, admin: { id: admin._id, username: admin.username } };
  }

  async findById(id: string) {
    return this.adminModel.findById(id).select('-passwordHash').lean();
  }
}
