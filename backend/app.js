// backend/app.js
const path = require('path');
const express = require('express');
const app = express();
const { vulnerableJwtMiddleware,checkAdmin } = require('./middleware/jwt');

app.set('etag', false); // ← 전역 ETag 제거 (조건부 요청/캐시 재검증 방지)

// 경로 통일 (캐시 비활성화)
app.use('/frontend/public', express.static(path.join(__dirname, '..', 'frontend', 'public'), {
  etag: false,
  lastModified: false,
  cacheControl: false,
  setHeaders: (res) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
}));

// 서브라우터 분리 - 경로: routes/auth.js (로그인 처리)
const authRoutes = require('./routes/auth');

app.use(express.json());

// /admin 경로 처리
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes); 

// 정적파일 서빙 (캐시 비활성화)
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public'), {
  etag: false,
  lastModified: false,
  cacheControl: false,
  setHeaders: (res) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  }
}));

/**************  API 라우트 **************/
// 보드 API 라우트
const boardRoutes = require('./routes/board');
app.use('/api/board', boardRoutes); // /api/board (통합 엔드포인트)

// 프로필 API 라우트
const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes); // /api/profile/:userId

// AUTH API
app.use('/api/auth', authRoutes);
app.use('/', authRoutes); // POST /login, GET /me

// 헬스체크
app.get('/health', (_req, res) => res.json({ ok: true }));


/************** 페이지 라우팅: HTML 파일 서빙 **************/
// 캐시 방지 헤더 설정 함수
const noCacheHeaders = (res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
};

app.get('/', (_req, res) => {
  noCacheHeaders(res);
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

// 로그인 페이지
app.get('/login', (_req, res) => {
  noCacheHeaders(res);
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'login.html'));
});

// 프로필 페이지
app.get('/profile/:id', (_req, res) => {
  noCacheHeaders(res);
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'profile.html'));
});

// 개별 게시글 페이지 (post.html 서빙)
app.get('/post/:id', (_req, res) => {
  noCacheHeaders(res);
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'post.html'));
});

// /board 경로 처리 - board.html 서빙만 담당
app.get('/board', (req, res) => {
  noCacheHeaders(res);
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
