// /assets/js/auth.js

// === CSRF 토큰 ===
function getCsrfToken() {
  const m = document.querySelector('meta[name="csrf-token"]');
  return m ? m.getAttribute('content') : null; // 나중에 서버가 실제 토큰으로 교체
}

// === JWT Bearer 토큰 (로컬 저장: 데모용; 실제는 HttpOnly 쿠키 권장) ===
const LS_JWT = 'jwt_token';

function setToken(token) {
  localStorage.setItem(LS_JWT, token);
}

function getToken() {
  return localStorage.getItem(LS_JWT);
}

function clearToken() {
  localStorage.removeItem(LS_JWT);
}

// === 공통 fetch(JSON) ===
async function postJSON(url, data) {
  const headers = { 'Content-Type': 'application/json' };
  const csrf = getCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const jwt = getToken();
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    credentials: 'include', // 쿠키 기반 세션 병행 시
  });

  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!res.ok) {
    const msg = body && body.error ? body.error : '요청 실패';
    throw new Error(msg);
  }
  return body;
}

async function getJSON(url) {
  const headers = {};
  const csrf = getCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const jwt = getToken();
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const res = await fetch(url, { headers, credentials: 'include' });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!res.ok) {
    const msg = body && body.error ? body.error : '요청 실패';
    throw new Error(msg);
  }
  return body;
}

// 로그인 폼 바인딩
function bindAuthForm(form, { endpoint, onSuccess, onError }) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = '처리 중...';
    try {
      const session = await postJSON(endpoint, payload);
      onSuccess && onSuccess(session);
    } catch (err) {
      onError && onError(err.message);
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });
}

// 현재 사용자 가져오기 (JWT 검증 통과 시)
async function getMe() {
  return getJSON('/api/auth/me');
}

// 브라우저에서 이름만 랙돌.png로 다운받아지는 문제 (idor 시)
// === Content-Disposition filename 파서 ===
function parseFilenameFromCD(cd = '') {
  const m1 = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (m1) return decodeURIComponent(m1[1]);
  const m2 = cd.match(/filename="([^"]+)"/i) || cd.match(/filename=([^;]+)/i);
  return m2 ? m2[1] : null;
}

// 위험한 문자/경로 제거 (윈도우 등 호환)
function safeFilename(name = 'file.bin') {
  return name.replace(/[\\\/:*?"<>|]+/g, '_').split('/').pop().slice(0, 200);
}

// === JWT로 보호된 파일 다운로드(서버가 준 파일명 우선) ===
async function downloadWithAuth(url, fallback) {
  const token = (window.getToken && window.getToken()) || null;
  if (!token) {
    const here = encodeURIComponent(location.pathname + location.search);
    location.assign(`/frontend/public/login.html?returnTo=${here}`);
    return;
  }

  const headers = { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` };

  // 캐시버스터 부착
  const sep = url.includes('?') ? '&' : '?';
  const finalUrl = `${url}${sep}_cb=${Date.now()}`;

  const res = await fetch(finalUrl, { headers, credentials: 'include', cache: 'no-store' });
  if (res.status === 401 || res.status === 403) {
    const here = encodeURIComponent(location.pathname + location.search);
    location.assign(`/frontend/public/login.html?returnTo=${here}`);
    return;
  }
  if (!res.ok) throw new Error(`download failed: ${res.status}`);

  // 서버 헤더의 파일명 사용 (없으면 fallback)
  const cd = res.headers.get('Content-Disposition') || '';
  const fromHeader = parseFilenameFromCD(cd);
  const filename = safeFilename(fromHeader || fallback || 'file.bin');

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

window.setToken = setToken;
window.getToken = getToken;
window.clearToken = clearToken;
window.getMe = getMe;
window.bindAuthForm = bindAuthForm;
window.downloadWithAuth = downloadWithAuth;
