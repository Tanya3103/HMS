# 🏥 CarePulse HMS – Enterprise Hospital Management System
### On-Device, High-Performance Clinical Operating System

CarePulse HMS is a full-stack, enterprise-grade Hospital Management System designed for hospital networks, outpatient clinics, and private practices. It operates **100% locally on-device** with **zero external cloud API keys**, zero telemetry leakage, and zero vendor lock-in.

---

## ⚡ Key Performance Highlights

* **$\ge 35\%$ Latency Reduction (Achieved $\mathbf{92.4\%}$):** Average query response time is **`9.09 ms`** (p95: **`12.09 ms`**) across 16 core endpoints backed by compound-indexed MongoDB schemas.
* **100+ Concurrent Updates:** Processed 100 simultaneous triage check-in mutations in **`1.31 seconds`** (throughput: **`76.2 ops/sec`**) with **0% dropped requests** and **0 state deadlocks**.
* **Zero Double-Booking Guarantee:** Atomic slot lock enforces uniqueness across Doctor, Date, and TimeSlot (`201 Created` vs `409 Conflict`).
* **Instant Client Startup:** Compiles and hot-reloads via Vite in under **`1.0 second`**.

---

## 🛠️ Architecture & Tech Stack

```text
┌─────────────────────────────────────────────────────────────┐
│                       Client Tier                           │
│  React 19 • Vite • Vanilla CSS (Tokens) • Lucide Icons     │
│  Port: http://localhost:5173                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API + Bearer JWT
┌──────────────────────────────▼──────────────────────────────┐
│                       Server Tier                           │
│  Node.js • Express.js • JWT + bcrypt • Helmet & Rate Limiter │
│  Port: http://localhost:5000                                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM (Port 27017 / 27018)
┌──────────────────────────────▼──────────────────────────────┐
│                      Database Tier                          │
│  Standalone Local MongoDB OR Embedded Memory Server         │
└─────────────────────────────────────────────────────────────┘
```

* **Frontend:** React 19, Vite, Vanilla CSS custom design token system (`tokens.css`), Lucide React icons.
* **Backend:** Node.js v20+, Express.js (modular controllers/routes), JWT auth with silent refresh rotation, bcrypt password hashing, Zod schema validation.
* **Database:** MongoDB via Mongoose. Features an **automatic fallback engine**: checks port `27017` for an active standalone MongoDB service; if stopped, automatically boots an on-device embedded MongoDB instance on port `27018`. **No manual database installation required.**

---

## 🚀 Quick-Start Guide (One-Command Launch)

### Prerequisites
* **Node.js** v18.0 or higher ([Download Node.js](https://nodejs.org/))
* **npm** v9.0 or higher

### 1. Install All Dependencies
From the repository root directory (`d:\HM`):
```bash
npm run install:all
```
*(This installs root dependencies, server dependencies, and client dependencies).*

### 2. Seed Initial Clinical Data
Populate the database with pre-configured departments, doctors, test patients, appointments, and medical history:
```bash
npm run seed
```

### 3. Launch Development Environment
Run both backend and frontend concurrently with a single command:
```bash
npm run dev
```

* 🖥️ **Frontend:** [http://localhost:5173](http://localhost:5173)
* ⚙️ **Backend API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
* 🩺 **Health Probe:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

---

## 🔑 Pre-Configured Demo Credentials

The login gateway includes **1-Click Quick Fill** buttons for instant role switching:

| Role | Email Address | Password | Permissions & Views |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@carepulse.local` | `Admin@123` | Hospital stats, provider directory, compliance audit trail |
| **Doctor** | `doctor.rajesh@carepulse.local` | `Doctor@123` | Active clinic queue, consultation EMR drawer, e-prescriptions |
| **Staff (Reception)** | `staff.elena@carepulse.local` | `Staff@123` | Master triage grid, fast check-in, walk-in registration |
| **Patient** | `patient.sarah@carepulse.local` | `Patient@123` | Self-service 3-step booking, longitudinal health timeline |

---

## 🧪 Verification & Benchmarking Test Commands

Run the automated test harnesses directly from the project root:

```bash
# 1. Verify Auth, JWT Rotation, and Patient Self-Registration
npm run test:auth

# 2. Verify Clinical Feature Workflows (Booking, Queue, EMR, Telemetry)
npm run test:features

# 3. Verify Offline Health Polling & Audit Trail Integrations
npm run test:integrations

# 4. Run Latency Benchmark Across 16 Core Endpoints
npm run benchmark:latency

# 5. Run 100-Request Concurrency & Double-Booking Collision Stress Test
npm run benchmark:concurrency

# 6. Verify Frontend Production Build
npm run build
```

---

## 📁 Repository Directory Structure

```text
HM/
├── client/                          # React 19 Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/               # Admin Stats, User Management, Audit Logs
│   │   │   ├── auth/                # AuthGateway with 1-Click Demo Fill
│   │   │   ├── common/              # Button, Modal, StatusBadge, Input, Print Modal
│   │   │   ├── doctor/              # Queue, Consultation Drawer, E-Prescriptions
│   │   │   ├── layout/              # AppLayout, Header, Sidebar
│   │   │   ├── patient/             # Patient Dashboard, Stepper Booking, EMR Timeline
│   │   │   └── staff/               # Master Triage Grid, Walk-In Modal, Directory
│   │   ├── context/                 # AuthContext, ToastContext
│   │   ├── services/                # Axios API Client with Auto-Refresh Interceptors
│   │   └── styles/                  # tokens.css, global.css
│   └── vite.config.js
│
├── server/                          # Express.js Modular Backend
│   ├── src/
│   │   ├── config/                  # db.js (Probing & Embedded Fallback Engine)
│   │   ├── controllers/             # auth, appointment, medicalRecord, staff, admin
│   │   ├── middleware/              # auth, rbac, ownershipGuard, validator, rateLimit
│   │   ├── models/                  # User, Patient, Doctor, Appointment, EMR, Audit
│   │   ├── routes/                  # Express Router modules
│   │   ├── seeds/                   # seed.js (Clinical seeder engine)
│   │   └── utils/                   # token.js (JWT issuance & verification)
│   ├── testAuth.js                  # Automated Auth verification
│   ├── testFeatures.js              # Automated Features integration test
│   ├── testIntegrations.js          # On-device integrations verification
│   ├── benchmarkLatency.js          # 16-endpoint latency profiler
│   └── benchmarkConcurrency.js      # 100-request concurrency stress test
│
├── BENCHMARK_REPORT.md              # Detailed latency & concurrency analysis
├── IMPLEMENTATION_PLAN.md           # 9-Phase Engineering & Delivery Plan
├── BACKEND_SCHEMA.md                # Database Schema & Index Specifications
├── DESIGN_BRIEF.md                  # Clinical Neo-Minimalist Design Guidelines
├── PRD.md                           # Product Requirements Document
├── TRD.md                           # Technical Requirements Document
├── APP_FLOW.md                      # UI Workflow & Interaction Specifications
└── package.json                     # Root orchestrator with unified scripts
```

---

## 🔒 Security & Compliance Architecture

* **Role-Based Access Control (RBAC):** Strict middleware guards isolate views and APIs. Patients attempting to access `/admin` or staff attempting to query unauthorized medical records receive an immediate `403 FORBIDDEN`.
* **Token Rotation:** Access tokens expire in 15 minutes. Refresh tokens are hashed and stored in MongoDB with 7-day TTL and rotation on every refresh request.
* **Local Audit Logging:** Compliance-critical actions (`CHECK_IN`, `START_CONSULTATION`, `DISCHARGE`, `USER_CREATE`) write immutable records to `audit_logs` tracking IP address, User-Agent, operator ID, and timestamp.
* **Print-Ready Medical Records:** The electronic prescription system includes dedicated `@media print` rules, generating clean, watermark-stamped clinical prescriptions directly to standard printers or PDF export.

---

## 💡 Troubleshooting & FAQ

#### 1. What if I do not have MongoDB installed on my computer?
You do not need to install MongoDB. When the backend starts, if it cannot connect to port `27017`, it automatically launches an embedded in-memory MongoDB instance on port `27018`.

#### 2. How do I reset the database to a clean demo state?
Simply execute:
```bash
npm run seed
```
This resets collections and re-populates all demo doctors, staff, patients, and appointment queues.

#### 3. How do I test offline detection?
Stop the server process in your terminal. The frontend client will immediately display a persistent yellow banner: `"Server Disconnected: Running in on-device offline mode"`. Once restarted, the client will detect the health heartbeat and auto-dismiss the banner.
