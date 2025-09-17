// backend/routes/board.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const posts = require('../data/posts.json');
const { requireLoginIfNumericPage } = require('../middleware/jwt');
const router = express.Router();

// 게시판 목록: 로그인 없이 공개
router.get('/list', (req, res) => {
  const list = posts.map(p => ({
    id: p.id, title: p.title, cat: p.cat, date: p.datetime
  }));
  res.json(list);
});

// page= 이 숫자면 로그인 강제, 숫자 아니면(=LFI/RCE) 공개
router.get('/', requireLoginIfNumericPage, (req, res) => {
  const page = req.query.page;

  // 1) 숫자면: 게시글 JSON/첨부 다운로드 (로그인 필요: 미들웨어가 선 적용됨)
  if (/^\d+$/.test(String(page || ''))) {
    const pid = Number(page);
    const post = posts.find(p => p.id === pid);
    if (!post) return res.status(404).json({ error: 'no such post' });


    // 비밀게시판 접근 제한 (쓴 사람만 볼 수 있음 - posts.json의 authorID 검증)
    if (post.cat === '비밀게시판') {
      if (!req.user || req.user.id !== post.authorId) {
        return res.status(403).json({ error: 'forbidden: secret post' });
      }
    }

    // 첨부 다운로드(IDOR 데모 포인트)
    if (req.query.download) {
      const att = post.attachments?.[0];
      if (!att) return res.status(404).json({ error: 'no file' });
      const abs = path.join(process.cwd(), att.path);
      return res.download(abs, att.name);
    }
    return res.json(post);
  }

  // 2) 숫자가 아니면: LFI/RCE 데모 (로그인 필요 없음)
  try {
    const target = path.join(process.cwd(), String(page || ''));
    if (target.endsWith('.js')) {
      // 업로드된 .js를 require해 실행
      const mod = require(target);
      return res.type('text/plain').send(`required module: ${JSON.stringify(mod)}`);
    }
    const data = fs.readFileSync(target, 'utf8');
    return res
      .type(/\.(html?)$/i.test(target) ? 'text/html' : 'text/plain')
      .send(data);
  } catch (e) {
    return res.status(404).type('text/plain').send('not found');
  }
});

module.exports = router;
