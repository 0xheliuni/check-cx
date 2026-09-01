-- =============================================================================
-- 回滚（dev schema）：从 supabase_realtime 拿掉公开表
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'dev'
      AND tablename = 'check_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE dev.check_history;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'dev'
      AND tablename = 'group_info'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE dev.group_info;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'dev'
      AND tablename = 'system_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE dev.system_notifications;
  END IF;
END
$$;
