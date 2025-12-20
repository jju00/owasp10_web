// backend/routes/board.js
const express = require('express');
const path = require('path');
const posts = require('../data/posts.json');
const { vulnerableJwtMiddleware } = require('../middleware/jwt');
const router = express.Router();

/**************** 게시판 API *****************/

// 1. 게시글 목록 조회 (로그인 불필요)
// GET /api/board
router.get('/', (req, res) => {
  const list = posts.map(p => ({
    id: p.id, 
    title: p.title, 
    cat: p.cat, 
    date: p.datetime
  }));
  return res.json(list);
});

// 2. 개별 게시글 조회 (로그인 필요)
// GET /api/board/:id
router.get('/:id', vulnerableJwtMiddleware, (req, res) => {
  const pid = Number(req.params.id);
  
  // 숫자가 아닌 경우
  if (isNaN(pid)) {
    return res.status(400).json({ error: 'invalid post id' });
  }

  const post = posts.find(p => p.id === pid);
  
  // 게시글이 없는 경우
  if (!post) {
    return res.status(404).json({ error: 'post not found' });
  }

  // 비밀글 권한 체크
  const isSecretPost = post.cat === '비밀게시판';
  const isAuthor = req.user && req.user.id === post.authorId;
  
  if (isSecretPost && !isAuthor) {
    return res.status(403).json({ error: 'forbidden: secret post' });
  }

  // 첨부파일 다운로드 요청
  if (req.query.download) {
    const att = post.attachments?.[0];
    if (!att) {
      return res.status(404).json({ error: 'no file' });
    }
    
    const abs = path.join(process.cwd(), att.path);
    return res.download(abs, att.name, {
      cacheControl: false,
      etag: false,
      lastModified: false,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  }

  // 게시글 본문 반환
  return res.json(post);
});

module.exports = router;
