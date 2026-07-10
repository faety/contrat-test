import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { type Express } from "express";
import { AppModule } from "./app.module";
import { seedIfEmpty } from "./seed";

/**
 * Point d'entrée serverless (Vercel) : instancie Nest une seule fois par
 * instance de fonction et renvoie le handler Express sous-jacent.
 *
 * Environnement de DÉMONSTRATION uniquement : la base SQLite vit dans /tmp
 * (éphémère) et est reseedée à chaque démarrage à froid. En production
 * réelle, utiliser PostgreSQL managé (§30.4) et un déploiement persistant.
 */
export async function createHandler(): Promise<Express> {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Démo publique : jetons Bearer sans cookies, l'origine est reflétée.
  app.enableCors({ origin: true, credentials: false });
  await seedIfEmpty(app);
  await app.init();
  return server;
}
