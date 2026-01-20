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

app.get("/", (req, res) => res.json({ message: "Ready", status: "Online" }));

// AUTH
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

/// PESANAN (FIXED: Menangani Nama Kolom & Route Update)
app.get("/api/pesanan", authenticateToken, async (req, res) => {
  try {
    const { rows } = await dbExecute("SELECT * FROM pesanan ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/pesanan", authenticateToken, async (req, res) => {
  // Pastikan nama variabel dari req.body sesuai dengan yang dikirim Frontend
  const { customer_name, items, total_harga } = req.body;
  try {
    const itemsStr = typeof items === "string" ? items : JSON.stringify(items);

    // SESUAI SKEMA ANDA: nama_pelanggan dan detail_pesanan
    const result = await dbExecute(
      "INSERT INTO pesanan (nama_pelanggan, detail_pesanan, total_harga) VALUES (?, ?, ?)",
      [customer_name, itemsStr, parseInt(total_harga)],
    );

    // Otomatis buat data pembayaran
    try {
      await dbExecute(
        "INSERT INTO pembayaran (pesanan_id, nama_pelanggan, total_harga, status, metode) VALUES (?, ?, ?, ?, ?)",
        [
          result.lastInsertRowid,
          customer_name,
          parseInt(total_harga),
          "pending",
          "cash",
        ],
      );
    } catch (payErr) {
      console.error("Gagal buat pembayaran otomatis:", payErr.message);
    }

    res.json({ message: "Ok" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ROUTE BARU: Menangani Update Pesanan agar tidak Error 404
app.put("/api/pesanan/:id", authenticateToken, async (req, res) => {
  const { customer_name, items, total_harga } = req.body;
  try {
    const itemsStr = typeof items === "string" ? items : JSON.stringify(items);

    await dbExecute(
      "UPDATE pesanan SET nama_pelanggan=?, detail_pesanan=?, total_harga=? WHERE id=?",
      [customer_name, itemsStr, parseInt(total_harga), parseInt(req.params.id)],
    );
    res.json({ message: "Ok" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/pesanan/:id", authenticateToken, async (req, res) => {
  try {
    await dbExecute("DELETE FROM pesanan WHERE id = ?", [
      parseInt(req.params.id),
    ]);
    res.json({ message: "Ok" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PEMBAYARAN (GET, PUT, DELETE)
app.get("/api/pembayaran", authenticateToken, async (req, res) => {
  try {
    const { rows } = await dbExecute(
      "SELECT * FROM pembayaran ORDER BY id DESC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/pembayaran/:id", authenticateToken, async (req, res) => {
  try {
    await dbExecute("DELETE FROM pembayaran WHERE id = ?", [
      parseInt(req.params.id),
    ]);
    res.json({ message: "Ok" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
