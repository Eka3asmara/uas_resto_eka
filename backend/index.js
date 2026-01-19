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
const turso = axios.create({
  baseURL: process.env.TURSO_DATABASE_URL.trim().replace(
    "libsql://",
    "https://",
  ),
  headers: {
    Authorization: `Bearer ${process.env.TURSO_AUTH_TOKEN.trim()}`,
    "Content-Type": "application/json",
  },
});

// --- FUNGSI EKSEKUSI DATABASE ---
async function dbExecute(sql, args = []) {
  try {
    const mappedArgs = args.map((arg) => {
      if (typeof arg === "number")
        return { type: "integer", value: arg.toString() };
      return { type: "text", value: arg.toString() };
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

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Sesi Habis" });
    req.user = user;
    next();
  });
};

// --- API AUTH: LOGIN ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await dbExecute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Email tidak terdaftar!" });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Password salah!" });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Kesalahan server" });
  }
});

// --- API KHUSUS POSTMAN: UPDATE PASSWORD ---
app.put("/api/update-password", async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPW = await bcrypt.hash(newPassword, salt);
    await dbExecute("UPDATE users SET password = ? WHERE email = ?", [
      hashedPW,
      email,
    ]);
    res.json({ message: `Password ${email} berhasil diperbarui!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- API DASHBOARD: STATS ---
app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const m = await dbExecute("SELECT COUNT(*) as total FROM menu");
    const p = await dbExecute("SELECT COUNT(*) as total FROM pesanan");
    const d = await dbExecute(
      "SELECT SUM(total_harga) as total FROM pembayaran WHERE status = 'lunas'",
    );
    res.json({
      menu: m.rows[0].total || 0,
      pesanan: p.rows[0].total || 0,
      pendapatan: d.rows[0].total || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- API MENU: CRUD ---
app.get("/api/menu", async (req, res) => {
  const { rows } = await dbExecute("SELECT * FROM menu ORDER BY id DESC");
  res.json(rows);
});

app.post("/api/menu", authenticateToken, async (req, res) => {
  const { nama_menu, harga, kategori } = req.body;
  await dbExecute(
    "INSERT INTO menu (nama_menu, harga, kategori) VALUES (?, ?, ?)",
    [nama_menu, parseInt(harga), kategori],
  );
  res.json({ message: "Menu Ditambah" });
});

app.put("/api/menu/:id", authenticateToken, async (req, res) => {
  const { nama_menu, harga, kategori } = req.body;
  await dbExecute(
    "UPDATE menu SET nama_menu=?, harga=?, kategori=? WHERE id=?",
    [nama_menu, parseInt(harga), kategori, parseInt(req.params.id)],
  );
  res.json({ message: "Menu Diupdate" });
});

app.delete("/api/menu/:id", authenticateToken, async (req, res) => {
  await dbExecute("DELETE FROM menu WHERE id=?", [parseInt(req.params.id)]);
  res.json({ message: "Menu Dihapus" });
});

// --- API PESANAN (FIXED: CRUD) ---
app.get("/api/pesanan", authenticateToken, async (req, res) => {
  const { rows } = await dbExecute("SELECT * FROM pesanan ORDER BY id DESC");
  res.json(rows);
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
      "INSERT INTO pembayaran (pesanan_id, nama_pelanggan, total_harga) VALUES (?, ?, ?)",
      [newId, nama_pelanggan, parseInt(total_harga)],
    );
    res.json({ message: "Ok" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EDIT PESANAN (Memperbarui tabel pesanan & pembayaran sekaligus)
app.put("/api/pesanan/:id", authenticateToken, async (req, res) => {
  const { nama_pelanggan, total_harga, detail_pesanan } = req.body;
  const id = parseInt(req.params.id);
  try {
    await dbExecute(
      "UPDATE pesanan SET nama_pelanggan=?, total_harga=?, detail_pesanan=? WHERE id=?",
      [nama_pelanggan, parseInt(total_harga), detail_pesanan, id],
    );
    await dbExecute(
      "UPDATE pembayaran SET nama_pelanggan=?, total_harga=? WHERE pesanan_id=?",
      [nama_pelanggan, parseInt(total_harga), id],
    );
    res.json({ message: "Pesanan Diupdate" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HAPUS PESANAN (Menghapus tabel pesanan & pembayaran sekaligus)
app.delete("/api/pesanan/:id", authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await dbExecute("DELETE FROM pesanan WHERE id=?", [id]);
    await dbExecute("DELETE FROM pembayaran WHERE pesanan_id=?", [id]);
    res.json({ message: "Pesanan Dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
