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

router.get('/', galleryLimiter, optionalAuthenticate, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : null;

    const result = await pgPool.query(
      userId
        ? `SELECT
             gd.id,
             gd.title,
             gd.likes_count,
             (SELECT COUNT(*) FROM gallery_comments gc WHERE gc.drawing_id = gd.id AND gc.is_deleted = FALSE) AS comments_count,
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
             (SELECT COUNT(*) FROM gallery_comments gc WHERE gc.drawing_id = gd.id AND gc.is_deleted = FALSE) AS comments_count,
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

router.post('/:id/like', likeLimiter, authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const drawing = await pgPool.query(
      `SELECT id, likes_count FROM gallery_drawings WHERE id = $1 AND status = 'approved'`,
      [id]
    );

    if (drawing.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    const existingLike = await pgPool.query(
      `SELECT 1 FROM gallery_likes WHERE user_id = $1 AND drawing_id = $2`,
      [userId, id]
    );

    let liked;
    if (existingLike.rows.length > 0) {
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

// Получение комментариев к рисунку
router.get('/:id/comments', optionalAuthenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    // Проверяем, что рисунок существует и одобрен
    const drawing = await pgPool.query(
      `SELECT id FROM gallery_drawings WHERE id = $1 AND status = 'approved'`,
      [id]
    );

    if (drawing.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    const result = await pgPool.query(
      `SELECT
         gc.id,
         gc.comment,
         gc.created_at,
         gc.updated_at,
         u.id AS user_id,
         u.username AS author_name,
         u.avatar_url AS author_avatar
       FROM gallery_comments gc
       JOIN users u ON u.id = gc.user_id
       WHERE gc.drawing_id = $1 AND gc.is_deleted = FALSE
       ORDER BY gc.created_at ASC`,
      [id]
    );

    res.json({ comments: result.rows });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Добавление комментария
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.userId;
    const { comment } = req.body;

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Введите комментарий' });
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length > 500) {
      return res.status(400).json({ error: 'Комментарий не должен превышать 500 символов' });
    }

    // Проверяем, что рисунок существует и одобрен
    const drawing = await pgPool.query(
      `SELECT id FROM gallery_drawings WHERE id = $1 AND status = 'approved'`,
      [id]
    );

    if (drawing.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    const now = Date.now();
    const result = await pgPool.query(
      `INSERT INTO gallery_comments (drawing_id, user_id, comment, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         comment,
         created_at,
         updated_at,
         $6 AS user_id,
         $7 AS author_name`,
      [id, userId, trimmedComment, now, now, userId, req.user.username]
    );

    res.json({ comment: result.rows[0] });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Редактирование комментария (админ или автор)
router.put('/comments/:commentId', authenticate, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { comment } = req.body;

    if (!Number.isFinite(commentId) || commentId <= 0) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Введите комментарий' });
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length > 500) {
      return res.status(400).json({ error: 'Комментарий не должен превышать 500 символов' });
    }

    // Получаем информацию о комментарии
    const existingComment = await pgPool.query(
      `SELECT user_id FROM gallery_comments WHERE id = $1 AND is_deleted = FALSE`,
      [commentId]
    );

    if (existingComment.rows.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    // Проверяем права: админ или автор комментария
    const isAuthor = existingComment.rows[0].user_id === userId;
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Нет прав для редактирования' });
    }

    const now = Date.now();
    const result = await pgPool.query(
      `UPDATE gallery_comments
       SET comment = $1, updated_at = $2
       WHERE id = $3
       RETURNING id, comment, created_at, updated_at`,
      [trimmedComment, now, commentId]
    );

    res.json({ comment: result.rows[0] });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Удаление комментария (админ или автор)
router.delete('/comments/:commentId', authenticate, async (req, res) => {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!Number.isFinite(commentId) || commentId <= 0) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }

    // Получаем информацию о комментарии
    const existingComment = await pgPool.query(
      `SELECT user_id FROM gallery_comments WHERE id = $1 AND is_deleted = FALSE`,
      [commentId]
    );

    if (existingComment.rows.length === 0) {
      return res.status(404).json({ error: 'Комментарий не найден' });
    }

    // Проверяем права: админ или автор комментария
    const isAuthor = existingComment.rows[0].user_id === userId;
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'Нет прав для удаления' });
    }

    await pgPool.query(
      `UPDATE gallery_comments SET is_deleted = TRUE WHERE id = $1`,
      [commentId]
    );

    res.json({ message: 'Комментарий удален' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
