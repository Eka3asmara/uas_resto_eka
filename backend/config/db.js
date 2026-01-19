const { createClient } = require("@libsql/client/web"); // Pastikan ada /web
require("dotenv").config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

module.exports = db;
