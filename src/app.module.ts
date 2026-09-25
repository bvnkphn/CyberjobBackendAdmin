import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { AdminCompaniesController } from "./companies/admin-companies.controller";
import { AdminCompaniesService } from "./companies/admin-companies.service";
import { AdminDashboardController } from "./dashboard/admin-dashboard.controller";
import { AdminDashboardService } from "./dashboard/admin-dashboard.service";
import { HealthController } from "./health.controller";
import { AdminJobsController } from "./jobs/admin-jobs.controller";
import { AdminJobsService } from "./jobs/admin-jobs.service";
import { AdminPackagesController } from "./packages/admin-packages.controller";
import { AdminPackagesService } from "./packages/admin-packages.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AdminSettingsController } from "./settings/admin-settings.controller";
import { AdminSettingsService } from "./settings/admin-settings.service";
import { AdminSynonymsController } from "./synonyms/admin-synonyms.controller";
import { AdminSynonymsService } from "./synonyms/admin-synonyms.service";
import { AdminUsersController } from "./users/admin-users.controller";
import { AdminUsersService } from "./users/admin-users.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [
    HealthController,
    AdminDashboardController,
    AdminCompaniesController,
    AdminJobsController,
    AdminUsersController,
    AdminPackagesController,
    AdminSynonymsController,
    AdminSettingsController,
  ],
  providers: [
    AdminDashboardService,
    AdminCompaniesService,
    AdminJobsService,
    AdminUsersService,
    AdminPackagesService,
    AdminSynonymsService,
    AdminSettingsService,
  ],
})
export class AppModule {}

