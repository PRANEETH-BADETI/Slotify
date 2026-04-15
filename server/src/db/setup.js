const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function run() {
  const schemaPath = path.resolve(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  try {
    await pool.query(schemaSql);
    console.log("Database schema created successfully.");
    await require("./seed")();
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Failed to set up the database.");
  console.error(error);
  process.exit(1);
});
