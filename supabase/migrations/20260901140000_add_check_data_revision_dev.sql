-- =============================================================================
-- Admin 禁用/维护配置时 bump 版本（dev schema）
-- =============================================================================

CREATE TABLE IF NOT EXISTS dev.check_data_revision (
    id smallint PRIMARY KEY CHECK (id = 1),
    bumped_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE dev.check_data_revision IS '配置变更版本戳，供 check-cx 检测 Admin 禁用/维护等更新';
COMMENT ON COLUMN dev.check_data_revision.bumped_at IS '最近一次配置相关变更时间';

INSERT INTO dev.check_data_revision (id, bumped_at)
VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE dev.check_data_revision ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON dev.check_data_revision TO service_role;

CREATE OR REPLACE FUNCTION dev.bump_check_data_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO dev.check_data_revision (id, bumped_at)
  VALUES (1, now())
  ON CONFLICT (id) DO UPDATE
    SET bumped_at = now();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS check_configs_bump_data_revision ON dev.check_configs;
CREATE TRIGGER check_configs_bump_data_revision
    AFTER INSERT OR DELETE OR UPDATE OF enabled, is_maintenance
    ON dev.check_configs
    FOR EACH ROW
    EXECUTE FUNCTION dev.bump_check_data_revision();
