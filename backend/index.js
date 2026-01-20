require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

// --- KONFIGURASI TURSO ---
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim().replace(
  "libsql://",
  "https://",
);
const tursoToken = process.env.TURSO_AUTH_TOKEN?.trim();

const turso = axios.create({
  baseURL: tursoUrl,
  headers: {
    Authorization: `Bearer ${tursoToken}`,
    "Content-Type": "application/json",
  },
});

async function dbExecute(sql, args = []) {
  try {
    const mappedArgs = args.map((arg) => {
      if (typeof arg === "number")
        return { type: "integer", value: arg.toString() };
      return { type: "text", value: arg?.toString() || "" };
    });
    const response = await turso.post("/v2/pipeline", {
      requests: [
        { type: "execute", stmt: { sql, args: mappedArgs } },
        { type: "close" },
      ],
    });
    const resultResponse = response.data.results[0];
    if (resultResponse.type === "error")
      throw new Error(resultResponse.error.message);
    const result = resultResponse.response.result;
    return {
      rows: result.rows.map((row) => {
        let obj = {};
        result.cols.forEach((col, i) => {
          obj[col.name] = row[i].value;
        });
        return obj;
      }),
    };
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    throw error;
  }
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Akses Ditolak" });
  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, user) => {
    if (err) return res.status(403).json({ message: "Sesi Habis" });
    req.user = user;
    next();
  });
};

// --- ROUTES ---

app.get("/", (req, res) => res.json({ message: "Ready" }));

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await dbExecute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Email salah" });
    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) return res.status(401).json({ message: "Password salah" });
    const token = jwt.sign(
      { id: rows[0].id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" },
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ROUTE STATS DENGAN PROTEKSI ANGKA 0
app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const m = await dbExecute("SELECT COUNT(*) as total FROM menu");
    const p = await dbExecute("SELECT COUNT(*) as total FROM pesanan");
    const d = await dbExecute(
      "SELECT SUM(total_harga) as total FROM pembayaran WHERE status = 'lunas'",
    );

    res.json({
      totalMenu: Number(m.rows[0]?.total) || 0,
      totalPesanan: Number(p.rows[0]?.total) || 0,
      totalPendapatan: Number(d.rows[0]?.total) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TAMBAHKAN INI ---
app.get("/api/pesanan", authenticateToken, async (req, res) => {
  try {
    const { rows } = await dbExecute("SELECT * FROM pesanan ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/pesanan", authenticateToken, async (req, res) => {
  const { customer_name, items, total_harga } = req.body;
  try {
    // Logika simpan pesanan Anda di sini
    await dbExecute(
      "INSERT INTO pesanan (customer_name, items, total_harga) VALUES (?, ?, ?)",
      [customer_name, JSON.stringify(items), total_harga],
    );
    res.json({ message: "Pesanan berhasil dibuat" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// --------------------
app.get("/api/pembayaran", authenticateToken, async (req, res) => {
  const { rows } = await dbExecute("SELECT * FROM pembayaran ORDER BY id DESC");
  res.json(rows);
});

app.put("/api/pembayaran/:id", authenticateToken, async (req, res) => {
  const { metode, status } = req.body;
  await dbExecute("UPDATE pembayaran SET metode=?, status=? WHERE id=?", [
    metode,
    status,
    parseInt(req.params.id),
  ]);
  res.json({ message: "Ok" });
});

module.exports = app;
