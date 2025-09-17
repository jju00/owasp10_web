// backend/routes/board.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const posts = require('../data/posts.json');

const router = express.Router();

router.get('/', (req, res) => {
  const page = req.query.page;

  // 1) page가 숫자면: posts.json에서 찾아서 반환 (+첨부 다운로드)
  if (/^\d+$/.test(String(page || ''))) {
    const pid = Number(page);
    const post = posts.find(p => p.id === pid);
    if (!post) return res.status(404).json({ error: 'no such post' });

    // 첨부 다운로드(IDOR 데모)
    if (req.query.download) {
      const att = post.attachments?.[0];
      if (!att) return res.status(404).json({ error: 'no file' });
      const abs = path.join(process.cwd(), att.path); // 예: frontend/public/assets/uploads/...
      return res.download(abs, att.name);
    }

    return res.json(post);
  }

  // 2) 숫자가 아니면: LFI/RCE 데모 
  try {
    const target = path.join(process.cwd(), String(page || ''));
    if (target.endsWith('.js')) {
      // 업로드 JS 실행 데모 - by require
      const mod = require(target);
      return res.type('text/plain').send(`required module: ${JSON.stringify(mod)}`);
    }
    const data = fs.readFileSync(target, 'utf8');
    res.type(/\.(html?)$/i.test(target) ? 'text/html' : 'text/plain').send(data);
  } catch (e) {
    res.status(404).type('text/plain').send('not found');
  }
});

module.exports = router;
