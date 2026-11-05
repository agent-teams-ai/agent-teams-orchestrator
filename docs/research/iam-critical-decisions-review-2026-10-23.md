---
id: research.iam-critical-decisions-review-2026-10-23
type: research
status: active
owner: architecture/security
summary: Dated adversarial review of remaining identity, authorization, agent trust, local access, and recovery decisions; research recommendations are not accepted contracts.
---

# IAM Critical Decisions Review 2026-10-23

## Scope and provenance

Research date: **2026-10-23**. This report combines three independent research
tracks, three fresh adversarial reviews using GPT-6.1 Sol at `xhigh` reasoning,
and a primary-source review by the coordinating researcher. The tracks cover
identity and tenancy, graph consistency, Agent trust, clients and local access,
scope and reuse, and security counterexamples. Agreement between reviewers is
not runtime evidence.

The source baseline deliberately distinguishes current accepted main from
unmerged owner-confirmed discussion:

| Repository | Reviewed source | Meaning |
| --- | --- | --- |
| Orchestrator main | `aaabc1e7cd2e2482668530e4412e61c2bca1f515` | Current accepted architecture, including canonical Dapr and Fully Local V1 adoption |
| Orchestrator PR86 | `0f0338002eb713fa390cb47bc8acdb5d8efd1d91` | Existing research branch, mandatory Get Modular and owner-confirmed collaboration requirements |
| Platform main | `f324ff92b7791d9dbadf38adad57b08595b0018a` | Current product authority, identity, delegation and lifecycle boundaries |
| Platform PR55 | `d8eae303fbf8b9197c415b77cb30d6616fb53cb7` | Prior product relationship and research navigation work |
| Agent Runtime main | `6aa7152bd16282b18dfea23b8f5287041bb6adb8` | Runtime ownership and contained provider-turn effect boundary |

The current-main OD-012 remains open. The provisional Keycloak plus OpenFGA
direction and detailed A/B membership discussion in PR86 have not all reached
main. That is unfinished integration, not evidence that a later change deleted
an already accepted provider integration. Historical ADR number collisions make
the exact revision and document title necessary when comparing branches.

This is a source and contract review. No provider was deployed, no exploit was
executed, and no latency, availability or revocation bound was measured. Proposed
experiments below are not completed tests. New recommendations do not accept an
ADR, select production dependencies, or authorize implementation past existing
readiness gates.

## Findings and design options

### Executive assessment

The product boundaries are substantially clearer than the implementation
contract. **Keep Keycloak plus OpenFGA as the provisional server direction.**
The missing work is primarily exact identity ownership, authentication trust,
current authorization, local custody and failure behavior. Installing another
IdP does not remove those product obligations.

The highest-priority new finding is authentication-root isolation. Correctly
removing a person's membership in company A while preserving B does not prove
that A's identity provider or corporate mailbox cannot still authenticate as
that person's shared account. A/B qualification must cover login, account
linking, factor changes and recovery as well as grants.

OpenFGA needs one bounded correctness experiment before substantial custom
projection machinery. SpiceDB is a focused comparator for transactional
preconditions, causal reads and lookup cursors, not a reason to restart the IdP
comparison. Neither engine supplies an atomic transaction across the product
authority, its graph projection and an external side effect.

### Constraints that should not be reopened

| Constraint | Consequence for this research |
| --- | --- |
| Standalone Orchestrator is independent of Platform | Supply an independent authority composition; no mandatory commercial account or Platform grant service |
| Platform uses Orchestrator API and SDK | Keep one Team, Work and Run implementation; no shared business database or cross-product transaction |
| Configured authority owns identity, membership and grants | Do not create a second Orchestrator Access Control grant ledger |
| Features own consumer authorization ports and aggregate invariants | A positive graph answer cannot complete Work, start a Run or approve an effect by itself |
| Get Modular is mandatory for applicable TypeScript composition | Reuse its qualified composition seams; business policy remains ordinary typed code behind owned ports |
| Services use the accepted Dapr and Protobuf boundaries | Workload authentication remains separate from product actor, subject and grant |
| Fully Local is required in V1 | No mandatory cloud login; local identity and recovery cannot be deferred beyond that release |
| Humans can join several Teams; Tasks can have equal co-executors | Assignment and roster placement do not grant authority or start an Agent |
| Workspace is the collaboration UI; Execution Directory is the execution resource | Neither name defines an identity realm or security boundary |
| Semantic organization structure is separate from security | A department ancestor does not implicitly inherit permissions |
| Dangerous-action approval details remain deferred | Preserve the minimum enforcement boundary; do not implement a generic approval engine now |

These constraints come from the owner discussion, the existing research branch,
and the current-main sources listed under evidence. Where detailed tactical
models remain proposed, this report does not upgrade their status.

### Reading the option scores and estimates

All option tables use the same scale:

- **Fit**: confidence that the option fits this product, from 1 to 10.
- **Reliability**: expected correctness and robustness after the stated controls
  are implemented and qualified, from 1 to 10. This is not measured uptime.
- **Complexity**: implementation and maintenance difficulty, from 1 to 10;
  higher means harder.
- **TS LOC**: approximate handwritten production TypeScript in the stated slice.
  Unless specified otherwise, exclude tests, generated clients, vendor source,
  UI, model/configuration files, native packaging and infrastructure.

Estimate confidence is only **2-4/10**, depending on the card. The intervals
overlap and must not be summed. JVM, operating-system, database and operational
work remains real even when it contributes no TypeScript lines. Known boundary
violations are rejected in prose rather than offered as plausible alternatives.

### 1. Stable identity and the scope of corporate authentication

**Decide before the first shared multi-organization account.** Keep a stable
principal inside the configured authority realm. Represent A and B membership,
Tenant grants, external bindings and authentication requirements separately.
An authority realm is a trust and lifecycle boundary, not necessarily one
process, physical deployment or customer organization. OIDC identity starts
with verified issuer and subject, not email [S01].

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Stable authority principal with explicit Tenant bindings and private scoped aliases; personal queue inside the selected Target | 9 | 9 | 5 | 1,500-3,500 |
| Separate realm/account per security organization, with explicit identity linking to support the same product journeys | 5 | 8 | 8 | 3,000-7,000 |

The first option is recommended. Scoped aliases are compatible with a stable
principal, but their issuance, uniqueness, non-reuse, rebinding and historical
lookup need an owning identity capability. A stateless ACL, SDK or generic
provider-client library cannot own that durable registry. A person's own
authorized A/B queue does not give A administrators a global user directory or
visibility into B. Independent Targets need not share one world-wide account.

**Authentication-root choice is additional.** A company-controlled IdP can
assert an existing linked employee subject. In the reviewed Keycloak broker,
that identity resolves to an existing realm user and can finish realm
authentication. Organization association does not by itself prove that the
resulting credential is restricted to that company's resources [S08]. If B
accepts the canonical subject plus a B grant without provenance restrictions,
the controller of A's IdP can potentially reach B. This is a conditional threat
trace from source review, not a tested vulnerability in an admitted deployment.

The same issue can arise through password recovery delivered to a corporate
mailbox that A can reassign. Disabling automatic email linking does not solve
recovery trust. Account factor changes and recovery must have the same declared
trust scope as login.

| Corporate authentication rollout | Fit | Reliability | Complexity | Incremental TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Neutral account login/recovery for initial shared accounts; enable company federation only after scoped evidence and negative-flow qualification | 9 | 9 | 4 | 400-1,000 for admission restrictions and binding policy |
| Implement scoped corporate authentication evidence and required SSO with the first release slice | 8 | 8 | 8 | 1,500-4,000 beyond ordinary identity mapping |

The staged option is recommended unless immediate corporate SSO is a product
requirement. It preserves a usable multi-organization account without claiming
that every linked corporate credential is a safe global root. Neutral recovery
also excludes company-controlled mailbox resets and unconstrained corporate
factor linking; it is an explicit custody/recovery policy, not just disabling
an IdP button. A later scoped
proof must bind the actual authentication connection, subject, applicable
Target, authentication time/assurance, policy revision and expiry. Organization
claims, an IdP hint, a linked identity, refresh or a new token issuance time do
not establish that proof [S01, S07-S08].

The enterprise estimate excludes a possible Keycloak Java authenticator or
provider extension. If the chosen flow requires fragile internal session notes,
a fork or unsupported security behavior, reconsider the rollout or provider
boundary before implementation. Do not hide that cost in a small TS adapter.

**Qualification:** A/B membership removal; A-controlled IdP and mailbox;
preexisting SSO cookie; neutral login followed by A-required SSO; A login
followed by B; linked identity removal; stale refresh; source reassignment;
customer admin attempts to change another customer's root factors. Preserve
historical authorship and B while denying A's ended authority.

### 2. Fully Local identity, bootstrap and recovery

**The product choice is one owner versus a multiple-user local server.** A personal
Target can use a narrow local authority adapter with a durable random principal
and ordinary owner grants. It does not need a second password or OIDC server.
The same feature policies, approval requirements, scope retirement and AR
technical controls still apply.

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Personal single-owner authority, protected enrollment, rotating boot credentials and explicit recovery | 8 | 8 | 7 | 2,800-6,000 |
| Bundle a full multiple-user Keycloak authority with the local installation | 6 | 8 | 9 | 2,000-4,500 for TS integration only |

Recommend the first option for personal Fully Local, and the qualified server
composition when collaboration needs a multiple-user service. The second option's
smaller possible TS count excludes JVM distribution, signed native packaging,
database lifecycle, migrations, upgrades and recovery across supported OSes.

Stable identity and boot credentials are different. Restarting the Host must
preserve authorship while invalidating retired credentials. First-run races
must produce one explicit owner claim. Key loss must produce a typed recovery
state; it must not infer a new owner from an OS username, hostname, data path or
restored database. The protected connector authenticates its peer and scope;
loopback and the same OS user are insufficient.

OS keychains and filesystem permissions cannot universally defeat arbitrary
malware running as the same user. Any stronger isolation claim needs a named,
qualified sandbox, application-identity or hardware mechanism. Do not silently
advertise such a guarantee from ordinary secret storage.

Recovery needs either surviving verified recovery evidence or an explicitly
created successor local authority/Target incarnation with reconciliation and
rebinding. Preserve historical principal references; OS custody alone does not
prove continuity of the old human or restore old grants. Full rollback of
the machine and all protected local state cannot be detected absolutely without
an independent witness or suitable hardware state. This is a threat-model
limit already acknowledged in Platform's managed installation contracts, not a
promise that a local revision counter solves rollback.

**Qualification:** simultaneous first clients; locked or absent secret store;
restart; copied data directory; lost keys; old credential replay; wrong Target;
repair with missing authority data. This card includes local enrollment and
recovery integration, not the entire Supervisor, native distribution or IPC
implementation. Estimate confidence: 3/10.

### 3. Browser, Desktop and CLI session custody

Current Web architecture already uses a trusted same-origin Host deployment;
arbitrary custom Target connections belong to Desktop in V1. A browser session
adapter at the existing Control Host therefore fits the boundary. It need not
be an additional microservice or route normal business traffic through the
commercial Platform.

| Web alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Per-Target same-origin backend-for-frontend with server-held OAuth tokens and protected session cookies | 9 | 9 | 6 | 2,400-5,200 |
| Browser OIDC public client with code plus `PKCE` and memory-held tokens | 6 | 7 | 5 | 1,200-2,800 |

Recommend the first option for this business workspace. RFC 10017 describes the BFF security benefit but recommends server-side
session state only for small-scale scenarios because of scaling and replication
cost. Selecting server-held state here is an engineering recommendation for
control and custody, conditional on multi-replica qualification, not an RFC
guarantee of large-scale operation. HttpOnly cookies reduce token
exfiltration; they do not prevent injected same-origin code from making user
requests. The boundary still needs CSRF protection, exact origin/Host validation,
fixed upstreams and session invalidation [S02].

Bind each pending OAuth transaction to the configured issuer, client, redirect
and exact Target/client generation. Switching from A to B must invalidate or
reject A's late callback rather than installing its credentials into B.

Multi-replica refresh needs actual custody and atomic version/rotation state.
Per-process single-flight does not coordinate two Host replicas or two native
processes sharing one rotating refresh credential. Logout must win against late
refresh. Technical session state may be shared; membership/grant authority must
not move into the session store.

For remote Desktop and interactive CLI, recommend system-browser authorization
code plus `PKCE`. Device authorization is a fallback when the callback/browser
flow is unsuitable, not an inherently stronger default [S03-S05]. The complete
remote-client custody/refresh slice is approximately **1,800-3,800 TS LOC**,
fit 9/10, reliability 8/10, complexity 6/10; estimate confidence 3/10.

Persistent storage must be qualified on the selected shell/OS. For example,
Electron documents a Linux fallback without effective encryption and limits to
Windows same-user isolation; the Desktop shell itself remains unselected
[S06]. When a qualified store is unavailable, explicit session-only login is
safer than silent plaintext persistence. Persistent headless access needs its
own deliberate custody choice.

Do not reuse hosted cookie assumptions across local Targets on different
`127.0.0.1` ports: cookies have no port isolation, and Path is not an integrity
boundary [S09]. Initial native local access can use the protected connector and
SDK. A local browser endpoint requires separate origin/session qualification.

Use mature OIDC/JOSE libraries and official provider SDKs behind narrow ports.
Do not implement OAuth, JWT cryptography or a general credential framework.
Realtime subscription credentials can remain short-lived and scope-bound
under the already accepted wake-only delivery contract.
Preserve the accepted SDK stream rule: expiry or revocation ends the stream
with a typed outcome; current credentials start a bounded reconnect from a
qualified checkpoint. Do not replace authority invisibly inside an existing
stream. Logout and Target switch close the correct client generation without
cancelling independently accepted durable work.

### 4. Roles, organization structure and customer administration

**Choose a finite capability vocabulary before building a role editor.** Fixed
templates can make a small team easy to start while explicit resource grants
support larger customers. Thousands of Agents do not imply a need for an
arbitrary policy language.

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Versioned fixed role templates plus explicit Tenant/project/resource grants | 9 | 9 | 4 | 800-1,800 |
| Customer-defined roles from an allowlisted capability catalog | 7 | 8 | 7 | 2,200-4,800 |
| Customer-authored arbitrary policy expressions | 2 | 5 | 9 | 6,000-15,000+ |

Recommend fixed templates first. The catalog belongs to the feature that owns
the operation. Template interpretation must have one canonical meaning in
managed and standalone authority implementations; later edits must not alter
historical authorship or let a stale revoke remove a successor grant.

Customer administrators receive only scoped product management operations.
Product roles are not Keycloak realm-management roles. A department tree, Team
placement, Task assignment or Kanban column never supplies a security grant.
Only project hierarchy edges required by an adopted inheritance rule belong in
the authorization graph. Organizational depth and security inheritance remain
separate product concerns.

Scope: role/template management and decision mapping over existing principal
and grant storage, excluding all feature enforcement and UI. Estimate confidence
3/10; arbitrary policy is a materially larger product, with confidence 1/10.

### 5. Agent identity, delegated work and service trust

Separate a persistent Agent resource, a product principal, a running worker,
an OAuth client and a particular Run. They have different lifetimes and revoke
surfaces. A model-produced `agentId` must never choose the authority under which
its command executes.

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Agent resource with an optional independently revocable service-principal binding; trusted dispatch binds exact Agent and Run | 9 | 9 | 5 | 1,000-2,200 |
| OAuth client and provider service account for every persistent Agent | 6 | 8 | 7 | 1,800-4,000 |

Recommend the first option. Shared workers are acceptable only when the trusted
dispatch/tool channel binds actor, subject, client/workload, Agent, Run, Target
and authority basis. Independently authorized Agents need independently
revocable grants; they need not all have separate OAuth clients. A service
principal is not a human customer-organization member.

This binding prevents untrusted model/tool identity substitution. It does not
contain a compromised worker that holds credentials for several customers.
Partition mutually untrusted execution scopes as the actual threat model
requires; several per-Agent credentials inside one compromised process do not
by themselves reduce that exposure.

Dapr authenticates an enrolled workload and authorizes invocation; it does not
prove the human subject, active Tenant or delegated product grant. Both
application/sidecar hops and workload enrollment require qualification. Each
receiving feature checks its trusted invocation context and current policy.

For durable work, persist exact intent and authority references/revisions,
not a human access or refresh token. At dispatch and renewal, recheck the
current authority basis. Human logout is different from explicit grant revoke;
neither silently changes who owns an autonomous organization task. The action's
chosen mode must distinguish acting for a human from acting under an independent
service grant. Accepted Platform delegation remains one edge, without
further delegation or scope expansion.

One edge is not sufficient policy for creating or renewing authority. Separate
permission to perform an action from permission to issue a grant, renew a
delegation or establish independent organization automation. Otherwise a worker
can repeatedly create successor delegations, or copy human authority into a
direct service grant, without violating the literal delegation-depth rule.

| Durable job authority mode | Fit | Reliability | Complexity | Incremental TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Finite human-sponsored delegation; expiry suspends pending work until explicit new authorization | 8 | 9 | 4 | 500-1,200 |
| Explicitly authorized unattended renewal with bounded horizon, exact client and original constraint ceiling | 9 | 8 | 6 | 900-2,400 |
| Separately authorized organization automation with an independent service grant and lifecycle | 8 | 8 | 6 | 800-2,200 |

Use finite delegation as the smallest default for human-sponsored jobs. Use the
third mode for deliberately organization-owned automation, authorized by a
grant administrator. Add bounded renewal when its product need is demonstrated.
These are different job modes, not interchangeable ways to bypass expiry.
Assignment, Agent creation and a current allow for the ordinary action cannot
authorize those transitions. The estimates cover one provider/job path and
overlap the surrounding integration work.

For two service boundaries plus durable binding, the recommended workload
authentication and trusted product-context slice is **1,800-3,800 TS LOC**,
fit 9/10, reliability 9/10, complexity 6/10, estimate confidence 3/10. Add token
exchange only where an audience boundary requires it. Keycloak's delegation
extension is currently preview; exchanging an access token does not establish
an access-token revocation chain. Scope/audience policy also needs explicit
restriction [S10]. Do not build a security promise on a preview feature or
assume every exchange automatically attenuates authority.

### 6. Tenant, store and graph administration boundaries

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Shared graph store within an authority environment, explicit Tenant scope, server-owned routing and guarded writes | 8 | 8 | 5 | 700-1,600 |
| Separate graph store per Tenant with the same routing and guard contract | 7 | 8 | 7 | 1,100-2,500 |

The shared-store option is the initial candidate; dedicated stores remain
available when a concrete isolation or operations requirement justifies them.
A store is not physical data isolation. Neither choice removes canonical Tenant
checks in product databases, queries, jobs, caches, blobs and raw reads.

The server selects store, model, resource identity and admissible contextual
facts. Browser clients, customers and Agents must not supply an arbitrary graph
write or override a store/model/context field. Graph identifiers should be
opaque, scope-qualified and non-reused. Cross-Tenant parents and references
must be rejected before persistence.

OpenFGA authentication alone does not provide production-qualified separation
between graph readers, relationship writers and model/store administrators.
Its built-in fine-grained API access control is explicitly experimental and not
recommended for production [S11]. Qualify private ingress and authority-owned
adapters with separate capabilities; do not expose raw APIs to customer admins.
This is a deployment boundary, not a new universal IAM service.

Scope: routing, identifier encoding and guarded graph mutation for one deployment;
exclude fleet operation and policy design. Estimate confidence 3/10.

### 7. Current authorization, revoke and projection consistency

**This is the main technical proof still missing.** Define what the revoke API
acknowledges, when new protected admissions become denied, and how unavailable,
stale, indeterminate and denied results differ. Numerical bounds require
workload evidence and owner-approved objectives; do not invent a time limit.

`HIGHER_CONSISTENCY` bypasses OpenFGA caches. It cannot observe a product-source
revoke that has not reached the graph [S12]. Tagged PostgreSQL code also shows
that read topology matters: higher-consistency tuple reads select primary;
ordinary reads can select a secondary [S13]. Cache disablement is not proof of
product-source freshness.

| Same bounded authority slice | Fit before proof | Reliability after qualification | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| OpenFGA, authoritative source plus bounded projection, primary decision reads and no new positive-decision cache initially | 7 | 8 | 7 | 1,800-4,200 |
| SpiceDB with native conditional writes and causal/snapshot tokens, preserving the same source-authority contract | 7 | 8 | 7 | 1,500-3,800 |

Retain OpenFGA provisionally. First prove the smallest protocol for a direct
grant and revoke. Compare the identical fixture with SpiceDB if stale-writer
control or query semantics would require substantial custom machinery.

An outbox, watermark and local lease do not alone prevent an old delayed worker
from restoring a grant after a newer revoke. A whole-Tenant dirty gate can also
block a large customer behind one failed change. The decision protocol must
state its linearization and failure behavior rather than calling the projection
fresh because its last observed cursor advanced.

**Counterpoint from the second review:** OpenFGA Write is transactional and
rejects missing deletes by default [S14]. Deleting an exact predecessor marker
in the same transaction as a bounded graph delta and successor marker may
encode revision comparison. Tagged storage code supports this as a plausible
candidate [S13]. It is an untested hypothesis, not an admitted mechanism. Test
concurrent writers, lost acknowledgements, restore and duplicate delivery; do
not claim OpenFGA has no possible stale-writer protection.

SpiceDB supplies explicit transactional preconditions, graph revision tokens
and resource lookup cursors [S15-S16]. Those are relevant native differences.
They do not wait for an application outbox, create a cross-database transaction,
turn a historical snapshot into current authorization, or close an external
effect race. Cursor support also does not create sorted unique product pages.

Keep initial graph mutations inside one supported transaction, including marker
overhead. For a larger hierarchy or policy change, an explicit bounded
maintenance transition is preferable to a speculative online migration engine.
No second grant authority belongs in the Orchestrator ACL.

**Qualification:** pause the projector after source revoke; warm multiple caches;
lag the secondary; deliver duplicate, reordered and delayed old writes; lose a
write response; revoke and grant replacement the same subject; mutate source during a
decision; split a hierarchy edit. Record both incorrect admission and excessive
denial. Estimate confidence: 2/10 until this proof is complete.

### 8. Invitations, JIT provisioning and customer offboarding

The invariant is already clear: ending A's relationship must preserve B and the
stable identity. The unresolved implementation is the narrow lifecycle API and
its adapters. Invite acceptance, admin commands, approved JIT rules and future
SCIM should enter the same owning relationship semantics.

| Rollout alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Product-owned invite/admin relationship commands first; enterprise provisioning later | 9 | 9 | 6 | 1,200-2,800 |
| The same relationship commands plus one qualified customer-scoped SCIM connector immediately | 7 | 8 | 8 | 3,200-7,800 including the first connector |

Recommend the first option. Customer membership and explicit Tenant grant remain
separate. Pending invitations grant nothing. Accept/revoke/resend races need
one current challenge and idempotent outcome. Email can be a delivery hint or
verified contact channel; it is not permission to merge existing principals.

Native provider operations need semantic translation. Keycloak's reviewed
invitation path adds unmanaged membership before domain/IdP automatic-membership
checks; it does not prove corporate SSO [S07]. Managed-account deletion and
realm-level SCIM User deletion can affect the whole account [S17]. ZITADEL's
organization ownership and external-user grants are also distinct from product
guest membership [S18]. Do not expose broad provider CRUD as customer offboarding.

For a shared person, customer SCIM suspension/deletion should end that source's
relationship and dependent authority, not globally delete the person. The
facade must also reject global password, factor and recovery-field writes;
intercepting DELETE alone leaves an account takeover path. Customer-provided
profile fields remain source-scoped assertions.

SCIM `externalId` is optional, mutable and client-issued; it is not a generic
immutable identity key. Use server-issued scoped resource IDs, connection
incarnation and an explicit binding contract. Reused email, username or
externalId cannot revive a deleted identity [S26].

Inbound SCIM does not automatically carry ordered HR revisions. Versioning and
conditional updates are optional [S27]. A local arrival sequence can record an
old delayed enable after a newer disable without noticing stale source intent.
For one enterprise connector, choose a conservative disable latch requiring
explicit reactivation, or qualify actual upstream ordering/conditional state
and reconciliation. A latch has a visible rehire workflow cost. A successful
SCIM response must not pretend a refused reactivation happened. Re-enable never
automatically revives old grants, delegations or Runs.

Scope: pending invitation and relationship lifecycle plus, for the second row,
one connector's supported operations and reconciliation. Exclude a new SCIM
protocol implementation, SMTP infrastructure, UI and every enterprise provider.
Estimate confidence: baseline 4/10; SCIM 2/10.

### 9. Personal queues, search, lists and realtime

Authorization must protect the result of a query as well as each returned row.
Hidden items can leak through totals, ranking, facets, suggestions, notifications
and cursor advancement. Current Execution Observation already requires
authorization, disclosure and deletion gates before those protected query
effects; this review does not weaken that accepted contract.

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Narrow canonical scope and bounded candidate set, with current gates before protected query effects and on hydration | 9 | 8 | 6 | 900-2,300 |
| Authorization-aware candidate index plus authoritative current disclosure checks | 7 | 8 | 9 | 2,200-5,500 |

Recommend the first option for the initial queue/list. Measure the selected
resource shape before introducing an index. Ordinary OpenFGA ListObjects is
unsorted and bounded by count/deadline; it is not stable product pagination
[S19]. Streamed enumeration removes the count cap, not the time limit.
ListUsers can return `usersets` or wildcards; it is not a complete customer roster
or approver directory [S20].

Do not take an incomplete graph enumeration and report an exact total. Do not
rank/count all protected content and then remove forbidden rows. A candidate
index must also account for group changes, model changes and time conditions;
final checks prevent disclosure but cannot restore missing allowed results if
the index is incomplete.

Cursors bind subject, active scope, query, relevant policy/index generation and
expiry, and each page rechecks current access. Retain wake-only realtime;
rehydration, raw payload reads and exports recheck current disposition. A live
socket, old cursor, cached export or signed blob URL needs an explicit lifetime
and withdrawal policy. Already disclosed bytes cannot be recalled.

**Qualification:** more than 1,000 allowed and denied items; sparse grants;
nested groups; wildcard exclusions; revoke between pages; model change without
a tuple event; condition expiry; disclosure withdrawal; old cursor after restore.
Scope: one feature's query semantics, not all search/UI. Estimate confidence 2/10.

### 10. External connections and credentials used by Agents

Decide this with the first real integration. A connection needs a declared
owner, resource scope, acting mode and credential custody. Permission to create
or manage a connection is different from permission to use it for a particular
operation. Access to a SecretRef is not an authorization decision.

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Explicit user-owned or organization-owned connection, separate connect/manage/use capabilities and current checks before secret resolution | 9 | 9 | 6 | 1,400-3,200 for one provider |
| User-owned connections only for the initial feature, with explicit dependence on that user's continuing authority | 7 | 8 | 4 | 800-1,800 for one provider |

Recommend the explicit dual ownership model if autonomous organization work is
in the first slice; otherwise user-owned only is a coherent narrower rollout.
Do not silently keep using a departed employee's credentials as an
organization-owned integration.

GitHub App installation tokens and user access tokens have different attribution
and access semantics [S21]. Equivalent distinctions matter for other providers.
Token refresh does not preserve product permission; current connection policy
must precede credential use. Provider credentials remain inside custody/egress
adapters, outside prompts, ordinary events and logs. Webhooks authenticate their
source and map to the exact connection; their payload cannot select an arbitrary
Tenant or product actor. Model-provider accounts remain AR-owned.

Scope: the connection model and policy integration for one provider, excluding
a complete vault, every OAuth provider and UI. Estimate confidence 3/10.

### 11. Dangerous actions and approval: minimum contract now

Task assignment, task acceptance and dangerous-action approval are different
relationships. An Agent creating a task for a human does not need a universal
approval workflow merely because the recipient is human.

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Preserve a minimal feature-owned approval seam and keep unqualified dangerous effects blocked | 9 | 9 | 4 | 400-1,000 |
| Build a general multi-stage approval engine before a concrete dangerous feature | 3 | 6 | 9 | 5,000-12,000+ |

Recommend the first option, respecting the owner's deliberate deferral of the
detailed system. At the first dangerous feature, select eligible approvers,
separation of duties where required, exact intent/target/parameters, expiry,
scope revision, one-use or bounded-use semantics, cancellation and revalidation
at dispatch. A generic `approved: true` flag cannot represent those guarantees.

Current AR contains some provider-native execution at the whole-turn boundary.
It does not promise mediation of every internal tool call. Exact approval of
one external operation requires a mediated capability, or explicit acceptance
of the entire bounded turn's worst-case authority [R07]. Do not present a
fine-grained approval UI over a coarser enforcement boundary.

OD-032 already documents the race between final check and send. A signed permit,
short expiry, Dapr identity or FGA allow does not guarantee prevention if the
remote target cannot enforce the relevant conditional operation. Record
prevented, possible/unknown and confirmed effects honestly. Reauthorization
must not reopen a cut predecessor runtime operation.

Scope: the minimum interface and one feature's admission checks; it excludes
the deferred workflow and UI. Estimate confidence 3/10; generic engine 1/10.

### 12. Policy rollout, audit, recovery and outage behavior

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Explicit approved model binding, staged data changes, allow/deny canaries and admission-closed recovery | 9 | 8 | 6 | 800-2,200 |
| Independent per-Tenant policy generations and automated online fleet migrations | 6 | 8 | 8 | 1,500-3,500 |

Recommend the first option, permitting a declared maintenance transition before
building an online migration framework. Pin model IDs; do not silently follow
the newest uploaded model. Model rollback is not tuple/data rollback. Older
models cannot reconstruct relations deleted during a migration [S22].

Restore identity bindings, grant source, graph projection and policy activation
coherently before reopening admission. A stale backup must not outrun retained
revoke or retirement evidence. If evidence is missing, return a repair state,
not a new owner grant or an empty-store allow. Preserve the explicit full-machine
local rollback limitation from card 2.

Record who changed a grant, the exact subject/scope, intent/reason, revision,
idempotency identity, policy model and outcome reference. Keep credentials and
sensitive authority evidence outside ordinary telemetry. OpenFGA ReadChanges
does not capture every model, assertion, contextual or time-dependent policy
change and is not the complete product audit [S23].

For unavailable or indeterminate authority, default new protected admissions to
closed, with typed outcomes and operation-specific retry or repair guidance.
Indeterminate evidence is not necessarily repaired by retry. Do not substitute a cached allow without
an explicitly admitted policy. Previously admitted work, technical stopping and
new side effects require their own feature semantics; an IAM outage is not
automatically a global process kill. Preserve narrowly authorized stop,
quarantine and recovery paths without giving an unknown caller emergency power.

First-owner bootstrap and lost-admin recovery are separate from ordinary
customer membership. Keycloak bootstrap credentials are temporary operational
tools; realm export/import is not a complete session-aware backup or an
automatic configuration migration mechanism [S24-S25].

Scope: one deployment's activation and recovery integration, not a central audit
product, retention policy or backup infrastructure. Estimate confidence 2/10.

### 13. Reuse between Platform and Orchestrator without a new IAM framework

| Alternative | Fit | Reliability | Complexity | TS LOC |
| --- | ---: | ---: | ---: | ---: |
| Narrow reusable provider/credential mechanisms, owned ports, one canonical policy artifact for equivalent Orchestrator capabilities | 9 | 8 | 6 | 2,000-4,500 |
| Separate token, graph and role implementations in both repositories | 3 | 5 | 7 | 3,500-8,000 across two consumers |
| Universal IAM framework owning generic resources, grants, plugin policy and approval routing | 2 | 5 | 10 | 10,000-25,000+ |

Recommend the first option. Reusable mechanisms can cover mature OIDC/JOSE
integration, provider clients, opaque-ID encoding, deadlines/cancellation,
technical custody and shared conformance fixtures. Durable identity and grant
facts stay with their configured provider owners. Feature policy and aggregate
invariants stay with their business owners. Do not create an unowned `shared`
dumping ground or duplicate role semantics in each composition.

Managed product authority supplies Platform identity, customer membership,
tenancy and grant rules. Commercial authority is a separate logical capability
with its own port, even when the same deployment provides it; it cannot become
a standalone baseline dependency.
Standalone authority implements the required product capability independently.
The personal local adapter supplies ordinary owner grants under the same policy
contract. Platform still calls Orchestrator for Team/Work/Run operations.

Use Get Modular to assemble those implementations. Hooks and watch/load can
maintain a derived view or invalidate local state, but coalesced observation is
not a durable command, revoke record or approval history. Loss-sensitive changes
use the accepted durable event/outbox semantics. Do not change Get Modular
Observation into a second message broker to solve that separate problem.

A TypeScript package cannot standardize Go/Python behavior by itself. Versioned
Protobuf semantics and cross-language conformance preserve the same meaning
across services. SDKs handle contracts, scope and credentials; they do not decide
authoritative product permissions. Estimate confidence: 2/10.

## Decision status and qualification

### Immediate decisions and deferred detail

The following are design decisions, not thirteen separate approval prompts:

| Timing | Concrete decision or proof |
| --- | --- |
| Before first shared-account slice | Stable principal/binding owner, customer authentication-root scope, fixed capability vocabulary and customer admin limits |
| Before first authority integration | Managed/standalone/local composition, exact graph routing and guarded writer, current-decision/revoke semantics |
| Before local authority contracts or production implementation | Personal versus multiple-user scope, protected enrollment, key custody and recovery semantics; qualify them before release |
| With first browser/native auth slice | Same-origin BFF and refresh ownership; remote `PKCE` and qualified native credential storage |
| With first Agent command/job | Trusted actor/subject/Agent/Run binding and current authority checks without persisted human tokens |
| With first protected list | Correct disclosure, totals, sorting, cursor and current rehydration behavior |
| With first deployment | Pinned policy activation, coherent recovery and deliberately scoped emergency controls |
| With first enterprise connector | Company SSO provenance, scoped SCIM/JIT lifecycle and customer-admin limits |
| With first external effect | Connection ownership, acting mode and exact dangerous-action enforcement/approval |

Custom policy languages, arbitrary cross-Target federation, inter-organization
cooperation, a universal authorization-aware search index, automatic online
policy fleet migration and a generic approval engine are not prerequisites for
the first slice. Required Fully Local V1 support is not in that deferred group.

The owner-facing choices most likely to change product behavior are: personal
local scope; neutral versus company-controlled account roots and the timing of
corporate SSO; fixed templates versus custom roles immediately; and whether the
first integration must execute independently of an employee. Technical teams
can resolve many adapter and fixture details inside those choices.

### Smallest useful qualification sequence

1. One authority realm, Alice with A/B memberships, two scoped administrators,
   one project and one protected command/query. Prove Tenant substitution,
   independent offboarding, account-root isolation and exact role limits.
2. One grant/revoke protocol with stopped projection, old worker, lost response,
   current decision and grant replacement. Compare SpiceDB only against the same bounded
   requirements if the FGA solution becomes invasive or insufficient.
3. One durable Agent job with trusted dispatch context and one external
   connection. Revoke at dispatch pauses; distinguish human logout from ended
   grants and exact target-enforced prevention from ambiguous effects.
4. Same-origin browser session across two replicas, remote `PKCE` custody, and
   personal local bootstrap/restart/key-loss. Keep the Target and authority
   unchanged through ordinary refresh; reject cross-Target credentials.
5. One multi-page queue with sparse grants, current disclosure and old cursors;
   then model migration and inconsistent-backup recovery before reopening.

These fixtures should exercise the real selected provider/storage/profile where
the claim depends on it. Architecture fitness tests alone are not proof of
production IAM behavior.

### Cost envelope

A first bounded server authority slice can retain the earlier **6,000-12,000
handwritten production TS LOC** estimate, confidence **3/10**. It means one
provider deployment, A/B relationships, fixed direct grants, exact revoke, one
protected command/query, guarded model activation and two consumers.

An initial foundation spanning managed server, standalone server and personal
native local is more honestly **11,000-22,000 TS LOC**, confidence **2/10**. It
includes stable bindings, local enrollment/custody/recovery, queued Agent
authority, browser adaptation and one disclosure-correct list. It is not
complete V1 authorization, enterprise SSO/SCIM, all integrations or all feature
permissions. Missing reusable native primitives or a complex consistency proof
can exceed the upper bound. Tests, UI, infrastructure, generated code, provider
extensions and operational qualification are outside these intervals.

The owning open decision remains [OD-012](../open-decisions/OD-012-identity-authorization-tenant-isolation.md).
The existing [identity comparison](identity-provider-comparison-2026-10-21.md)
remains the broader provider survey. [OD-032](../open-decisions/OD-032-last-mile-side-effect-safety.md)
owns detailed effect safety. This research does not resolve those decisions or
alter accepted ADRs.

## Evidence and sources

### Repository evidence

- **R01:** [Orchestrator security and authority ownership at reviewed main](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/aaabc1e7cd2e2482668530e4412e61c2bca1f515/docs/architecture/security-architecture.md).
- **R02:** [Deployment profiles at reviewed main](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/aaabc1e7cd2e2482668530e4412e61c2bca1f515/docs/architecture/deployment-profiles.md).
- **R03:** [Canonical Fully Local V1 adoption](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/aaabc1e7cd2e2482668530e4412e61c2bca1f515/docs/decisions/0115-canonical-fully-local-v1-adoption.md).
- **R04:** [Platform strategic context map and authority rules](https://github.com/agent-teams-ai/agent-teams-platform/blob/f324ff92b7791d9dbadf38adad57b08595b0018a/docs/decisions/0007-platform-strategic-context-map-and-first-project-management-slice.md).
- **R05:** [Platform authority ownership review](https://github.com/agent-teams-ai/agent-teams-platform/blob/f324ff92b7791d9dbadf38adad57b08595b0018a/docs/architecture/platform-orchestrator-review/01-authority-ownership-matrix.md).
- **R06:** [Proposed principal/delegation mapping, with accepted constraints distinguished](https://github.com/agent-teams-ai/agent-teams-platform/blob/f324ff92b7791d9dbadf38adad57b08595b0018a/docs/architecture/platform-orchestrator-review/03-principal-delegation-model.md).
- **R07:** [Agent Runtime reviewed source tree](https://github.com/agent-teams-ai/agent-runtime/tree/6aa7152bd16282b18dfea23b8f5287041bb6adb8), including ADR-0010 and its `contained_unmediated_effect` boundary.
- **R08:** [Owner discussion and research branch PR86](https://github.com/agent-teams-ai/agent-teams-orchestrator/pull/86) and [Platform PR55](https://github.com/agent-teams-ai/agent-teams-platform/pull/55).
- **R09:** [Get Modular and scale review](get-modular-adoption-and-scale-review-2026-10-21.md) and [collaboration and hierarchy review](collaboration-hierarchy-and-workspace-review-2026-10-22.md).

### Primary external sources

Moving documentation was retrieved on 2026-10-23. Tagged source references are
evidence pins, not automatically selected production versions. The earlier
comparison uses Keycloak 26.8.1, ZITADEL 4.19.5 and OpenFGA 1.22.0; this review
checks relevant current documentation and exact source behavior separately.

- **S01:** [OpenID Connect Core, identity and authentication claims](https://openid.net/specs/openid-connect-core-1_0.html).
- **S02:** [RFC 10017, OAuth browser applications, August 2026](https://www.rfc-editor.org/rfc/rfc10017.html).
- **S03:** [RFC 8252, OAuth for native applications](https://www.rfc-editor.org/rfc/rfc8252.html).
- **S04:** [RFC 9700, OAuth security best current practice](https://www.rfc-editor.org/rfc/rfc9700.html).
- **S05:** [RFC 8628, device authorization](https://www.rfc-editor.org/rfc/rfc8628.html).
- **S06:** [Electron safeStorage security and backend limitations](https://www.electronjs.org/docs/latest/api/safe-storage).
- **S07:** [Keycloak 26.8.1 organization authentication and invitation ordering](https://github.com/keycloak/keycloak/blob/26.8.1/docs/documentation/server_admin/topics/organizations/authenticating-members.adoc).
- **S08:** [Keycloak 26.8.1 IdentityBrokerService](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/services/resources/IdentityBrokerService.java) and [OrganizationAuthenticator](https://github.com/keycloak/keycloak/blob/26.8.1/services/src/main/java/org/keycloak/organization/authentication/authenticators/browser/OrganizationAuthenticator.java). Source review supports the conditional A/B trust trace; no exploit was executed.
- **S09:** [RFC 6265, cookie isolation limitations](https://www.rfc-editor.org/rfc/rfc6265.html), sections 8.5 and 8.6.
- **S10:** [Keycloak token exchange, preview delegation and revocation semantics](https://www.keycloak.org/securing-apps/token-exchange).
- **S11:** [OpenFGA experimental API access control](https://openfga.dev/docs/getting-started/setup-openfga/access-control).
- **S12:** [OpenFGA query consistency](https://openfga.dev/docs/interacting/consistency).
- **S13:** [OpenFGA 1.22.0 PostgreSQL storage](https://github.com/openfga/openfga/blob/v1.22.0/pkg/storage/postgres/postgres.go) and [SQL common storage](https://github.com/openfga/openfga/blob/v1.22.0/pkg/storage/sqlcommon/sqlcommon.go). Marker-based revision comparison remains a hypothesis requiring tests.
- **S14:** [OpenFGA transactional Write and strict delete behavior](https://openfga.dev/docs/api/service/relationship-tuples/add-or-delete-tuples).
- **S15:** [SpiceDB consistency](https://authzed.com/docs/spicedb/concepts/consistency) and [read-after-write](https://authzed.com/docs/spicedb/concepts/read-after-write).
- **S16:** [Authorization API relationship preconditions and lookup API](https://github.com/authzed/api/blob/v1.57.0/authzed/api/v1/permission_service.proto), retrieved blob `8d965af3e1afc8947e42d284d4c04861740cccfa`; an exact server/client release remains to be selected for the experiment.
- **S17:** [Keycloak managed/unmanaged member lifecycle](https://github.com/keycloak/keycloak/blob/26.8.1/docs/documentation/server_admin/topics/organizations/managing-members.adoc) and [SCIM User deletion implementation](https://github.com/keycloak/keycloak/blob/26.8.1/scim/model/src/main/java/org/keycloak/scim/model/user/UserResourceTypeProvider.java).
- **S18:** [ZITADEL users and organization ownership](https://zitadel.com/docs/guides/manage/console/users-overview), [external user grants](https://zitadel.com/docs/concepts/features/external-user-grant), and [SCIM API](https://zitadel.com/docs/apis/scim2).
- **S19:** [OpenFGA ListObjects limits](https://openfga.dev/docs/api/service/relationship-queries/list-objects-a-user-is-related-to) and [streamed listing](https://openfga.dev/docs/api/service/relationship-queries/stream-all-objects-with-a-user-relationship).
- **S20:** [OpenFGA ListUsers semantics](https://openfga.dev/docs/api/service/relationship-queries/list-all-users-with-a-relationship-to-an-object) and [search integration](https://openfga.dev/docs/interacting/search-with-permissions).
- **S21:** [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation) and [user authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-on-behalf-of-a-user).
- **S22:** [OpenFGA immutable models](https://openfga.dev/docs/getting-started/immutable-models) and [model migration](https://openfga.dev/docs/modeling/migrating/migrating-models).
- **S23:** [OpenFGA tuple change feed](https://openfga.dev/docs/interacting/read-tuple-changes).
- **S24:** [Keycloak bootstrap and recovery](https://www.keycloak.org/server/bootstrap-admin-recovery).
- **S25:** [Keycloak import/export limitations](https://www.keycloak.org/server/importExport).
- **S26:** [RFC 7643, SCIM identity, externalId and password semantics](https://www.rfc-editor.org/rfc/rfc7643.html).
- **S27:** [RFC 7644, optional versioning and conditional updates](https://www.rfc-editor.org/rfc/rfc7644.html).

## Limitations and remaining questions

No report score demonstrates production safety, provider scale or a release
schedule. Primary-source capabilities can change; implementation must pin and
qualify the actual admitted versions and deployment profiles.

The permission vocabulary, exact native shell/custody implementation, corporate
authentication-root policy, graph consistency protocol, first integration and
dangerous-action workflow are not selected by this document. Proposed identity
aliases and local authority must receive exact durable owners before code.

The review intentionally avoids a global person graph, automatic cross-tenant
cooperation, a second authority ledger, custom OAuth cryptography, a universal
policy framework and a generic approval engine. This scope keeps the remaining
proofs concrete while preserving growth from a small team to a large customer.
