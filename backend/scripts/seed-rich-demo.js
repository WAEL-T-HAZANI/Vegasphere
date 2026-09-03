/**
 * Wipe DB and seed rich bilingual demo data.
 * Local: node scripts/seed-rich-demo.js
 * Belmo/Atlas: uses MONGO_URI + MONGO_DB_NAME from env (already set on Belmo).
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
  override: false,
});

const connectDB = require("../database.js");
const { runSeedRichDemo } = require("../services/seed-rich-demo.service.js");

async function main() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/vegasphere";
  const dbName = process.env.MONGO_DB_NAME || (uri.includes("mongodb+srv") ? "Vegasphere" : "vegasphere");
  console.log(`Target: ${uri.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")} (db: ${dbName})`);
  await connectDB();
  const result = await runSeedRichDemo();
  console.log("\n✅ Done:", result);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
