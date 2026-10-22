---
id: research.identity-provider-comparison-2026-10-21
type: research
status: active
owner: architecture/security
summary: Preserve the dated Keycloak, ZITADEL, and OpenFGA source review, comparison judgments, and qualification limits.
related:
  - OD-012
  - ADR-0021
  - ADR-0110
  - architecture.composition
  - research.collaboration-hierarchy-and-workspace-review-2026-10-22
---

# Identity Provider Comparison, 2026-10-21

## Scope and provenance

This report preserves the provider source review recorded on 2026-10-21 and
reconciled into research on 2026-10-22 from Orchestrator PR #86 head
`8483949960cb783fe70090e2e7fbf526a043d362`. Its method is review of the exact
upstream tags and source references below, followed by engineering comparison
and a proposed disposable qualification. No provider deployment, performance
experiment, security audit, or raw agent transcript was produced by this review.
The reviewed releases are dated baselines, not a claim about the latest release
on another date. The older Connect and PostgreSQL experiments retained in
OD-012 are separate evidence and do not qualify either candidate stack.

## Findings and design options

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

The confirmed multi-organization baseline permits one human to work in
organizations A and B through independent memberships. Ending A must preserve B and
stable identity. This baseline must not be deferred as hypothetical enterprise
growth. The exact initial provider implementation still requires qualification.
Nested Teams and departments remain product organization concerns. Required
organization-specific SSO and SCIM provisioning form a separate **enterprise
growth qualification scenario**; they are not silently added to the initial
slice. Human/AI participation and work views remain product concerns.

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
with the organization relationship ([member lifecycle][kc-members]). This shared
identity baseline therefore starts with realm identity and `UNMANAGED` membership;
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
Inference: enterprise provisioning for shared identity still needs a qualified
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
meet the chosen product slice, or if the owning qualification experiment proves
a smaller safe integration. Keep the common provider mechanism reusable while accepting
different owner-local policies in standalone and managed compositions.

## Decision status and qualification

[OD-012](../open-decisions/OD-012-identity-authorization-tenant-isolation.md)
retains the provisional provider recommendation, selection authority, and eight
proposed acceptance cases. This report does not select a provider or admit a
production integration. Its source findings and planning judgments are retained
here so changing an open recommendation does not erase the research.

The confirmed A/B membership baseline is distinct from the enterprise SSO/SCIM
growth scenario. Both use explicit stable identity and owner-local policy; an
IAM group, project, organization, or grant does not become a product Team,
Task, Tenant, or permission authority by naming similarity.

## Evidence and sources

The references below preserve every primary URL from the reviewed OD-012
provider section. Source statements, inferences, estimates, and proposed tests
retain their separate status. The review is reproducible as a source review;
its proposed experiments have not been run here.

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

## Limitations and remaining questions

- Qualify mandatory target-organization SSO against existing sessions, local
  credentials, account linking, wrong-organization provenance, and explicit
  reauthentication. An organization claim alone is insufficient.
- Prove customer-scoped SCIM and administration cannot delete shared identity,
  change another customer's relationships, or widen a role grant.
- Compare native customer Console workflows against the actual first product
  slice before building a replacement administration UI. Record code and
  operator work saved as measured outcomes, not assumed LOC reductions.
- Define revocation freshness per consuming capability, source revision and
  successor handling, gap recovery, fail-closed outages, and restore continuity
  across IAM, relationship storage, and product-owned records.
- Evaluate self-hosted installation, upgrades, HA, backup/restore, key rotation,
  last-administrator recovery, monitoring, and operator burden. This review
  contains no measured deployment-cost or availability comparison.
- Exercise thousands of agents with a measured operation mix: authentication,
  renewal, relationship reads/writes, revocation fan-out, saturation, tail
  latency, failures, and recovery. Account counts are not load evidence.
- Review exact distribution and modification choices against the selected
  component licenses before adoption. No Platform licensing conclusion follows
  from this research record.

Replace the low-confidence planning ranges with measurements from the selected
bounded spike. Do not add overlapping estimates as independent module budgets
or infer measured reliability from /10 scores.
