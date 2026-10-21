---
id: OD-012
type: open-decision
status: open
owner: architecture/security
summary: Define principal, authorization, service identity, and hosted tenant-isolation semantics.
related:
  - architecture.context-map
  - domain.contexts.access-control
  - domain.contexts.orchestration-scope
  - ADR-0021
  - ADR-0079
  - ADR-0080
  - OD-031
  - OD-032
---

# OD-012: Identity, Authorization, and Tenant Isolation

## Decision required

Define principal types, tenant/project membership, service identities,
authorization checks, API authentication, secret references, and hosted isolation.

## Constraints

A configured product authority provider owns external principal, membership,
grant, and external Tenant or Project lifecycle facts. Orchestration Scope owns
stable provider-neutral Orchestrator scope identity, binding, admission, and
disposition coordination. Every application feature owns the authorization port
and business invariants it consumes; ACLs translate provider decisions without
becoming durable authorities. This decision selects the managed and standalone
provider topology and which operations require authoritative synchronous
decisions or bounded local projections, including revocation and fail-closed
behavior.

ADR-0021 fixes the client boundary:

- clients and tenant/project subclients are immutable;
- an asynchronous credential provider owns token refresh and secure persistence;
- actor, subject, client, tenant, and delegation facts come from verified auth
  context, never business payloads;
- SDK and domain/application code never store raw credentials;
- audience, resource, scope, tenant, and delegation participate in credential
  cache isolation.

This decision still selects concrete identity providers, grant flows, token
validation, revocation propagation, service identities, and authorization
consistency.

OD-031 separately owns semantic claim admission and conflict resolution. The
configured authority provider determines whether a principal may attempt an
operation; it does not
decide whether a Jira observation, agent statement, comment, or model summary is
the accepted business fact. OD-032 separately owns the final pre-side-effect
enforcement chain. Neither concern may be absorbed into one authorization
god-service.

An isolated real-Connect security spike passed 43/43 assertions in three runs. It
proved exact-scope credential cache keys, 100-way single-flight refresh,
compare-and-invalidate after concurrent authentication failure, one bounded forced
refresh, durable stream reconnect, per-boot local credential rotation, and
transactional cursor signing-key rotation. It also exposed a required
minimum-usable-lifetime guard and same-checkpoint auth-churn circuit breaker.

KMS/keychain custody, multi-replica revocation, browser cookie/CSRF behavior, and
distributed clock skew remain open.

A PostgreSQL tenant-isolation spike passed 40/40 checks against PostgreSQL 18.4
and `node-postgres` 8.22.0. It proved that session-level tenant `SET` leaks across
pooled borrowers, while transaction-local binding clears on commit and rollback.
It also proved that table owners bypass ordinary RLS, `FORCE ROW LEVEL SECURITY`
constrains non-bypass owners, and `BYPASSRLS` remains globally privileged.

The accepted persistence constraint is therefore application-enforced tenant
predicates plus hosted PostgreSQL RLS as defense in depth. Runtime, migration, and
elevated maintenance use separate pools and credentials. This evidence does not
select identity providers, grant flows, token validation, or revocation policy,
so this decision remains open.

The retained `PostgreSQL tenant isolation` fingerprint is in the
[foundation evidence manifest](../research/foundation-spike-evidence-manifest-2026-07-26.md).

## Provider research, 2026-10-21

This is source review and a qualification proposal, not an accepted provider ADR
or evidence of an implemented integration or tested deployment. The owner's
provisional direction is **Keycloak plus OpenFGA**, with ZITADEL retained as the
strongest alternative. OD-012 remains open until the selected slice, identity
lifecycle, administrative boundary, and failure behavior are qualified.

### Scope and ownership

One reusable provider mechanism should serve Orchestrator and Platform through
explicit contracts; separate consumer copies of token handling, principal
bindings, or relationship projection are not the target. Product membership,
grant, commercial, and operation policies stay with their existing owners.
An IAM user, organization, group, or project is an external representation, not
an Orchestrator Team, Work item, or domain aggregate. Platform consumes
Orchestrator APIs and SDKs rather than duplicating its coordination model.
Standalone self-hosted Orchestrator must operate without commercial Platform.

Get Modular is mandatory for TypeScript module composition under
[ADR-0110](../decisions/0110-mandatory-get-modular-and-nested-feature-foundation.md);
it is not an IAM provider. This research assumes no modular-monolith deployment.
The Dapr and Protobuf service-topology decision belongs to
[PR #79](https://github.com/agent-teams-ai/agent-teams-orchestrator/pull/79),
not to this IAM comparison. Provider SDKs and generated messages stay at adapters;
feature-owned authorization ports and owner-local invariants remain unchanged.

Separate the initial slice from a **growth qualification scenario**: one human
works for customers A and B, each has independent memberships, nested Teams or
departments, required organization-specific SSO, and SCIM provisioning. Ending A
must preserve B and stable identity. These enterprise capabilities are evaluation
criteria for future growth, not silently accepted requirements for the initial
MVP. Team topology, human/AI participation, and work views remain product concerns.

### Reviewed baseline

| Component | Stable release reviewed | Published | Source |
|---|---|---|---|
| Keycloak | `26.8.1` | 2026-10-13 | [release][kc-release] |
| ZITADEL | `v4.19.5`, commit `a618740b578627b7b9acbbb111a6948882d6f5dc` | 2026-10-15 | [release][zit-release] |
| OpenFGA | `v1.22.0` | 2026-10-06 | [release][fga-release] |

These are research baselines, not adopted dependency pins. ZITADEL claims below
refer to stable v4, not a next-generation preview. Its tagged core is AGPLv3;
the Login application has a separate MIT license ([core][zit-license],
[Login][zit-login-license]). Distribution and modification choices need their
own review before adoption; no claim about Platform licensing follows here.

### Evidence and consequences

**Shared identity and independent relationships.** Keycloak documents multiple
organization memberships and distinguishes `UNMANAGED` users, whose realm account
survives membership removal, from `MANAGED` users, whose account can be deleted
with the organization relationship ([member lifecycle][kc-members]). The growth
scenario therefore starts with shared realm identity and `UNMANAGED` membership;
an administrator must not silently convert it to `MANAGED`. This does not make
organization membership sufficient product authority or replace stable
provider-neutral principal bindings. Keycloak 26.8 defaults new organization-IdP
links to `UNMANAGED`, while existing links migrate as `MANAGED`
([release changes][kc-268-release]). Audit inherited and explicitly managed
relationships; do not describe managed membership as the new-link default.

ZITADEL supports external role assignments: one user can receive separately
managed A/B project roles without copying the account. Its B2B model nevertheless
places user management in one owning organization ([B2B][zit-b2b],
[external assignments][zit-external]). A neutral owning organization can avoid
customer ownership of shared identity, but then product memberships, invitation
semantics, and enterprise provisioning need explicit mappings. Deactivating the
user or its owning organization affects authentication beyond one external
assignment ([authentication checks][zit-auth], [active token checks][zit-token]).
Inference: cross-organization access is native; independent customer lifecycle
under one identity is not automatically the same capability.

**Organization-specific SSO has gaps in both candidates.** ZITADEL Login V2
`LinkSessionToAuthRequest` rejects an organization-bound request when the requested
organization differs from the session user's resource owner
([stable source][zit-auth-request]). Filtering role claims by organization does
not establish that organization's authentication policy. A neutral user with A/B
external roles therefore does not prove native required SSO for A and B.
Keycloak identity-first login also considers existing credentials; its tagged
guide describes using a local first factor instead of automatic IdP redirection
when one exists ([authentication flow][kc-login]). Neither an IdP hint nor an
organization claim proves mandatory target-organization SSO. Qualify routing,
authentication provenance, existing sessions, linking, and reauthentication;
do not claim either candidate solves the full growth scenario out of the box.

**Delegated administration is ZITADEL's strongest counterargument.** Project Grants
delegate a bounded subset of project roles, and the Console supplies customer
administration ([grant model][zit-grants]). `PROJECT_GRANT_OWNER` and
`ORG_USER_PERMISSION_EDITOR` separate `user.grant.write/delete` from
`user.write/delete`; grant checks bind the relevant project/grant
([default permissions][zit-permissions], [permission checks][zit-grant-checks]).
This can save real code and UI when customer-owned workforce accounts and the
Console match the product. It does not supply Team membership or limited
task-specific AI delegation.

Keycloak organization-member deletion requires both organization management and
user management, while global user deletion also requires user management
([member endpoint][kc-member-api], [user endpoint][kc-user-api]). Inference:
do not expose broad realm administration as the customer admin surface. A narrow
tenant-scoped backend must validate the target relationship, allowed role subset,
membership type, and administrative action, and keep privileged IAM credentials
server-side. Qualification must reject cross-customer grant changes, identity
deletion, credential changes, and privilege escalation.

**SCIM is a lifecycle contract.** ZITADEL's tagged SCIM API is marked Preview,
supports Users but not Groups, maps `active` to user state, and deletes through
`RemoveUserV2`, not a customer-membership command
([API][zit-scim-api], [mapping and limits][zit-scim], [handler][zit-scim-handler]).
It saves User provisioning work for the native ownership model; it does not
automatically give A a safe membership-only offboarding path for shared Alice.
For Keycloak, qualify a selected SCIM integration and its lifecycle mapping
separately. Keycloak 26.8 promotes native SCIM Users and Groups to supported
status, a concrete provisioning advantage over ZITADEL's User-only interface
([release changes][kc-268-release]). The API is realm-scoped: User deletion
removes the realm account, while organization groups are excluded from SCIM
exposure and membership operations ([user deletion][kc-scim-delete],
[organization exclusion][kc-scim-orgs], [membership check][kc-scim-groups]).
Inference: a shared-identity growth deployment still needs a qualified
tenant-scoped provisioning adapter that maps customer offboarding to that
customer's membership and authorization revocation while preserving other
relationships. Native protocol support does not establish that product boundary.
Neither candidate's IAM groups become the authority for product Teams.

**IAM and OpenFGA do not commit atomically.** An OpenFGA tuple write has its own
transaction boundary ([storage contract][fga-storage]); it cannot atomically
commit an IAM change or a consumer's business transaction. ZITADEL transactionally
queues event executions, but its worker can cancel failed or expired executions;
async targets also do not prove durable downstream delivery
([enqueue][zit-enqueue], [worker][zit-worker], [targets][zit-targets]). Do not
treat webhooks as a complete revocation stream. Both candidates need idempotent
projection, reconciliation, source revision handling, and explicit stale/gap
failure policy. JWT signature validation, token expiry, introspection, and FGA
relationship checks prove different things. Run cutoff remains under ADR-0079;
no webhook receipt proves that an active runtime effect stopped.

**TypeScript, services, and machines.** ZITADEL supplies typed Protobuf clients
and a Node transport ([client][zit-client]); Keycloak supplies an official
TypeScript admin client ([client][kc-client]). Standard OIDC/OAuth libraries and
provider adapters avoid writing authentication protocols. Protobuf generation
does not remove the consumer-owned contract or Dapr trust boundary. Service
accounts authenticate workloads; OAuth clients, persistent agents, human
subjects, actors, and ephemeral Run executions remain distinct. ZITADEL token
exchange records an actor but requires impersonation permissions
([exchange][zit-exchange]); this is not evidence of bounded product delegation.
Thousands of concurrent agents require an operation-mix load experiment, not
one long-lived credential per execution or a claim based on account counts.

### Provisional comparison and bounded estimate

The scores are engineering judgment, not measured uptime or security assurance.
Confidence is confidence in the provisional fit; complexity uses 10 for harder;
reliability uses 10 for stronger expected behavior after the same required
reconciliation and fail-closed controls. Neither stack has been deployed here.

| Same initial integration scope | Keycloak + OpenFGA | ZITADEL + OpenFGA |
|---|---|---|
| Fit confidence, /10 | 8 | 7 |
| Integration complexity, /10 | 7 | 8 |
| Expected controlled reliability, /10 | 8 | 8 |
| Production TypeScript estimate | 6,000–12,000 lines | 6,000–14,000 lines |

Estimate scope is backend integration only: token/principal adapters, explicit
membership and grant administration, relationship projection/reconciliation,
and revocation/freshness consumption for one vertical slice. It excludes UI,
tests, generated/vendor code, deployment files, Task/Team/Work engines, and the
additional enterprise SSO/SCIM growth pipeline. These overlapping planning ranges
have **2/10 confidence**, are not measured repository size, and must be replaced
by spike-based estimates. Native ZITADEL Console could reduce UI work outside
this scope; custom identity/SSO adaptation could increase growth work.

The provisional preference follows the shared-identity lifecycle, not a claim
that Keycloak needs no product code. ZITADEL becomes preferable if native
home-organization ownership, external guest access, and Console administration
meet the chosen product slice, or if the following experiment proves a smaller
safe integration. Keep the common provider mechanism reusable while accepting
different owner-local policies in standalone and managed compositions.

### Proposed acceptance experiment

Use disposable installations and A/B/neutral organizations, one shared human,
customer admins, and a service actor. No IAM fork is allowed. The first slice
runs relevant baseline cases; enterprise cases qualify growth separately.

1. **Stable identity:** join A and B, remove A, and retain B plus the same
   provider-neutral principal; reject silent managed-lifecycle conversion.
2. **SSO growth:** require A's IdP and then B's IdP; test local credentials,
   an existing session, IdP hints, linking, and wrong-organization provenance.
3. **Safe administration:** admin A manages only A's allowed relationships and
   roles; deny B changes, global user deletion, credentials, and escalation.
4. **SCIM growth:** create, update, suspend, and delete A's relationship through
   the selected provisioning path while B and shared identity remain usable.
5. **Revoke and grant again:** revoke an exact proof during admission and dispatch;
   delayed revocation cannot invalidate an unrelated successor proof.
6. **Projection failure:** interrupt IAM/FGA delivery, restart consumers, inject
   duplicates and reordered facts, then prove convergence and gap handling.
7. **Agent authority:** bind subject, actor, client, scope, expiry, and delegation;
   deny widening and prove owner-local Run cutoff without false stop receipts.
8. **Independent operation and load:** run standalone without Platform, then
   managed through the same mechanism; ramp measured agent/SSO traffic and record
   tail latency, saturation, token renewal, failures, and recovery.

The owning ADR must record which cases passed, source/configuration revisions,
custom code and operator work, accepted scope, and remaining gaps. A source
review or passing token exchange alone is not acceptance evidence.

[kc-release]: https://github.com/keycloak/keycloak/releases/tag/26.8.1
[kc-268-release]: https://www.keycloak.org/2026/10/keycloak-2680-released
[zit-release]: https://github.com/zitadel/zitadel/releases/tag/v4.19.5
[fga-release]: https://github.com/openfga/openfga/releases/tag/v1.22.0
[kc-members]: https://github.com/keycloak/keycloak/blob/26.8.1/docs/documentation/server_admin/topics/organizations/managing-members.adoc
[kc-login]: https://github.com/keycloak/keycloak/blob/26.8.1/docs/documentation/server_admin/topics/organizations/authenticating-members.adoc
[kc-member-api]: https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/organization/admin/resource/OrganizationMemberResource.java
[kc-user-api]: https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/resources/admin/UserResource.java
[kc-client]: https://github.com/keycloak/keycloak/blob/26.8.1/js/libs/keycloak-admin-client/README.md
[kc-scim-delete]: https://github.com/keycloak/keycloak/blob/26.8.1/scim/model/src/main/java/org/keycloak/scim/model/user/UserResourceTypeProvider.java
[kc-scim-orgs]: https://github.com/keycloak/keycloak/blob/26.8.1/scim/model/src/main/java/org/keycloak/scim/model/user/AbstractUserModelSchema.java
[kc-scim-groups]: https://github.com/keycloak/keycloak/blob/26.8.1/scim/model/src/main/java/org/keycloak/scim/model/group/GroupCoreModelSchema.java
[zit-license]: https://github.com/zitadel/zitadel/blob/v4.19.5/LICENSE
[zit-login-license]: https://github.com/zitadel/zitadel/blob/v4.19.5/apps/login/LICENSE
[zit-b2b]: https://github.com/zitadel/zitadel/blob/v4.19.5/apps/docs/content/guides/solution-scenarios/b2b.mdx
[zit-external]: https://github.com/zitadel/zitadel/blob/v4.19.5/apps/docs/content/concepts/features/external-user-grant.mdx
[zit-auth]: https://github.com/zitadel/zitadel/blob/v4.19.5/internal/command/user_auth.go
[zit-token]: https://github.com/zitadel/zitadel/blob/v4.19.5/internal/query/access_token.go
[zit-auth-request]: https://github.com/zitadel/zitadel/blob/v4.19.5/internal/command/auth_request.go
[zit-grants]: https://github.com/zitadel/zitadel/blob/v4.19.5/apps/docs/content/concepts/structure/granted_projects.mdx
[zit-permissions]: https://github.com/zitadel/zitadel/blob/v4.19.5/cmd/defaults.yaml
[zit-grant-checks]: https://github.com/zitadel/zitadel/blob/v4.19.5/internal/command/permission_checks.go
[zit-scim-api]: https://github.com/zitadel/zitadel/blob/v4.19.5/apps/docs/content/apis/scim2.mdx
[zit-scim]: https://github.com/zitadel/zitadel/blob/v4.19.5/apps/docs/content/guides/manage/user/scim2.mdx
[zit-scim-handler]: https://github.com/zitadel/zitadel/blob/v4.19.5/internal/api/scim/resources/user.go
[zit-enqueue]: https://github.com/zitadel/zitadel/blob/v4.19.5/internal/eventstore/v3/push.go
[zit-worker]: https://github.com/zitadel/zitadel/blob/v4.19.5/internal/execution/worker.go
[zit-targets]: https://github.com/zitadel/zitadel/blob/v4.19.5/internal/execution/execution.go
[zit-client]: https://github.com/zitadel/zitadel/blob/v4.19.5/packages/zitadel-client/README.md
[zit-exchange]: https://github.com/zitadel/zitadel/blob/v4.19.5/apps/docs/content/guides/integrate/token-exchange.mdx
[fga-storage]: https://github.com/openfga/openfga/blob/v1.22.0/pkg/storage/storage.go

## Resolution

Open.
