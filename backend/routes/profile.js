// backend/routes/profile.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { vulnerableJwtMiddleware } = require('../middleware/jwt');

/**************** 프로필 API (IDOR 취약점) *****************/
// 유저 프로필 조회 (내 프로필 + 다른 유저 프로필 모두 통일)
// GET /api/profile/:userId
router.get('/:userId', vulnerableJwtMiddleware, async (req, res) => {
  const targetUserId = Number(req.params.userId);

  // 숫자가 아닌 경우
  if (isNaN(targetUserId)) {
    return res.status(400).json({ error: 'invalid user id' });
  }

  // IDOR 취약점: admin(id=1)은 조회 차단하지만, 다른 유저들은 자유롭게 조회 가능
  if (targetUserId === 1) {
    return res.status(403).json({ error: 'forbidden: cannot view admin profile' });
  }

  try {
    const conn = await pool.getConnection();
    
    try {
      const [rows] = await conn.query(
        'SELECT id, username, role FROM users WHERE id = ?',
        [targetUserId]
      );
      conn.release();

      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'user not found' });
      }

      // 취약점: 본인 확인 없이 다른 유저의 정보를 그대로 반환
      // 본인 프로필이든 다른 사람 프로필이든 구분 없이 모두 반환
      return res.json(rows[0]);
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

module.exports = router;
