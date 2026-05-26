import "dotenv/config";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

try {
  const parsed = new URL(url);
  const hasSsl = parsed.searchParams.get("sslmode") === "require";

  const masked = `postgresql://${parsed.username || "USER"}:****@${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname || "/DB"}${hasSsl ? "?sslmode=require" : ""}`;

  console.log("DATABASE_URL format checks:");
  console.log("- protocol postgresql://:", parsed.protocol === "postgresql:" ? "OK" : "FAIL");
  console.log("- username:", parsed.username ? "OK" : "FAIL");
  console.log("- password:", parsed.password ? "OK (set)" : "FAIL");
  console.log("- host:", parsed.hostname || "FAIL");
  console.log("- database:", parsed.pathname?.slice(1) || "FAIL");
  console.log("- sslmode=require:", hasSsl ? "OK" : "FAIL");
  console.log("Masked URL:", masked);
  console.log("JWT_SECRET:", process.env.JWT_SECRET ? "OK (set)" : "MISSING");
} catch {
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}
