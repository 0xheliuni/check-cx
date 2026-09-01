-- =============================================================================
-- 迁移（dev schema）：为 Dashboard 实时刷新启用 supabase_realtime publication
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
      AND schemaname = 'dev'
      AND tablename = 'check_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dev.check_history;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'dev'
      AND tablename = 'group_info'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dev.group_info;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'dev'
      AND tablename = 'system_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dev.system_notifications;
  END IF;
END
$$;

ALTER TABLE dev.check_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_anon_select_history ON dev.check_history;
CREATE POLICY allow_anon_select_history
    ON dev.check_history
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON dev.check_history TO anon, authenticated;
GRANT SELECT ON dev.group_info TO anon, authenticated;
GRANT SELECT ON dev.system_notifications TO anon, authenticated;
