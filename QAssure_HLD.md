# QAssure — High Level Architecture

**Document:** QASSURE-HLD-001 | **Version:** 1.0.0 | **Classification:** CONFIDENTIAL

---

## 1. System Overview

QAssure is a **cloud-agnostic, multi-tenant Quality Management System (QMS)** for the pharmaceutical domain. It is deployed as a monolithic backend with a React SPA frontend on Kubernetes.

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CDN / WAF Layer                               │
│           Cloudflare / Fastly / AWS CloudFront                   │
│        DDoS Protection · Static Cache · WAF Rules               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Cloud Load Balancer (L4)                         │
│          Distributes traffic across K8s worker nodes            │
│         AWS NLB / Azure LB / GCP LB / MetalLB (bare metal)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              NGINX Ingress Controller (L7)                       │
│     TLS Termination · Path Routing · Rate Limiting              │
│     /api/* → Backend    /socket.io → Backend    /* → Frontend   │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
           ▼                                  ▼
┌──────────────────────┐          ┌───────────────────────┐
│   Backend Service    │          │   Frontend Service     │
│   Node.js / Express  │          │   React 19 SPA         │
│   Port 3000          │          │   nginx:alpine          │
│   2–10 pods (HPA)    │          │   2 pods               │
└──────────┬───────────┘          └───────────────────────┘
           │
           ├──────────────────────────────────────────────────────┐
           │                                                       │
           ▼                                                       ▼
┌──────────────────────┐                             ┌────────────────────────┐
│     Data Tier         │                             │    Messaging Tier       │
│                       │                             │                         │
│  PostgreSQL 15        │                             │  Kafka 3.x              │
│  Primary DB · :5432   │                             │  Event Streaming · :9092│
│  120+ tables          │                             │                         │
│  tenant_id isolation  │                             │  ZooKeeper              │
│                       │                             │  Kafka Coordinator      │
│  Redis 7              │                             │                         │
│  Cache + SLA Timers   │                             │  Socket.io              │
│  :6379                │                             │  Real-time WS           │
│                       │                             └────────────────────────┘
│  Object Storage       │
│  MinIO / S3 / GCS     │
│  File Attachments     │
└──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Search & Analytics                            │
│  Elasticsearch 8.x · Port 9200 (Full-text & Logs)               │
│  Pinecone (Vector Store) · Managed Service (Semantic Search)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Observability                               │
│    Prometheus (metrics) · Grafana (dashboards) · AlertManager   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      CI/CD Pipeline                              │
│         Jenkins → Container Registry → ArgoCD → K8s            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Layers

### Layer 1 — CDN / WAF

| Attribute | Detail |
|---|---|
| Purpose | Cache static assets, block malicious traffic, DDoS protection |
| Options | Cloudflare (recommended), Fastly, AWS CloudFront, Azure Front Door |
| What it caches | React SPA bundles (JS, CSS, images) |
| What passes through | All `/api/*` requests (dynamic, not cached) |

---

### Layer 2 — Cloud Load Balancer

| Attribute | Detail |
|---|---|
| Type | L4 (TCP) — does NOT terminate TLS |
| Purpose | Distribute traffic across K8s worker nodes |
| Health check | Polls NGINX pods on `:10254/healthz` |
| Options | AWS NLB, Azure LB, GCP LB, MetalLB (bare metal) |
| Output | Single static external IP for DNS |

---

### Layer 3 — NGINX Ingress

| Attribute | Detail |
|---|---|
| Type | L7 (HTTP/HTTPS) |
| TLS termination | Yes — via cert-manager + Let's Encrypt (free) |
| Routing | Path-based: `/api` → backend, `/` → frontend |
| Rate limiting | 300 req/min per IP on API paths |
| WebSocket | Upgrades connection for Socket.io (real-time notifications) |
| File uploads | Allows up to 50MB body size |

---

### Layer 4 — Application Tier

#### Backend — Node.js / Express (Monolith)

All business logic lives in a single deployable unit.

| Module | Responsibility |
|---|---|
| Auth Module | JWT issue/verify, API key auth, bcrypt password hashing |
| Super Admin Service | Tenant management, module registry, identity sync via webhooks |
| Tenant Admin Service | RBAC, user management, workflow configuration |
| Tenant User Service | Document CRUD, CAPA, training, supplier management |
| Workflow Engine | State machine execution, SLA enforcement via Redis sorted sets |
| Notification Service | Email (Nodemailer), Tenant-specific SMTP, Failed Email queue |
| AI Gateway | Multi-provider LLM (OpenAI/Google/Anthropic), Prompt MGMT |
| Reporting & Analytics | Dashboard widgets, KPI tracking, scheduled reports |

#### Frontend — React 19 SPA

| Component | Detail |
|---|---|
| Framework | React 19 + TypeScript + Vite 7 |
| State | Redux Toolkit (authSlice + themeSlice) + redux-persist |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| HTTP | Axios with interceptors (auto-attaches JWT) |
| Real-time | Socket.io client (in-app notifications) |
| Served via | nginx:alpine container |

---

### Layer 5 — Data Tier

| Store | Technology | Purpose |
|---|---|---|
| Primary DB | PostgreSQL 15 | All business data — 120+ tables, tenant_id isolation |
| Vector Store | Pinecone | Semantic embeddings (1024-dim), AI search context |
| Cache / Timers | Redis 7 | Session store, SLA countdown timers (sorted sets) |
| File Storage | MinIO / S3 / GCS / Azure Blob | Document attachments, report exports |

---

### Layer 6 — Messaging Tier

| Component | Purpose |
|---|---|
| Kafka 3.x | Async event streaming — notifications, audit logging, search indexing |
| ZooKeeper | Kafka cluster coordination |
| Socket.io | Real-time WebSocket — in-app notifications to browser |

**Event flow:**

```
Business action (e.g. document submitted)
    │
    ▼
Workflow Engine publishes event to Kafka
    │
    ├──► qassure.notifications → Notification Service → Email (Tenant SMTP) + In-app
    ├──► qassure.audit         → Audit Logger → audit_logs table
    ├──► qassure.search.index  → ES Indexer → Elasticsearch + Pinecone
    └──► qassure.module.sync   → Webhook Dispatcher → External Modules (Sync)
```

---

### Layer 7 — Search & Analytics

| Attribute | Detail |
|---|---|
| Technologies | Elasticsearch 8.x + Pinecone (Managed) |
| Search Layers | Full-text (ES) + Semantic/Vector (Pinecone) |
| Indices / Namespaces | Documents, audit logs, CAPA records, Knowledge Base |
| Use cases | Hybrid search, compliance audit, RAG (Retrieval-Augmented Gen) |
| Install (ES) | ECK Operator (cloud-agnostic, K8s-native) |

---

### Layer 8 — Observability

| Component | Purpose |
|---|---|
| Prometheus | Scrapes app metrics (`/api/v1/metrics`) + K8s metrics |
| Grafana | Dashboards — API health, SLA breaches, tenant activity |
| AlertManager | Routes alerts → email / Slack / PagerDuty |

**Key metrics monitored:**

- API error rate (5xx)
- SLA breach count per tenant
- Active workflow instances
- Pod CPU / memory
- PostgreSQL connection pool usage
- Kafka consumer lag

---

### Layer 9 — CI/CD Pipeline

```
Code push to Git
      │
      ▼
Jenkins
  ├── Lint (ESLint)
  ├── Unit tests (Jest)
  ├── Docker build  --platform linux/amd64
  ├── Push image to Container Registry
  └── DB Migrate (Sequelize) -- (Staging/Prod)
            │
            ▼
      ArgoCD (GitOps)
            │
            ▼
      K8s Rolling Deploy (zero downtime)
```

| Tool | Role |
|---|---|
| Jenkins | Build, test, containerise |
| Container Registry | Harbor / ECR / GAR / ACR — versioned images |
| ArgoCD | GitOps — syncs Helm chart changes to cluster |
| Helm | Templated K8s manifests per environment |

---

## 3. Multi-Tenancy Model

```
Request arrives with JWT
        │
        ▼
Auth Middleware      → verifies JWT signature + expiry
        │
        ▼
Tenant Middleware    → extracts tenant_id from JWT claims
        │
        ▼
All DB queries       → WHERE tenant_id = :current_tenant_id
        │
        ▼
Response             → only current tenant's data returned
```

**Database isolation:** Shared PostgreSQL database. Every table has `tenant_id` foreign key. Application middleware enforces boundary on every query. No tenant can access another tenant's data.

---

## 4. Security Architecture

```
Internet → Cloudflare WAF          Block known threats before infra
        → NGINX rate limiting       Throttle burst traffic per IP
        → TLS (HTTPS)               Encrypted in transit
        → JWT auth middleware        Every request authenticated
        → RBAC middleware            Role checked before handler executes
        → Tenant context             tenant_id enforced on every DB call
        → Helmet.js                  HTTP security headers (HSTS, CSP)
        → K8s Secrets               No plaintext credentials in pods
```

---

## 5. High Availability

| Component | Min Pods | Max Pods | Scale Trigger |
|---|---|---|---|
| Backend (Node.js) | 2 | 10 | CPU > 70% |
| Frontend (React) | 2 | 5 | CPU > 70% |
| NGINX Ingress | 2 | 2 | Manual |
| PostgreSQL | 1 primary | + read replicas | Manual |
| Redis | 1 master | + replica | Manual |

**Node failure:** Minimum 3 K8s worker nodes. Pod anti-affinity rules spread replicas across nodes. If one node fails, pods reschedule automatically.

**Zero-downtime deploys:** Rolling update strategy — new pod starts and passes health check before old pod is terminated.

---

## 6. Technology Stack Summary

| Category | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Redux Toolkit, Tailwind CSS, shadcn/ui |
| Backend | Node.js LTS, Express 4, Sequelize ORM, KafkaJS, Socket.io |
| Database | PostgreSQL 15, Pinecone (Vector Store) |
| Cache | Redis 7 (ioredis) |
| Messaging | Kafka 3.x + ZooKeeper |
| Search | Elasticsearch 8.x |
| File Storage | MinIO (cloud-agnostic) / S3 / GCS / Azure Blob |
| Container | Docker (linux/amd64), Kubernetes |
| Ingress | NGINX Ingress Controller + cert-manager |
| GitOps | ArgoCD + Helm |
| CI | Jenkins |
| Observability | Prometheus + Grafana + AlertManager |
| Security | Helmet.js, JWT, bcrypt, K8s Secrets, HashiCorp Vault (planned) |

---

## 7. Outstanding Items (Pre-Production)

| # | Item | Priority |
|---|---|---|
| 1 | Replace `localhost` module URLs with K8s internal DNS | Critical |
| 2 | Integrate HashiCorp Vault for secrets management | High |
| 3 | Define DR strategy — RTO / RPO targets | High |
| 4 | Enable PostgreSQL read replica for reporting queries | Medium |
| 5 | Configure audit log retention policy (pharma compliance: 7 years) | High |
| 6 | Add Redis adapter to Socket.io for multi-pod sync | Critical |

---

*QAssure HLD · QASSURE-HLD-001 · v1.0.0 · Cloud-Agnostic · Prepared for L&T Technology Services*
