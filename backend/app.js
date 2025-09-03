// backend/app.js
require('dotenv').config();
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// 바디 파서
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 사이트 서빙 (frontend/public 전체)
app.use(express.static(path.resolve(__dirname, '../frontend/public')));

// 헬스체크
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'dev' });
});

// 홈
app.get('/', (_req, res) => res.send('Hello, Express'));

// 서버 시작
app.listen(PORT, () => console.log(`${PORT} 번 포트에서 대기 중`));
