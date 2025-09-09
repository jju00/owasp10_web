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

window.setToken = setToken;
window.getToken = getToken;
window.clearToken = clearToken;
window.getMe = getMe;
window.bindAuthForm = bindAuthForm;
