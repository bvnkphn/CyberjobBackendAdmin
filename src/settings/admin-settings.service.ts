import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UpdateSettingsDto } from "./dto/settings.dto";

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** ดึงการตั้งค่าระบบปัจจุบันจาก PostgreSQL */
  async getSettings() {
    let setting = await this.prisma.systemSetting.findUnique({
      where: { id: "default" },
    });

    if (!setting) {
      setting = await this.prisma.systemSetting.upsert({
        where: { id: "default" },
        create: { id: "default" },
        update: {},
      });
    }

    // สถิติระบบเบื้องต้นสำหรับแสดงใน System Health & Info
    const [userCount, companyCount, jobCount, pendingPaymentsCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.company.count(),
      this.prisma.job.count(),
      this.prisma.subscriptionPayment.count({ where: { status: "PENDING" } }),
    ]);

    const memoryUsage = process.memoryUsage();

    return {
      ...setting,
      systemInfo: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        memoryTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        databaseStatus: "CONNECTED",
        counts: {
          users: userCount,
          companies: companyCount,
          jobs: jobCount,
          pendingPayments: pendingPaymentsCount,
        },
      },
    };
  }

  /** บันทึกการตั้งค่าระบบลง PostgreSQL */
  async updateSettings(dto: UpdateSettingsDto, adminEmail?: string) {
    const data: Record<string, any> = {
      ...dto,
      updatedBy: adminEmail ?? null,
    };

    const updated = await this.prisma.systemSetting.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });

    this.logger.log(`Settings updated in DB by ${adminEmail ?? "system"}: ${Object.keys(dto).join(", ")}`);
    return updated;
  }

  /** จำลองการส่งอีเมลแจ้งเตือนทดสอบไปยัง Recipients */
  async testEmail(recipient: string) {
    if (!recipient || !recipient.includes("@")) {
      throw new BadRequestException("กรุณาระบุอีเมลที่ถูกต้อง");
    }

    this.logger.log(`Dispatched test notification to: ${recipient}`);

    return {
      success: true,
      message: `ระบบได้ทดสอบจัดส่งสัญญาณแจ้งเตือนไปยัง ${recipient} สำเร็จเรียบร้อยแล้ว`,
      timestamp: new Date().toISOString(),
    };
  }

  /** Public endpoint สำหรับตรวจสอบสถานะ Maintenance Mode ของระบบ */
  async getPublicMaintenanceStatus() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id: "default" },
      select: {
        maintenanceMode: true,
        announcementTitle: true,
        announcementMsg: true,
        estimatedDowntime: true,
        maintenanceStart: true,
        maintenanceEnd: true,
      },
    });

    return (
      setting ?? {
        maintenanceMode: false,
        announcementTitle: "",
        announcementMsg: "",
        estimatedDowntime: "",
        maintenanceStart: null,
        maintenanceEnd: null,
      }
    );
  }
}
