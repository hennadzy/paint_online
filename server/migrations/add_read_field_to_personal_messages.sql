-- Migration to add 'read' field to personal_messages table
-- This field tracks whether the recipient has read the message (for "unread by counterpart" indicator)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personal_messages' AND column_name = 'read'
  ) THEN
    ALTER TABLE personal_messages ADD COLUMN read BOOLEAN DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_pm_read ON personal_messages(from_user_id, to_user_id, read);
    RAISE NOTICE 'Added read column to personal_messages table';
  ELSE
    RAISE NOTICE 'read column already exists';
  END IF;
END $$;
