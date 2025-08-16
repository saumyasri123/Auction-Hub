import dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { readFileSync } from "fs";

console.log("Setting up database tables...");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

try {
  console.log("Reading setup-database.sql file...");
  const sql = readFileSync('./setup-database.sql', 'utf8');
  
  console.log("Connecting to database...");
  const client = await pool.connect();
  
  console.log("Executing SQL script...");
  await client.query(sql);
  
  console.log("Database tables created successfully!");
  
  client.release();
  await pool.end();
  
  console.log("✅ Database setup completed");
} catch (error) {
  console.error("❌ Database setup failed:", error.message);
  console.error("Error stack:", error.stack);
  process.exit(1);
}