import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { WalletService } from "./wallet.service";
import { CurrentAuth, JwtAuthGuard } from "../auth/guards";
import type { JwtPayload } from "../auth/auth.service";

class TransferDto {
  /** Téléphone ou nom d'utilisateur du destinataire. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  recipient: string;

  @IsInt()
  @Min(1)
  @Max(1_000_000)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  note?: string;
}

@Controller("v1/wallet")
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get("balances")
  balances(@CurrentAuth() auth: JwtPayload) {
    return this.wallet.getBalances(auth.sub);
  }

  @Get("transactions")
  transactions(@CurrentAuth() auth: JwtPayload, @Query("limit") limit?: string) {
    return this.wallet.getTransactions(auth.sub, limit ? Number.parseInt(limit, 10) : 50);
  }

  @Post("transfers")
  transfer(
    @CurrentAuth() auth: JwtPayload,
    @Body() dto: TransferDto,
    // Clé d'idempotence obligatoire pour éviter les doubles transactions (règle 11).
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.wallet.transferByIdentifier({
      senderUserId: auth.sub,
      recipient: dto.recipient,
      amount: dto.amount,
      note: dto.note,
      idempotencyKey,
    });
  }
}
