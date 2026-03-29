import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../admin/jwt-auth.guard';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async get() {
    return this.settingsService.get();
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async update(@Body() body: any) {
    return this.settingsService.update(body);
  }
}
