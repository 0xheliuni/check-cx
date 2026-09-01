-- =============================================================================
-- 迁移：为 Dashboard 实时刷新启用 supabase_realtime publication
-- 仅暴露公开可读表，不把 check_configs（含 api_key）加入 publication
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'check_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.check_history;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'group_info'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_info;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'system_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_notifications;
  END IF;
END
$$;

ALTER TABLE public.check_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_anon_select_history ON public.check_history;
CREATE POLICY allow_anon_select_history
    ON public.check_history
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.check_history TO anon, authenticated;
GRANT SELECT ON public.group_info TO anon, authenticated;
GRANT SELECT ON public.system_notifications TO anon, authenticated;
