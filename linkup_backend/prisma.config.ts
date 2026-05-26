// Prisma 7: database URL lives here (not in schema.prisma — url in schema is unsupported).
// Ensure .env has DATABASE_URL with ?sslmode=require (Neon direct connection recommended for migrate).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
