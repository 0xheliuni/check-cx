#!/usr/bin/env bash
set -euo pipefail

read_env_value() {
    local name="$1"
    local value="${!name:-}"

    if [[ -n "$value" || ! -f .env ]]; then
        printf '%s' "$value"
        return
    fi

    sed -n "s/^${name}=//p" .env | head -n 1 | tr -d '\r'
}

wait_for_database() {
    local attempt

    docker compose up -d db
    for attempt in {1..30}; do
        if docker compose exec -T db pg_isready -U postgres -d postgres >/dev/null 2>&1; then
            return
        fi
        sleep 2
    done

    echo "数据库未在 60 秒内就绪"
    return 1
}

apply_pending_migrations() {
    local current_ref="$1"
    local target_ref="$2"
    local external_supabase_url
    local has_public_migration=0
    local status path extra

    while IFS=$'\t' read -r status path extra; do
        [[ "$path" == *_dev.sql ]] && continue
        has_public_migration=1
        if [[ "$status" != "A" ]]; then
            echo "迁移历史不可修改：$path"
            echo "请新增迁移文件，不要修改或删除已发布的迁移。"
            return 1
        fi
    done < <(git diff --name-status "$current_ref" "$target_ref" -- supabase/migrations)

    [[ "$has_public_migration" -eq 1 ]] || return

    external_supabase_url="$(read_env_value SUPABASE_URL)"
    if [[ -n "$external_supabase_url" ]]; then
        echo "检测到外部 SUPABASE_URL；为避免误写外部数据库，停止自动迁移。"
        echo "请先按 docs/OPERATIONS.md 执行新增迁移，再重新部署。"
        return 1
    fi

    wait_for_database
    docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
        "CREATE TABLE IF NOT EXISTS public.check_cx_schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"

    while IFS=$'\t' read -r status path extra; do
        local filename
        [[ "$status" == "A" && "$path" != *_dev.sql ]] || continue
        filename="${path##*/}"

        if docker compose exec -T db psql -U postgres -d postgres -v filename="$filename" -tAc \
            "SELECT 1 FROM public.check_cx_schema_migrations WHERE filename = :'filename'" | grep -qx '1'; then
            echo "=== 已应用迁移，跳过：$filename ==="
            continue
        fi

        echo "=== 应用迁移：$filename ==="
        git show "$target_ref:$path" | docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 --single-transaction
        docker compose exec -T db psql -U postgres -d postgres -v filename="$filename" -v ON_ERROR_STOP=1 -c \
            "INSERT INTO public.check_cx_schema_migrations (filename) VALUES (:'filename') ON CONFLICT DO NOTHING"
    done < <(git diff --name-status "$current_ref" "$target_ref" -- supabase/migrations)
}

if [[ -n "$(git status --porcelain)" ]]; then
    echo "工作区存在未提交改动，拒绝部署以避免覆盖本地状态。"
    exit 1
fi

current_ref="$(git rev-parse HEAD)"
git fetch --quiet
target_ref="$(git rev-parse '@{u}')"

if ! git merge-base --is-ancestor "$current_ref" "$target_ref"; then
    echo "当前分支无法 fast-forward 到上游，拒绝部署。"
    exit 1
fi

echo "=== 拉取最新代码 ==="
if [[ "$current_ref" == "$target_ref" ]]; then
    echo "已是最新版本"
else
    apply_pending_migrations "$current_ref" "$target_ref"
    git merge --ff-only "$target_ref"
fi

echo "=== 校验 Compose 配置 ==="
docker compose config -q

echo "=== 拉取最新镜像 ==="
docker compose pull

echo "=== 替换容器 ==="
docker compose up -d --force-recreate --remove-orphans

echo "=== 检查服务状态 ==="
panel_port="$(read_env_value CHECK_CX_PORT)"
panel_port="${panel_port:-3000}"
panel_ready=0
for attempt in {1..12}; do
    if curl -fsS --max-time 5 "http://127.0.0.1:${panel_port}" >/dev/null; then
        echo "服务正常运行：http://127.0.0.1:${panel_port}"
        panel_ready=1
        break
    fi
    sleep 2
done

if [[ "$panel_ready" -ne 1 ]]; then
    echo "服务未在预期端口就绪，请检查日志"
    docker compose logs --tail 20 check-cx
    exit 1
fi

echo "=== 部署完成 ==="
