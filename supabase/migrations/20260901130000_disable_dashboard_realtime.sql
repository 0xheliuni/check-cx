-- =============================================================================
-- 回滚：Dashboard 不再使用 Realtime，从 supabase_realtime 拿掉公开表
-- 不删除 publication 本身（Supabase 内置对象）
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'check_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.check_history;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'group_info'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.group_info;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'system_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.system_notifications;
  END IF;
END
$$;
