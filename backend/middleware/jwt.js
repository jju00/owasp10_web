// backend/middleware/jwt.js

const crypto = require('crypto');

const DEV_SECRET = process.env.JWT_SECRET || 'dev-secret-only-for-lab';

// base64url 디코더
function b64urlDecode(str) {
  str = (str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad) str += '='.repeat(4 - pad);
  return Buffer.from(str, 'base64').toString('utf8');
}

// Bearer 토큰 추출
function extractBearer(req) {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// HS256 서명검증 (간단 구현)
function verifyHS256(headerB64, payloadB64, sigB64) {
  const data = `${headerB64}.${payloadB64}`;
  const expected = crypto.createHmac('sha256', DEV_SECRET).update(data).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return expected === sigB64;
}

module.exports = function vulnerableJwtMiddleware(req, res, next) {
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

  // A07 취약점 구현 - alg === 'none' 이면 서명 검증을 "건너뜀"
  if (header && header.alg === 'none') {
    // exp도 검사하지 않고 그대로 통과 (고의적 취약)
    req.user = payload;
    return next();
  }

  // 그 외에는 HS256만 받는다고 가정하고 간단 검증
  if (header.alg !== 'HS256') {
    return res.status(400).json({ error: 'unsupported alg' });
  }

  const ok = verifyHS256(hB64, pB64, sB64);
  if (!ok) return res.status(401).json({ error: 'bad signature' });

  // exp 검사 (HS256 경로만 최소한 체크)
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    return res.status(401).json({ error: 'expired' });
  }

  req.user = payload;
  next();
};
