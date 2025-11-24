// backend/routes/board.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const posts = require('../data/posts.json');
const { requireLoginIfNumericPage } = require('../middleware/jwt');
const router = express.Router();

/**************** 통합 게시판 API *****************/
// 1. page 없음 → 게시글 목록만 조회 (로그인 불필요)                 ex) /board
// 2. page=숫자 → 게시글 조회 (로그인 필요)                         ex) /board?page=1 -> 1번 게시글 출력
// 3. page=문자열 → LFI/RCE (로그인 불필요)                        ex) /board?page=../../etc/passwd -> LFI
router.get('/', requireLoginIfNumericPage, (req, res) => {
  const page = req.query.page;

  // 1) page 파라미터 없음 → 목록 조회
  if (!page) {
    const list = posts.map(p => ({
      id: p.id, title: p.title, cat: p.cat, date: p.datetime
    }));
    return res.json(list);
  }

  // 2) page 파라미터가 있으면 처리 (숫자 → 게시글, 그 외 → 파일 경로로 해석)
  // 먼저 숫자(게시글 ID)로 시도
  if (/^\d+$/.test(String(page))) {
    const pid = Number(page);
    const post = posts.find(p => p.id === pid);
    
    // 게시글이 있으면 정상 처리
    if (post) {
      // 본문(JSON): 비밀글은 작성자만 허용 (그 외 403)
      if (post.cat === '비밀게시판') {
        if (!req.user || req.user.id !== post.authorId) {
          return res.status(403).json({ error: 'forbidden: secret post' });
        }
      }

      return res.json(post);
    }
  }

  /*************** LFI 구현 *********************/
  // 게시글이 없거나 숫자가 아니면 → 파일 경로로 해석 시도 (🚨 LFI/RCE 취약점)
  // 실제로는 게시글 조회 실패 시 에러를 반환해야 하지만, 파일 읽기로 fallback되도록 구현
  try {
    const target = path.join(process.cwd(), String(page));
    
    // .js 파일이면 require로 실행 (RCE)
    if (target.endsWith('.js')) {
      const mod = require(target);
      return res.type('text/plain').send(`required module: ${JSON.stringify(mod)}`);
    }
    
    // 그 외 파일은 내용 읽기 (LFI)
    const data = fs.readFileSync(target, 'utf8');
    return res
      .type(/\.(html?)$/i.test(target) ? 'text/html' : 'text/plain')
      .send(data);
  } catch (e) {
    return res.status(404).type('text/plain').send('not found');
  }
});

module.exports = router;
