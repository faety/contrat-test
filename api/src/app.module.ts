import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ALL_ENTITIES } from "./entities";
import { config } from "./config";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { JwtAuthGuard, RolesGuard } from "./auth/guards";
import { LedgerService } from "./ledger/ledger.service";
import { TransactionsService } from "./ledger/transactions.service";
import { WalletController } from "./wallet/wallet.controller";
import { WalletService } from "./wallet/wallet.service";
import { AdminController } from "./admin/admin.controller";
import { AdminService } from "./admin/admin.service";
import { AuditService } from "./audit/audit.service";

/**
 * Monolithe modulaire (§30.1) : auth, portefeuille, registre, administration.
 * SQLite en démo, PostgreSQL en production (même schéma TypeORM). En
 * production, remplacer synchronize par des migrations versionnées (§44).
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(
      config.dbDriver === "postgres" && config.databaseUrl
        ? {
            type: "postgres",
            url: config.databaseUrl,
            entities: ALL_ENTITIES,
            synchronize: !config.isProduction,
          }
        : {
            type: "better-sqlite3",
            database: config.dbPath,
            entities: ALL_ENTITIES,
            synchronize: true,
          },
    ),
    JwtModule.register({ global: true, secret: config.jwtSecret }),
  ],
  controllers: [AuthController, WalletController, AdminController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    LedgerService,
    TransactionsService,
    WalletService,
    AdminService,
    AuditService,
  ],
})
export class AppModule {}
