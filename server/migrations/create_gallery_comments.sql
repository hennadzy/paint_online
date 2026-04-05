-- Создание таблицы комментариев к рисункам галереи
CREATE TABLE IF NOT EXISTS gallery_comments (
    id SERIAL PRIMARY KEY,
    drawing_id INTEGER NOT NULL REFERENCES gallery_drawings(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Индекс для быстрого поиска комментариев по рисунку
CREATE INDEX IF NOT EXISTS idx_gallery_comments_drawing_id ON gallery_comments(drawing_id);

-- Индекс для быстрого поиска комментариев по пользователю
CREATE INDEX IF NOT EXISTS idx_gallery_comments_user_id ON gallery_comments(user_id);

-- Индекс для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_gallery_comments_created_at ON gallery_comments(created_at DESC);