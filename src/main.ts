import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:3101").split(",").map((origin) => origin.trim()),
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(`CyberJob Admin API: http://localhost:${port}/api/v1`);
}

void bootstrap();
