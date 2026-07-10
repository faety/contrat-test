import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuditLog } from "../entities";

/** Journal d'audit : toutes les actions administratives sont tracées (règle 18, §25). */
@Injectable()
export class AuditService {
  constructor(private readonly dataSource: DataSource) {}

  async log(input: {
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    await this.dataSource.manager.save(
      this.dataSource.manager.create(AuditLog, {
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details ?? null,
        ipAddress: input.ipAddress ?? null,
      }),
    );
  }

  async list(limit = 100): Promise<AuditLog[]> {
    return this.dataSource.manager.find(AuditLog, {
      order: { createdAt: "DESC" },
      take: Math.min(limit, 200),
    });
  }
}
