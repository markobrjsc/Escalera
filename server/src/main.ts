import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CLIENT_ORIGIN ?? false,
    credentials: true
  });
  await app.listen(Number(process.env.PORT ?? 3000), "0.0.0.0");
}

void bootstrap();
