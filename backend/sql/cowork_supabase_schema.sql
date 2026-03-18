-- ============================================================================
-- Cowork + Supabase schema bootstrap
-- Rules enforced:
-- 1) New module tables must use prefix `cowork_`
-- 2) Avoid duplicate structures: reuse an existing workers table if present
-- ============================================================================

DO $$
DECLARE
    existing_workers_table TEXT;
BEGIN
    SELECT tablename
    INTO existing_workers_table
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('cowork_workers', 'workers', 'user_workers')
    ORDER BY CASE
        WHEN tablename = 'cowork_workers' THEN 0
        ELSE 1
    END
    LIMIT 1;

    IF existing_workers_table IS NULL THEN
        CREATE TABLE public.cowork_workers (
            user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
            workers JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
        );

        CREATE INDEX IF NOT EXISTS idx_cowork_workers_updated_at
            ON public.cowork_workers (updated_at DESC);
    ELSIF existing_workers_table <> 'cowork_workers' THEN
        RAISE NOTICE
            'Existing workers table "%" detected. Reuse it via SUPABASE_WORKERS_TABLE and skip creating cowork_workers.',
            existing_workers_table;
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.cowork_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END
$$;

DO $$
BEGIN
    IF to_regclass('public.cowork_workers') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_cowork_workers_updated_at
            ON public.cowork_workers;

        CREATE TRIGGER trg_cowork_workers_updated_at
        BEFORE UPDATE ON public.cowork_workers
        FOR EACH ROW
        EXECUTE FUNCTION public.cowork_touch_updated_at();
    END IF;
END
$$;

ALTER TABLE IF EXISTS public.cowork_workers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF to_regclass('public.cowork_workers') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'cowork_workers'
              AND policyname = 'cowork_workers_select_own'
        ) THEN
            CREATE POLICY cowork_workers_select_own
                ON public.cowork_workers
                FOR SELECT
                USING (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'cowork_workers'
              AND policyname = 'cowork_workers_insert_own'
        ) THEN
            CREATE POLICY cowork_workers_insert_own
                ON public.cowork_workers
                FOR INSERT
                WITH CHECK (auth.uid() = user_id);
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = 'cowork_workers'
              AND policyname = 'cowork_workers_update_own'
        ) THEN
            CREATE POLICY cowork_workers_update_own
                ON public.cowork_workers
                FOR UPDATE
                USING (auth.uid() = user_id)
                WITH CHECK (auth.uid() = user_id);
        END IF;
    END IF;
END
$$;
