// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/db');
const { vulnerableJwtMiddleware } = require('../middleware/jwt');

// secret 키 설정 후 env에 정의 필요. 현재는 JWT_SECRET이 dev-secret-only-for-lab로 저장되어 있음.
const DEV_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-lab';

// jwt 발급 함수
function signHS256(payload) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = crypto.createHmac('sha256', DEV_SECRET).update(`${h}.${p}`).digest('base64url');    // 헤더.페이로드 + secret key를 hs256으로 해시 후 base64
  return `${h}.${p}.${s}`;
}

/* ======= 고의취약 SQLi: 문자열 연결로 로그인 ======== */
// login 엔드포인트로 post 요청이 올 시 동작 (서브 라우트). 즉, 로그인 요청 처리
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
      return res.json({ token, user }); // 를 통해 클라에게 jwt 토큰 발급
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

// 토큰 검증 확인용 - /me로 get 요청이 오면 처리
router.get('/me', vulnerableJwtMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
