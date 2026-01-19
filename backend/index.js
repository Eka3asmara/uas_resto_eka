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

// --- FUNGSI EKSEKUSI DATABASE ---
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

// --- MIDDLEWARE PROTEKSI ---
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

// 1. Route Utama Check Server
app.get("/", (req, res) => {
  res.json({
    message: "Server Eka Resto Online",
    status: "Ready",
    db_status: tursoUrl ? "Configured" : "Missing URL",
  });
});

// 2. Auth Route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await dbExecute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Email tidak terdaftar!" });

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) return res.status(401).json({ message: "Password salah!" });

    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" },
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Kesalahan server" });
  }
});

// 3. Dashboard Stats Route (PENTING AGAR TIDAK 0)
app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const menuCount = await dbExecute("SELECT COUNT(*) as total FROM menu");
    const pesananCount = await dbExecute(
      "SELECT COUNT(*) as total FROM pesanan",
    );
    const pendapatanSum = await dbExecute(
      "SELECT SUM(total_harga) as total FROM pembayaran WHERE status = 'lunas'",
    );

    res.json({
      totalMenu: menuCount.rows[0].total || 0,
      totalPesanan: pesananCount.rows[0].total || 0,
      totalPendapatan: pendapatanSum.rows[0].total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Menu Routes
app.get("/api/menu", async (req, res) => {
  try {
    const { rows } = await dbExecute("SELECT * FROM menu ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/menu", authenticateToken, async (req, res) => {
  const { nama_menu, harga, kategori } = req.body;
  try {
    await dbExecute(
      "INSERT INTO menu (nama_menu, harga, kategori) VALUES (?, ?, ?)",
      [nama_menu, parseInt(harga), kategori],
    );
    res.json({ message: "Menu Ditambah" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/menu/:id", authenticateToken, async (req, res) => {
  const { nama_menu, harga, kategori } = req.body;
  try {
    await dbExecute(
      "UPDATE menu SET nama_menu=?, harga=?, kategori=? WHERE id=?",
      [nama_menu, parseInt(harga), kategori, parseInt(req.params.id)],
    );
    res.json({ message: "Menu Diperbarui" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/menu/:id", authenticateToken, async (req, res) => {
  try {
    await dbExecute("DELETE FROM menu WHERE id = ?", [parseInt(req.params.id)]);
    res.json({ message: "Menu Dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Pesanan Routes
app.get("/api/pesanan", authenticateToken, async (req, res) => {
  try {
    const { rows } = await dbExecute("SELECT * FROM pesanan ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/pesanan", authenticateToken, async (req, res) => {
  const { nama_pelanggan, total_harga, detail_pesanan } = req.body;
  try {
    const result = await dbExecute(
      "INSERT INTO pesanan (nama_pelanggan, total_harga, detail_pesanan) VALUES (?, ?, ?) RETURNING id",
      [nama_pelanggan, parseInt(total_harga), detail_pesanan],
    );
    const newId = result.rows[0].id;
    await dbExecute(
      "INSERT INTO pembayaran (pesanan_id, nama_pelanggan, total_harga, status) VALUES (?, ?, ?, ?)",
      [newId, nama_pelanggan, parseInt(total_harga), "pending"],
    );
    res.json({ message: "Pesanan Berhasil" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Pembayaran Routes
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
    res.json({ message: "Pembayaran Diperbarui" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPORT UNTUK VERCEL ---
module.exports = app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
}
