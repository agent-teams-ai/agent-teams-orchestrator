export const sandboxManifestMigration = `
CREATE SCHEMA IF NOT EXISTS agent_context;
CREATE TABLE IF NOT EXISTS agent_context.manifests (
 tenant_id text NOT NULL, project_id text NOT NULL, name text PRIMARY KEY, fingerprint text NOT NULL,
 facts jsonb NOT NULL, created_at timestamptz(6) NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_context.outbox (
 tenant_id text NOT NULL, project_id text NOT NULL, event_id text PRIMARY KEY, resource_name text NOT NULL, kind text NOT NULL
);
ALTER TABLE agent_context.manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_context.manifests FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_context.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_context.outbox FORCE ROW LEVEL SECURITY;
DO $policy$ DECLARE item text; BEGIN
 FOREACH item IN ARRAY ARRAY['manifests','outbox'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='agent_context' AND tablename=item AND policyname='tenant_scope') THEN
   EXECUTE format('CREATE POLICY tenant_scope ON agent_context.%I USING (tenant_id=current_setting(''app.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''app.tenant_id'',true))',item);
  END IF;
 END LOOP;
END $policy$;
`;
