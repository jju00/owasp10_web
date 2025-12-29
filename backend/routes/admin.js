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

// backend/routes/admin.js (추가)
router.post('/banner', vulnerableJwtMiddleware, checkAdmin, express.json(), (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid image URL' });
  }

  // SSRF 유도: 외부에서 입력받은 URL을 내부에서 요청
  fetch(url)
    .then(r => r.arrayBuffer())  // 단순히 요청만 보냄
    .then(() => {
      // 서버에서 index.html에 표시할 URL 저장 (단순 저장용)
      fs.writeFileSync(path.join(__dirname, '..', 'data', 'banner.txt'), url);
      res.json({ success: true });
    })
    .catch(() => {
      res.status(500).json({ error: 'Failed to fetch the image URL' });
    });
});


module.exports = router;
