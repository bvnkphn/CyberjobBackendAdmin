import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AdminGuard } from "./admin.guard";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, AdminGuard],
  exports: [AdminGuard],
})
export class AuthModule {}
