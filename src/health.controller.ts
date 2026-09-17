import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let database = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    return {
      status: database === "up" ? "ok" : "degraded",
      service: "cyberjob-backend-admin",
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
