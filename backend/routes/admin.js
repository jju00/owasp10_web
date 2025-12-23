// backend/routes/admin.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { vulnerableJwtMiddleware, checkAdmin } = require('../middleware/jwt');
const router = express.Router();
const uploadsDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'assets', 'uploads');

// 관리자 전용 페이지 HTML 서빙
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'public', 'admin.html'));
});

// 관리자 전용 API 예시
router.get('/uploads', vulnerableJwtMiddleware, checkAdmin, (req, res) => {
  res.json({ secret: '관리자 전용 업로드 기능입니다.' });
});

router.get('/uploads/list', vulnerableJwtMiddleware, checkAdmin, (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) return res.status(500).json({ error: '파일 목록 읽기 실패' });

    const images = files.filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    res.json(images);
  });
});

module.exports = router;
