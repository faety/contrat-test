import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { AppModule } from "./app.module";
import { config } from "./config";
import { seedIfEmpty } from "./seed";

async function bootstrap(): Promise<void> {
  if (config.dbDriver === "sqlite") {
    mkdirSync(dirname(config.dbPath), { recursive: true });
  }

  const app = await NestFactory.create(AppModule);

  // Validation stricte de toutes les entrées (règle 6).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableCors({ origin: config.corsOrigin.split(","), credentials: false });

  // Documentation OpenAPI (§30.3).
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Boyia API")
      .setDescription(
        "API de la plateforme Boyia — unité numérique interne en circuit fermé, registre comptable à double entrée.",
      )
      .setVersion("0.1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("docs", app, doc);

  await seedIfEmpty(app);

  await app.listen(config.port);
  // eslint-disable-next-line no-console
  console.log(`Boyia API prête sur http://localhost:${config.port} (docs : /docs)`);
}

void bootstrap();
