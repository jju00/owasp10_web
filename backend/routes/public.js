// 🚨 학습용 LFI 취약 라우트: file 파라미터를 검증 없이 읽음
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// "정상" 의도: public/pages 밑의 정적 하위 페이지만 보여주려는 척
const BASE = path.join(__dirname, '..', '..', 'frontend', 'public', 'pages');

router.get('/page', (req, res) => {
  const file = String(req.query.file || 'pages/about.html'); // ex) pages/news.html
  // ❌ 취약점: 경계 검증 없이 join → ../../.. 트래버설 가능
  const target = path.join(BASE, file);

  try {
    const data = fs.readFileSync(target, 'utf8');  // 바이너리면 fs.readFileSync(target)
    // 간단히 유형 추정(데모): 확장자 .html이면 text/html, 아니면 text/plain
    if (/\.(html?|htm)$/i.test(file)) res.type('text/html').send(data);
    else res.type('text/plain').send(data);
  } catch (e) {
    res.status(404).type('text/plain').send('Not found');
  }
});

module.exports = router;