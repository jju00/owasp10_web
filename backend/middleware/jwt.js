// backend/middlewares/auth.js
const crypto = require('crypto');
// jsonwebtoken은 쓰지 않고(secure 경로 분리 원할 때만 사용), 학습용 취약 검증을 직접 구현
// const jwt = require('jsonwebtoken'); // 안전한 검증 예시 - jwt 검증 라이브러리 사용 (alg=none 안 됨)

const DEV_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-lab';

// base64url → utf8
function b64urlDecode(str = '') {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Buffer.from(s + pad, 'base64').toString('utf8');
}

// Authorization: Bearer <token> 추출
function extractBearer(req) {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// HS256 서명 검증 (base64url 결과 비교)
function verifyHS256(headerB64, payloadB64, sigB64) {
  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto
    .createHmac('sha256', DEV_SECRET)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return expected === sigB64;
}

/**
 * 학습용 JWT 미들웨어 (A07: alg=none 우회 포함)
 * - header.alg === 'none' 이면 서명 검증/만료 확인을 생략(의도적 취약)
 * - 그 외에는 HS256만 허용하고 간단 검증
 */
function vulnerableJwtMiddleware(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: 'no token' });

  const parts = token.split('.');
  if (parts.length < 2) return res.status(400).json({ error: 'bad token format' });
  const [hB64, pB64, sB64 = ''] = parts;

  let header, payload;
  try {
    header = JSON.parse(b64urlDecode(hB64));
    payload = JSON.parse(b64urlDecode(pB64));
  } catch {
    return res.status(400).json({ error: 'bad jwt json' });
  }

  // 🚨 취약 경로: alg=none 이면 무조건 통과 (exp도 체크 안 함)
  if ((header?.alg || '').toLowerCase() === 'none') {
    req.user = payload;
    return next();
  }

  // HS256만 지원
  if (header.alg !== 'HS256') {
    return res.status(400).json({ error: 'unsupported alg' });
  }

  if (!sB64) return res.status(401).json({ error: 'missing signature' });

  const ok = verifyHS256(hB64, pB64, sB64);
  if (!ok) return res.status(401).json({ error: 'bad signature' });

  // 최소한의 exp 체크 (HS256 경로)
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    return res.status(401).json({ error: 'expired' });
  }

  req.user = payload;
  return next();
}

/**
 * 숫자 page(게시글 상세)일 때만 로그인 강제하는 래퍼 - 즉, db에 존재하는 유저만 게시글 볼 수 있음
 *  - LFI/RCE 데모는 익명 접근 허용 -> 로그인 하기 전에 lfi로 nagox라는 유저가 있다는 거 파악해야
 */
function requireLoginIfNumericPage(req, res, next) {
  const page = req.query.page;
  const isNumeric = /^\d+$/.test(String(page || ''));
  if (!isNumeric) return next();           // LFI 데모는 패스
  return vulnerableJwtMiddleware(req, res, next); // 상세글은 토큰 요구
}

module.exports = {
  vulnerableJwtMiddleware,
  requireLoginIfNumericPage
};
