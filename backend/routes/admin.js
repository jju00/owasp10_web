// backend/routes/admin.js
const express = require('express');
const path = require('path');
const { vulnerableJwtMiddleware, checkAdmin } = require('../middleware/jwt');
const router = express.Router();

// 관리자 전용 페이지 HTML 서빙
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'public', 'admin.html'));
});

// 관리자 전용 API 예시
router.get('/uploads', vulnerableJwtMiddleware, checkAdmin, (req, res) => {
  res.json({ secret: '관리자 전용 업로드 기능입니다.' });
});

module.exports = router;
