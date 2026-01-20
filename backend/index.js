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

// FIXED: Fungsi ini sekarang mengembalikan lastInsertRowid
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
      lastInsertRowid: result.last_insert_rowid, // Penting untuk tabel pembayaran
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

app.get("/", (req, res) => res.json({ message: "Ready", status: "Online" }));

// AUTH (Login tetap sama)
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

// STATS
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

app.get("/api/pesanan", authenticateToken, async (req, res) => {
  try {
    const { rows } = await dbExecute("SELECT * FROM pesanan ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pesanan", authenticateToken, async (req, res) => {
  // Pastikan nama variabel sesuai dengan data yang dikirim Frontend
  const { nama_pelanggan, total_harga, detail_pesanan } = req.body;

  try {
    // 1. Simpan ke tabel pesanan (Hapus RETURNING id agar tidak konflik)
    const result = await dbExecute(
      "INSERT INTO pesanan (nama_pelanggan, total_harga, detail_pesanan) VALUES (?, ?, ?)",
      [nama_pelanggan, parseInt(total_harga), detail_pesanan],
    );

    // 2. Ambil ID dari lastInsertRowid yang sudah kita perbaiki di dbExecute
    const newId = result.lastInsertRowid;

    // 3. Simpan ke tabel pembayaran menggunakan ID tersebut
    await dbExecute(
      "INSERT INTO pembayaran (pesanan_id, nama_pelanggan, total_harga, metode, status) VALUES (?, ?, ?, ?, ?)",
      [
        parseInt(newId),
        nama_pelanggan,
        parseInt(total_harga),
        "cash",
        "pending",
      ],
    );

    res.json({ message: "Ok", id: newId });
  } catch (err) {
    console.error("❌ Error Simpan Pesanan:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/pembayaran", authenticateToken, async (req, res) => {
  try {
    const { rows } = await dbExecute(
      "SELECT * FROM pembayaran ORDER BY id DESC",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/pembayaran/:id", authenticateToken, async (req, res) => {
  const { metode, status } = req.body;
  try {
    await dbExecute("UPDATE pembayaran SET metode=?, status=? WHERE id=?", [
      metode,
      status,
      parseInt(req.params.id),
    ]);
    res.json({ message: "Ok" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
