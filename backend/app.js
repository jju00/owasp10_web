// backend/app.js
const path = require('path');
const express = require('express');
const app = express();

app.set('etag', false); // ← 전역 ETag 제거 (조건부 요청/캐시 재검증 방지)

// 경로 통일
app.use('/frontend/public', express.static(path.join(__dirname, '..', 'frontend', 'public')));


// 서브라우터 분리 - 경로: routes/auth.js (로그인 처리)
const authRoutes = require('./routes/auth');

app.use(express.json());


// 정적파일 서빙
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// 페이지 라우팅: 프렌들리 URL 매핑
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// /board: 쿼리에 page/download 있으면 기존 API로 넘기고, 아니면 보드 목록 페이지 서빙
app.get('/board', (req, res, next) => {
  if (typeof req.query.page !== 'undefined' || typeof req.query.download !== 'undefined') {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'board.html'));
});

// 개별 게시글 페이지
app.get('/post', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'post.html'));
});

// 로그인 페이지
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'login.html'));
});

// 마이 페이지
app.get('/my', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'my.html'));
});

// API - api/auth 아래 라우트는 routes/auth.js로 넘김
// 관례상 엔드포인트 경로를 /api로 지정함
app.use('/api/auth', authRoutes);
// 프렌들리 경로도 지원: POST /login, GET /me
app.use('/', authRoutes);
// 프로세스 살아있나 헬스체크
app.get('/health', (_req, res) => res.json({ ok: true }));


// 에러 처리 미들웨어 - 일단은 모든 오류에 500 상태코드만 응답하도록
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'server error' });
});


// 보드 페이지 라우트 처리
const boardRoutes = require('./routes/board');
app.use('/board', boardRoutes);



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
