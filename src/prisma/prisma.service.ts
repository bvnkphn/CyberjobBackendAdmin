import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/** schema.prisma ใช้ engineType = "client" จึงต้องส่ง driver adapter เสมอ (เหมือนฝั่ง member) */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log("เชื่อมต่อ PostgreSQL สำเร็จ");
    } catch (error) {
      this.logger.error(
        `ยังเชื่อมต่อ PostgreSQL ไม่สำเร็จตอนเริ่มระบบ: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
