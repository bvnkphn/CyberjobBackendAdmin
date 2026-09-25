import { Body, Controller, Get, Patch, Post, Req, UseGuards, ValidationPipe } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { AdminSettingsService } from "./admin-settings.service";
import { TestEmailDto, UpdateSettingsDto } from "./dto/settings.dto";
import type { Request } from "express";
import type { RequestUser } from "../auth/jwt.strategy";

@Controller("admin/settings")
export class AdminSettingsController {
  constructor(private readonly settings: AdminSettingsService) {}

  /** ดึงสถานะ Maintenance Mode สำหรับหน้าบ้าน (ไม่ต้องผ่าน Auth) */
  @Get("public")
  getPublicMaintenance() {
    return this.settings.getPublicMaintenanceStatus();
  }

  /** ดึงการตั้งค่าทั้งหมดพร้อม System Stats */
  @Get()
  @UseGuards(AdminGuard)
  getSettings() {
    return this.settings.getSettings();
  }

  /** อัปเดตการตั้งค่าระบบลง PostgreSQL */
  @Patch()
  @UseGuards(AdminGuard)
  updateSettings(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: UpdateSettingsDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.settings.updateSettings(body, req.user?.email);
  }

  /** ทดสอบส่งอีเมลแจ้งเตือน */
  @Post("test-email")
  @UseGuards(AdminGuard)
  testEmail(@Body(new ValidationPipe({ transform: true })) body: TestEmailDto) {
    return this.settings.testEmail(body.recipient);
  }
}
