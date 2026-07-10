import { Body, Controller, Post } from "@nestjs/common";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from "class-validator";
import { AuthService } from "./auth.service";

class RegisterDto {
  @IsString()
  @Matches(/^\+?[\d\s.-]{8,20}$/)
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  lastName: string;

  @IsString()
  @Matches(/^\d{4,6}$/)
  pin: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsIn(["fr", "en"])
  preferredLanguage?: string;
}

class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}

class LoginDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @Matches(/^\d{4,6}$/)
  pin: string;
}

class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 128)
  password: string;
}

class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

@Controller("v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("verify-otp")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phoneNumber, dto.code);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.phoneNumber, dto.pin);
  }

  @Post("admin/login")
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.email, dto.password);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }
}
