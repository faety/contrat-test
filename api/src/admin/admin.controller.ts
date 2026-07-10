import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { AdminService } from "./admin.service";
import { CurrentAuth, JwtAuthGuard, Roles, RolesGuard } from "../auth/guards";
import type { JwtPayload } from "../auth/auth.service";
import type { UserStatus } from "../entities";

class SetUserStatusDto {
  @IsIn(["active", "blocked", "suspended"])
  status: Extract<UserStatus, "active" | "blocked" | "suspended">;
}

class GrantDto {
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason: string;
}

class ReverseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason: string;
}

class CreateRewardRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  trigger: string;

  @IsInt()
  @Min(1)
  @Max(100_000)
  rewardAmount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  budget?: number;
}

class SetRuleStatusDto {
  @IsIn(["active", "paused", "ended"])
  status: "active" | "paused" | "ended";
}

@Controller("v1/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("users")
  users(@Query("search") search?: string, @Query("limit") limit?: string) {
    return this.admin.listUsers(search, limit ? Number.parseInt(limit, 10) : 50);
  }

  @Patch("users/:publicId/status")
  setUserStatus(
    @CurrentAuth() auth: JwtPayload,
    @Param("publicId") publicId: string,
    @Body() dto: SetUserStatusDto,
    @Ip() ip: string,
  ) {
    return this.admin.setUserStatus({ id: auth.sub, role: auth.role }, publicId, dto.status, ip);
  }

  @Post("users/:publicId/grant")
  grant(
    @CurrentAuth() auth: JwtPayload,
    @Param("publicId") publicId: string,
    @Body() dto: GrantDto,
    @Ip() ip: string,
  ) {
    return this.admin.grantBoyia(
      { id: auth.sub, role: auth.role },
      publicId,
      dto.amount,
      dto.reason,
      ip,
    );
  }

  @Get("transactions")
  transactions(@Query("limit") limit?: string) {
    return this.admin.listTransactions(limit ? Number.parseInt(limit, 10) : 50);
  }

  @Post("transactions/:id/reverse")
  reverse(
    @CurrentAuth() auth: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ReverseDto,
    @Ip() ip: string,
  ) {
    return this.admin.reverseTransaction({ id: auth.sub, role: auth.role }, id, dto.reason, ip);
  }

  @Get("reward-rules")
  rewardRules() {
    return this.admin.listRewardRules();
  }

  @Post("reward-rules")
  createRewardRule(
    @CurrentAuth() auth: JwtPayload,
    @Body() dto: CreateRewardRuleDto,
    @Ip() ip: string,
  ) {
    return this.admin.createRewardRule({ id: auth.sub, role: auth.role }, dto, ip);
  }

  @Patch("reward-rules/:id/status")
  setRuleStatus(
    @CurrentAuth() auth: JwtPayload,
    @Param("id") id: string,
    @Body() dto: SetRuleStatusDto,
    @Ip() ip: string,
  ) {
    return this.admin.setRewardRuleStatus({ id: auth.sub, role: auth.role }, id, dto.status, ip);
  }

  @Get("audit-logs")
  auditLogs(@Query("limit") limit?: string) {
    return this.admin.auditLogs(limit ? Number.parseInt(limit, 10) : 100);
  }
}
