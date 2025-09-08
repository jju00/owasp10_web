// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/db');
const jwtGuard = require('../middleware/jwt');

const DEV_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-lab';
function signHS256(payload) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = crypto.createHmac('sha256', DEV_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}

/**
 * 🚨 고의취약 SQLi: 문자열 연결로 로그인
 * 예) username=nagox, password=' OR '1'='1
 */
router.post('/login', async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const sql = `
    SELECT id, username, role
    FROM users
    WHERE username='${username}' AND password='${password}'
    LIMIT 1
  `;
  try {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(sql); // 바인딩 없이 그대로 → SQLi 허용
      conn.release();
      if (!rows || rows.length === 0) return res.status(401).json({ error: 'invalid credentials' });

      const user = rows[0];
      const token = signHS256({
        id: user.id, username: user.username, role: user.role,
        exp: Math.floor(Date.now()/1000) + 10*60
      });
      return res.json({ token, user });
    } catch (e) {
      conn.release();
      console.error(e);
      return res.status(500).json({ error: 'db error' });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'db connection error' });
  }
});

// 토큰 검증 확인용
router.get('/me', jwtGuard, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
