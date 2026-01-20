const express = require("express");
const cors = require("cors");
const { createClient } = require("@libsql/client");

const app = express();
app.use(cors());
app.use(express.json());

// ==================
// TURSO CONNECTION
// ==================
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ==================
// MENU CRUD
// ==================

// GET ALL MENU
app.get("/menu", async (req, res) => {
  const result = await db.execute("SELECT * FROM menu");
  res.json(result.rows);
});

// GET MENU BY ID (EDIT)
app.get("/menu/:id", async (req, res) => {
  const { id } = req.params;

  const result = await db.execute({
    sql: "SELECT * FROM menu WHERE id = ?",
    args: [id],
  });

  res.json(result.rows[0]);
});

// CREATE MENU
app.post("/menu", async (req, res) => {
  const { nama_menu, harga, kategori } = req.body;

  await db.execute({
    sql: "INSERT INTO menu (nama_menu, harga, kategori) VALUES (?, ?, ?)",
    args: [nama_menu, harga, kategori],
  });

  res.json({ message: "Menu berhasil ditambahkan" });
});

// UPDATE MENU ✅
app.put("/menu/:id", async (req, res) => {
  const { id } = req.params;
  const { nama_menu, harga, kategori } = req.body;

  await db.execute({
    sql: `
      UPDATE menu
      SET nama_menu = ?, harga = ?, kategori = ?
      WHERE id = ?
    `,
    args: [nama_menu, harga, kategori, id],
  });

  res.json({ message: "Menu berhasil diupdate" });
});

// DELETE MENU ✅
app.delete("/menu/:id", async (req, res) => {
  const { id } = req.params;

  await db.execute({
    sql: "DELETE FROM menu WHERE id = ?",
    args: [id],
  });

  res.json({ message: "Menu berhasil dihapus" });
});

// ==================
// PESANAN CRUD
// ==================
app.get("/pesanan", async (req, res) => {
  const result = await db.execute("SELECT * FROM pesanan");
  res.json(result.rows);
});

app.post("/pesanan", async (req, res) => {
  const { nama_pelanggan, total_harga, detail_pesanan } = req.body;

  await db.execute({
    sql: `
      INSERT INTO pesanan (nama_pelanggan, total_harga, detail_pesanan)
      VALUES (?, ?, ?)
    `,
    args: [nama_pelanggan, total_harga, detail_pesanan],
  });

  res.json({ message: "Pesanan berhasil ditambahkan" });
});

app.delete("/pesanan/:id", async (req, res) => {
  const { id } = req.params;

  await db.execute({
    sql: "DELETE FROM pesanan WHERE id = ?",
    args: [id],
  });

  res.json({ message: "Pesanan berhasil dihapus" });
});

// ==================
// PEMBAYARAN CRUD
// ==================
app.get("/pembayaran", async (req, res) => {
  const result = await db.execute("SELECT * FROM pembayaran");
  res.json(result.rows);
});

app.post("/pembayaran", async (req, res) => {
  const { pesanan_id, nama_pelanggan, total_harga, metode } = req.body;

  await db.execute({
    sql: `
      INSERT INTO pembayaran
      (pesanan_id, nama_pelanggan, total_harga, metode)
      VALUES (?, ?, ?, ?)
    `,
    args: [pesanan_id, nama_pelanggan, total_harga, metode],
  });

  res.json({ message: "Pembayaran berhasil disimpan" });
});

app.put("/pembayaran/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await db.execute({
    sql: "UPDATE pembayaran SET status = ? WHERE id = ?",
    args: [status, id],
  });

  res.json({ message: "Status pembayaran diupdate" });
});

// ==================
// LOGIN
// ==================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ? AND password = ?",
    args: [email, password],
  });

  if (result.rows.length === 0) {
    return res.status(401).json({ message: "Login gagal" });
  }

  res.json({
    message: "Login berhasil",
    user: result.rows[0],
  });
});

// ==================
// EXPORT APP (NO PORT)
// ==================
module.exports = app;
