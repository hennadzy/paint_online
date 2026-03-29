const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { pgPool } = require('../config/db');

const router = express.Router();

const galleryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const likeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

// GET /api/gallery - get approved drawings sorted by likes
router.get('/', galleryLimiter, optionalAuthenticate, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : null;

    const result = await pgPool.query(
      userId
        ? `SELECT
             gd.id,
             gd.title,
             gd.likes_count,
             gd.created_at,
             gd.approved_at,
             u.username AS author_name,
             u.id AS author_id,
             EXISTS(SELECT 1 FROM gallery_likes gl WHERE gl.drawing_id = gd.id AND gl.user_id = $1) AS user_liked
           FROM gallery_drawings gd
           JOIN users u ON u.id = gd.user_id
           WHERE gd.status = 'approved'
           ORDER BY gd.likes_count DESC, gd.approved_at DESC`
        : `SELECT
             gd.id,
             gd.title,
             gd.likes_count,
             gd.created_at,
             gd.approved_at,
             u.username AS author_name,
             u.id AS author_id,
             false AS user_liked
           FROM gallery_drawings gd
           JOIN users u ON u.id = gd.user_id
           WHERE gd.status = 'approved'
           ORDER BY gd.likes_count DESC, gd.approved_at DESC`,
      userId ? [userId] : []
    );

    res.json({ drawings: result.rows });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/gallery/image/:id - serve gallery image
router.get('/image/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const result = await pgPool.query(
      `SELECT image_data FROM gallery_drawings WHERE id = $1 AND status = 'approved'`,
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageData = result.rows[0].image_data;
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) {
      return res.status(500).json({ error: 'Invalid image data' });
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buffer);
  } catch (error) {
    console.error('Get gallery image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/gallery/submit - submit drawing for approval (authenticated)
router.post('/submit', submitLimiter, authenticate, async (req, res) => {
  try {
    const { title, imageData } = req.body;
    const userId = req.user.userId;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Введите название рисунка' });
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 20) {
      return res.status(400).json({ error: 'Название не должно превышать 20 символов' });
    }

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'Изображение обязательно' });
    }

    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Неверный формат изображения' });
    }

    // Check if user has too many pending drawings
    const pendingCount = await pgPool.query(
      `SELECT COUNT(*) FROM gallery_drawings WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );
    if (parseInt(pendingCount.rows[0].count, 10) >= 3) {
      return res.status(400).json({ error: 'У вас уже есть 3 рисунка на рассмотрении. Дождитесь решения администратора.' });
    }

    await pgPool.query(
      `INSERT INTO gallery_drawings (user_id, title, image_data, status, likes_count, created_at)
       VALUES ($1, $2, $3, 'pending', 0, $4)`,
      [userId, trimmedTitle, imageData, Date.now()]
    );

    res.json({ message: 'Рисунок отправлен на рассмотрение' });
  } catch (error) {
    console.error('Submit gallery drawing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/gallery/:id/like - toggle like (authenticated)
router.post('/:id/like', likeLimiter, authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    // Check drawing exists and is approved
    const drawing = await pgPool.query(
      `SELECT id, likes_count FROM gallery_drawings WHERE id = $1 AND status = 'approved'`,
      [id]
    );

    if (drawing.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    // Check if already liked
    const existingLike = await pgPool.query(
      `SELECT 1 FROM gallery_likes WHERE user_id = $1 AND drawing_id = $2`,
      [userId, id]
    );

    let liked;
    if (existingLike.rows.length > 0) {
      // Unlike
      await pgPool.query(
        `DELETE FROM gallery_likes WHERE user_id = $1 AND drawing_id = $2`,
        [userId, id]
      );
      await pgPool.query(
        `UPDATE gallery_drawings SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1`,
        [id]
      );
      liked = false;
    } else {
      // Like
      await pgPool.query(
        `INSERT INTO gallery_likes (user_id, drawing_id, created_at) VALUES ($1, $2, $3)`,
        [userId, id, Date.now()]
      );
      await pgPool.query(
        `UPDATE gallery_drawings SET likes_count = likes_count + 1 WHERE id = $1`,
        [id]
      );
      liked = true;
    }

    const updated = await pgPool.query(
      `SELECT likes_count FROM gallery_drawings WHERE id = $1`,
      [id]
    );

    res.json({
      liked,
      likesCount: updated.rows[0].likes_count
    });
  } catch (error) {
    console.error('Like gallery drawing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/gallery/user/me - get current user's approved gallery drawings
router.get('/user/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pgPool.query(
      `SELECT
         gd.id,
         gd.title,
         gd.likes_count,
         gd.created_at,
         gd.approved_at,
         u.username AS author_name
       FROM gallery_drawings gd
       JOIN users u ON u.id = gd.user_id
       WHERE gd.user_id = $1 AND gd.status = 'approved'
       ORDER BY gd.likes_count DESC, gd.approved_at DESC`,
      [userId]
    );

    res.json({ drawings: result.rows });
  } catch (error) {
    console.error('Get user gallery drawings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
