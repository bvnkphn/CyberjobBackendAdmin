import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { AdminJobsController } from "./jobs/admin-jobs.controller";
import { AdminJobsService } from "./jobs/admin-jobs.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AdminUsersController } from "./users/admin-users.controller";
import { AdminUsersService } from "./users/admin-users.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [HealthController, AdminJobsController, AdminUsersController],
  providers: [AdminJobsService, AdminUsersService],
})
export class AppModule {}
