// backend/app.js
const path = require('path');
const express = require('express');
const app = express();

const authRoutes = require('./routes/auth');

app.use(express.json());

// 정적(원하면 사용)
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// API
app.use('/api/auth', authRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'server error' });
});

// db
const pool = require('./config/db');
app.get('/health/db', async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT NOW() AS now');
    conn.release();
    res.json({ ok: true, now: rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = app;
