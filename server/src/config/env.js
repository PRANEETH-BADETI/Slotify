const path = require("path");
const dotenv = require("dotenv");

// Load env values from either the workspace root or the server folder.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/calendly_clone",
  defaultUsername: process.env.DEFAULT_USERNAME || "praneeth",
};

module.exports = { env };
