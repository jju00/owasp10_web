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

// API 라우트 먼저 처리 (우선순위 높음)
// 보드 API 라우트
const boardRoutes = require('./routes/board');
app.use('/api/board', boardRoutes); // /api/board (통합 엔드포인트)

// AUTH API
app.use('/api/auth', authRoutes);
app.use('/', authRoutes); // POST /login, GET /me

// 헬스체크
app.get('/health', (_req, res) => res.json({ ok: true }));

// 페이지 라우팅: HTML 파일 서빙
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// 로그인 페이지
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'login.html'));
});

// 마이 페이지
app.get('/my', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'my.html'));
});

// 개별 게시글 페이지 (post.html 서빙)
app.get('/post', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'post.html'));
});

// /board 경로 처리 - board.html 서빙만 담당
app.get('/board', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'board.html'));
});


// 에러 처리 미들웨어 - 일단은 모든 오류에 500 상태코드만 응답하도록
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
