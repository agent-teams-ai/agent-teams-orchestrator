export const sandboxActivityMigration = `
CREATE SCHEMA IF NOT EXISTS execution_observation;
CREATE TABLE IF NOT EXISTS execution_observation.partitions (tenant_id text NOT NULL,project_id text NOT NULL,run text PRIMARY KEY,state jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS execution_observation.outbox (tenant_id text NOT NULL,project_id text NOT NULL,event_id text PRIMARY KEY,run text NOT NULL,sequence bigint NOT NULL,kind text NOT NULL,recorded_at timestamptz(6) NOT NULL);
ALTER TABLE execution_observation.partitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_observation.partitions FORCE ROW LEVEL SECURITY;
ALTER TABLE execution_observation.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_observation.outbox FORCE ROW LEVEL SECURITY;
DO $policy$ DECLARE item text; BEGIN
 FOREACH item IN ARRAY ARRAY['partitions','outbox'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='execution_observation' AND tablename=item AND policyname='tenant_scope') THEN
   EXECUTE format('CREATE POLICY tenant_scope ON execution_observation.%I USING (tenant_id=current_setting(''app.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''app.tenant_id'',true))',item);
  END IF;
  -- Tenant tenancy alone is insufficient: the pooled runtime role must be unable
  -- to read or mutate a different Project under the same tenant if SQL regresses.
  -- RESTRICTIVE policies are AND-ed with the existing permissive tenant policy.
  -- An existing policy with the same name may have a permissive or weakened
  -- expression. Rebuild atomically rather than trusting name-only existence.
  EXECUTE format('DROP POLICY IF EXISTS project_scope ON execution_observation.%I',item);
  EXECUTE format('CREATE POLICY project_scope ON execution_observation.%I AS RESTRICTIVE USING (project_id=current_setting(''app.project_id'',true)) WITH CHECK (project_id=current_setting(''app.project_id'',true))',item);
 END LOOP;
END $policy$;
`;
