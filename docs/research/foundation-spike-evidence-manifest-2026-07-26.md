---
id: research.foundation-spike-evidence-manifest-2026-07-26
type: research
status: active
owner: architecture/reliability
summary: Compact audit manifest retained after deletion of all temporary pre-implementation spike harnesses.
related:
  - research.foundation-spike-evidence-2026-07-25
  - architecture.eventing
  - architecture.persistence
  - architecture.sdk-transports
  - architecture.testing
---

# Foundation Spike Evidence Manifest, 2026-07-26

## Retention policy

All temporary harnesses, databases, broker stores, containers, generated clients,
and raw evidence were checksum-verified and then deleted. This manifest retains
the outcome and final evidence fingerprint required for architecture audit. It
does not claim that deleted harnesses remain reproducible.

Unless a row says `report` or `result`, its SHA-256 is the fingerprint of that
group's verified `SHA256SUMS` manifest before deletion.

## Results

| Evidence group | Result | Retained SHA-256 |
|---|---:|---|
| SQLite/PostgreSQL semantic parity | 25/25 | `1395ce6be48e6a1df5a251f62d26bd8cd57b1fcabe34b55ccaa5bb37aea29260` |
| Protobuf, Buf, Connect, TypeScript and Go | 27/27 | `4f270336c7d212ff3a84cac43eff208c8d6b4e7dd70b13c1930eb874b114385e` result |
| Local Supervisor substrate and locks | 6/6 | `8a2baf53d3e4bdc9e239192213b893a56d2e19382f5579b755d7ea57f793fa6e` report |
| Managed local JetStream lifecycle | 10/10 | `2a44aacf5172a754c589f22d6abf4dae8f1d3be6f6406655d0b4ad3207876199` report |
| JetStream uncertainty probes | 3/3 | `5b085b86a3ae3689b42197b024345ab4a08f70db9ba5958d3f1c539039640936` report |
| Durable control feed | 16/16 | `f2aecea56320bd4f9e7e9d0683cebad215cb12aec797d84abdbe8bace8ebb89e` |
| SQLite command-lane placement | 24/24 | `896dccccc7a5398a3b0bfd785baad7fb97aa17431de371333a530a7b5a7cc9cc` |
| Adversarial Supervisor activation | 42/42 | `4fea1f80c478ae258d25d5a461b118ca530e1e6c88ef481a3e551eaf8b943d0a` |
| Persistence migrations and backup | 16/16 | `bdcd03923eebd2750a2869cfe96196a242d9acd691715380691b3c3b051766df` |
| Protocol evolution | 36/36 | `4b23a48a6e9837286213a26667880926ffad34ae6ade27712cd3b1ae1dfe5649` |
| Persistence failure ambiguity | 16/16 | `d90a526c88a1c81ed95b91825ae8f3470a438f58bd2e283c90fe0c844570dfcc` |
| Multi-context backup barrier | 25/25 | `cd90d89820c0dbe52c4517371a56225d913dada668be790d21649165a1998500` |
| Credential and cursor rotation | 43/43 | `e29c1ab122039ac3d6b68006389a4f7647d03b6f1afd01d7206c65f7b2f838f5` |
| Journal privacy and replay | 16/16 | `fffdcc73ed9fe3108c506c44f7482939231057a9006afc22a379b4d352cfdf37` |
| SDK publication and browser package graph | 39/39 | `74c0faf6088042af808a32cdb8e8cc44c1b7ed60a3c525e8a00a50cd4b102b2c` |
| PostgreSQL tenant isolation | 40/40 | `72bcec06953789d8df51b797dbbaf4227890fbd83f7ad105f60c50dbc950a072` |
| Local JetStream store resilience | 56/56 | `581c18dbd929950479162d00a847d4954964eba3f28b83b713d93b4878005cbd` |
| Hosted JetStream R3 topology | 56/56 | `5658894186549dd097202edabddd80772184ca5e8357023963b14b784d0cd64a` |
| NATS 2.14.3 R3 topology follow-up | 28/28 | `351323edf2557896eccd4baac551d2071cad5dcd65b55bba28986bfb52749ad8` |
| Cross-context process manager | 168/168 | `70fa87ead23660b68b3dc115f6f89e26658db2aff4162aa14fc6e8fb2774dda7` |
| Connect browser and reverse-proxy matrix | 121/121 | `7d263613e6ed4527fc2553eff0f18f02515a1a1b722e999eeb7aaf5fc7a8f44c` |
| Temporal workflow boundary | 70/70 | `f8818afbd39e507b849ec697cb8eb6186f09bbdeee4cdc5b9bfa4aa9ce1eef5f` |
| PgBouncer tenant safety | 75/75 | `582a52f83d6ed87688c7195edb15ac118a8fe55548223e7e37dcb431796d064c` |
| Mixed-version NATS and topology migration | 32/32 | `c23c3b1a9028e8439615566758bdad7a778a404b380456d45147b274cd8454df` |
| JSON integration-event schema evolution | 17/17 | `cc8dc679d4c6a5500ea8d47ffb547da28d5f35b097e085de471684d53e75c6da` |
| OpenTelemetry durable causality | 70/72 | `4a739da9f13425e23984ae67a69a7ce2277e0872ac8182fb670819ebbc966ebf` |
| PostgreSQL failover, WAL, and PITR | 38/38 | `8f1814cfe0bd0e9b05cf12853257cf09aea567a85b1cfd63d1cc893f9d6e9f3a` |
| Desktop compatibility facade and API inventory | 10/10 | `c8f4456b1d915ecf872ac2c356a7673c6c510b56bfdc1ebaaa46d0ef39adc2c7` synthetic manifest |

Total: **28 groups, 1125 passed checks out of 1127 executed**. The two failures
are the same unsupported OpenTelemetry JavaScript metric-exemplar assertion in
two clean runs. No failed business, persistence, delivery, migration, or recovery
assertion is hidden in the total.

## Exact late-stage environments

- Mixed NATS: servers 2.14.2 and 2.14.3; modular NATS JavaScript clients 3.4.0.
- JSON events: Node.js 24.18.0, Ajv 8.20.0, modular NATS clients 3.4.0,
  NATS server 2.14.3.
- OpenTelemetry: API 1.9.1, stable SDK 2.10.0, experimental packages 0.221.0,
  semantic conventions 1.43.0, Collector Contrib 0.157.0.
- PostgreSQL: official PostgreSQL 18.4 image and `node-postgres` 8.22.0.
- Desktop facade: `777genius/agent-teams-ai` commit
  `082bf7e8fd426578905efaab97645bd6ef98b31c`.

## Desktop component fingerprints

The Desktop synthetic manifest is the SHA-256 of these two ordered entries:

```text
b8a38d62b0b61c79639684fed8792f5b4326dbb43a77523bf52c9f7fffd7ca9f  facade-results.json
b23b4251eccf5221d9717aa4619f756f609a6f784d6b96c15caa197f181dee63  inventory-results.json
```
