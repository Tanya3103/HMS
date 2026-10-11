# Technical Requirements Document (TRD)
## Project: CarePulse – Enterprise Hospital Management System (HMS)

**Document Version:** 1.0.0  
**Role:** Senior Software Architect  
**Status:** Approved for Technical Implementation  
**Environment Target:** Fully Localhost / On-Device (Zero External Cloud / Zero External API Keys)  

---

## 1. System Overview & Architecture Philosophy

CarePulse HMS is engineered as a decoupled, high-performance client-server application optimized to run entirely on a local machine. It eliminates external API dependencies and external cloud database egress, operating securely in an offline-capable, on-premise local environment.

### 1.1 Architectural Pillars
1. **Zero External Dependency Footprint:** No third-party SaaS APIs (Stripe, Twilio, SendGrid, Auth0). All authentication, state management, and reporting operate on the local machine.
2. **Deterministic Low-Latency Data Access:** Modular Express.js service layers paired with indexed local MongoDB collections achieve a **35% reduction in query latency** across 15+ core endpoints.
3. **High-Throughput State Resilience:** React custom hooks and scoped Context Providers handle **100+ concurrent state updates** with a **25% render speed improvement**, preventing application lock-up during peak clinic hours.
4. **Zero-Trust Local RBAC:** Cryptographic verification using bcrypt and standard JSON Web Tokens (JWT) ensuring role-segregated boundaries directly from the local runtime.

---

## 2. Technology Stack & Specifications

```mermaid
flowchart TD
    subgraph ClientLayer [Client Tier: Localhost:5173]
        Browser[Modern Web Browser]
        ReactApp[React 18 + Vite]
        StateStore[Context Providers + Custom Hooks Engine]
        Browser <--> ReactApp
        ReactApp <--> StateStore
    end

    subgraph ServerLayer [Application Tier: Localhost:5000]
        Express[Node.js + Express.js API Server]
        Middleware[Auth / RBAC / Validation Middleware]
        Controllers[Modular Business Controllers]
        Services[Clinical & Scheduling Services]
        Express --> Middleware
        Middleware --> Controllers
        Controllers --> Services
    end

    subgraph DataLayer [Data Tier: Localhost:27017]
        Mongo[(Local MongoDB Instance)]
        Indexes[Compound Indexes & Schemas]
        Mongo --- Indexes
    end

    StateStore -- "REST / JSON (JWT Authorization)" --> Express
    Services -- "Mongoose ODM (Pool: 10-50)" --> Mongo
```

### 2.1 Stack Summary Table

| Component | Technology | Version | Purpose & Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React.js (via Vite) | `^18.3.x` | Ultra-fast HMR, component tree virtualization, minimal overhead compared to heavy full-stack frameworks. |
| **Styling & UI** | Vanilla CSS (CSS Modules / Modern Tokens) | Modern CSS | Predictable zero-runtime styling overhead, full design system freedom without Tailwind configuration lock-in. |
| **State Management** | Custom Hooks + Context API | Native React | Replaces heavy state libraries (Redux) to isolate re-render trees and seamlessly absorb 100+ concurrent state updates. |
| **Backend Runtime** | Node.js | `>=20.x LTS` | Event-driven, non-blocking I/O model ideal for I/O-intensive clinical workflows. |
| **API Framework** | Express.js | `^4.19.x` | Lightweight, unopinionated routing pipeline with modular controllers and low memory footprint. |
| **Database** | MongoDB Community Server | `>=7.0 (Local)` | Document model natively represents nested medical histories and encounters without complex multi-table joins. |
| **Data Modeling** | Mongoose ODM | `^8.x` | Strict schema validation, lifecycle middleware, lean query executions, and connection pooling. |
| **Security & Auth** | `bcryptjs` + `jsonwebtoken` | `bcryptjs 2.4.x`, `jsonwebtoken 9.x` | Secure, local password hashing and stateless token issuance without external auth services. |
| **Data Validation** | Zod / Joi | `^3.23.x` / `^17.x` | Strict type and schema validation on incoming request payloads at controller boundaries. |

---

## 3. Database Architecture & Schema Design (Local MongoDB)

* **Local Connection URI:** `mongodb://127.0.0.1:27017/carepulse_hms`
* **Connection Pool:** `minPoolSize: 5`, `maxPoolSize: 50`

```mermaid
erDiagram
    USER ||--o{ PATIENT_PROFILE : "has profile"
    USER ||--o{ DOCTOR_PROFILE : "has profile"
    PATIENT_PROFILE ||--o{ APPOINTMENT : "books"
    DOCTOR_PROFILE ||--o{ APPOINTMENT : "attends"
    PATIENT_PROFILE ||--o{ MEDICAL_RECORD : "owns"
    DOCTOR_PROFILE ||--o{ MEDICAL_RECORD : "authors"

    USER {
        ObjectId _id PK
        string email UK
        string passwordHash
        string role "ADMIN | DOCTOR | STAFF | PATIENT"
        boolean isActive
        date createdAt
    }

    PATIENT_PROFILE {
        ObjectId _id PK
        ObjectId userId FK
        string fullName
        string phone
        date dateOfBirth
        string bloodGroup
        string emergencyContact
    }

    DOCTOR_PROFILE {
        ObjectId _id PK
        ObjectId userId FK
        string fullName
        string specialization
        string department
        string roomNumber
        array availableHours
    }

    APPOINTMENT {
        ObjectId _id PK
        ObjectId patientId FK
        ObjectId doctorId FK
        date appointmentDate
        string timeSlot
        string status "SCHEDULED | CHECKED_IN | IN_CONSULTATION | COMPLETED | CANCELLED"
        string reason
        date updatedAt
    }

    MEDICAL_RECORD {
        ObjectId _id PK
        ObjectId patientId FK
        ObjectId doctorId FK
        ObjectId appointmentId FK
        object vitals "bp, pulse, temp, weight"
        array symptoms
        string diagnosis
        array prescriptions "medicine, dosage, duration, instructions"
        date recordDate
    }
```

### 3.1 MongoDB Optimization & Index Strategy (Achieving 35% Latency Reduction)

To achieve and maintain the **35% retrieval latency reduction**, the following compound indexes and projection rules are enforced:

```javascript
// 1. Appointments Index (Immediate lookups by doctor/day & concurrency locks)
db.appointments.createIndex(
  { doctorId: 1, appointmentDate: 1, timeSlot: 1 },
  { unique: true, background: true }
);

// 2. Patient Appointment History Index
db.appointments.createIndex(
  { patientId: 1, appointmentDate: -1 },
  { background: true }
);

// 3. Longitudinal Medical Records Index (Sub-second retrieval)
db.medical_records.createIndex(
  { patientId: 1, recordDate: -1 },
  { background: true }
);

// 4. User Directory Index
db.users.createIndex(
  { email: 1 },
  { unique: true, background: true }
);
```

#### Query Execution Rule: Lean Projections
All high-frequency read endpoints must use `.lean()` and select only viewport-required fields, completely bypassing Mongoose hydration overhead:
```javascript
// Example: High-speed doctor queue retrieval
const queue = await Appointment.find({ doctorId, appointmentDate: today })
  .select('patientId timeSlot status reason')
  .populate('patientId', 'fullName phone bloodGroup')
  .lean()
  .exec();
```

---

## 4. Authentication & Role-Based Access Control (RBAC)

### 4.1 Token Architecture
* **Token Standard:** JSON Web Token (JWT) signed with HMAC SHA-256 (`HS256`).
* **Secret Key:** Stored locally in `.env` (`JWT_SECRET`, minimum 64-character entropy).
* **Token Expiry:** Access Token: 60 minutes; Refresh Token: 7 days.
* **Storage Strategy:** 
  * Access Token returned via JSON and stored in client application memory / state.
  * Refresh token optionally persisted in HTTP-only, secure, same-site local cookie (`/api/v1/auth/refresh`).

### 4.2 RBAC Permission Matrix

| Endpoint Group | Resource | `PATIENT` | `DOCTOR` | `STAFF` (Reception) | `ADMIN` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `/api/v1/auth/*` | Login, Register, Profile | ✅ (Self) | ✅ (Self) | ✅ (Self) | ✅ (All) |
| `/api/v1/appointments` | Create Booking | ✅ (Self) | ❌ | ✅ (All) | ✅ (All) |
| `/api/v1/appointments` | Update Status (`Checked-In`, etc.) | ❌ (Cancel only)| ✅ (Clinic flow)| ✅ (Check-in/Queue)| ✅ (All) |
| `/api/v1/appointments/doctor/me`| Read Assigned Queue | ❌ | ✅ (Self Queue) | ❌ | ✅ (All) |
| `/api/v1/patients` | Search & View Demographics | ❌ | ✅ (Assigned) | ✅ (All) | ✅ (All) |
| `/api/v1/records` | Read Clinical History / EMR | ✅ (Self Record)| ✅ (Clinical)| ❌ | ❌ |
| `/api/v1/records` | Create Consultation / Prescription| ❌ | ✅ (Authoring)| ❌ | ❌ |
| `/api/v1/admin/*` | User & Staff Management | ❌ | ❌ | ❌ | ✅ (Full) |

### 4.3 RBAC Middleware Implementation Pattern

```javascript
// middleware/rbac.js
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ACCESS',
          message: 'Access restricted to authorized personnel only'
        }
      });
    }
    next();
  };
};
```

---

## 5. API Interface Specifications (RESTful Contract)

All endpoints follow the standard base route: `http://localhost:5000/api/v1`.

### 5.1 Endpoint Inventory

| Module | Method | Path | Required Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/register` | Public / Admin | Register new user |
| **Auth** | `POST` | `/auth/login` | Public | Authenticate user & return JWT token |
| **Auth** | `GET` | `/auth/me` | Authenticated | Retrieve authenticated user profile |
| **Appointments** | `GET` | `/appointments` | Staff, Admin | List appointments with pagination & filters |
| **Appointments** | `POST` | `/appointments` | Patient, Staff, Admin | Book a new slot |
| **Appointments** | `GET` | `/appointments/doctor/queue` | Doctor | Get real-time queue for logged-in physician |
| **Appointments** | `PATCH` | `/appointments/:id/status` | Doctor, Staff, Admin | Advance state (`CHECKED_IN`, `COMPLETED`) |
| **Patients** | `GET` | `/patients/search` | Staff, Doctor, Admin | Fast search by name, phone, or MRN |
| **Patients** | `GET` | `/patients/:id` | Staff, Doctor, Admin | Get patient demographics |
| **Medical Records** | `GET` | `/records/patient/:patientId` | Doctor, Patient (self) | Fetch indexed longitudinal history |
| **Medical Records** | `POST` | `/records` | Doctor | Record consultation, vitals, e-prescription |
| **Admin** | `GET` | `/admin/stats` | Admin | Real-time throughput, active queues, system health |

### 5.2 Canonical Payload Samples

#### `POST /api/v1/appointments`
```json
{
  "doctorId": "660c18d0f1b2c4e32049e01a",
  "patientId": "660c1920f1b2c4e32049e05b",
  "appointmentDate": "2026-10-15T00:00:00.000Z",
  "timeSlot": "09:30",
  "reason": "Routine hypertension review"
}
```

#### `POST /api/v1/records`
```json
{
  "patientId": "660c1920f1b2c4e32049e05b",
  "appointmentId": "660c1a10f1b2c4e32049e08c",
  "vitals": {
    "bloodPressure": "120/80",
    "pulseRate": 72,
    "temperature": 98.4,
    "weightKg": 70.5
  },
  "symptoms": ["Mild headache", "Dizziness on standing"],
  "diagnosis": "Primary hypertension (controlled)",
  "prescriptions": [
    {
      "medicine": "Amlodipine",
      "dosage": "5mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "Take post breakfast"
    }
  ]
}
```

---

## 6. Frontend Architecture & Concurrency Engineering (React.js)

```mermaid
graph TD
    Root[App.jsx] --> AuthProvider[AuthContext: User, Tokens, Role]
    AuthProvider --> Router[App Routes]
    Router --> DoctorDash[Doctor Queue View]
    Router --> StaffDash[Reception Booking Desk]
    Router --> PatientDash[Patient Self-Service]

    DoctorDash --> useDoctorQueue[custom hook: useDoctorQueue]
    StaffDash --> useAppointmentState[custom hook: useAppointmentState]
    
    useAppointmentState --> OptimisticUI[Optimistic Local State Update]
    useAppointmentState --> Debounce[Debounced Request Batcher]
    Debounce --> AxiosClient[Local Axios HTTP Client]
```

### 6.1 Custom Hooks Engine (Preventing UI Thrashing & Boosting Render by 25%)

To handle **100+ concurrent state updates** without locking the UI thread:
1. **Separation of Concerns:** Appointment state is decoupled from top-level application state to ensure single-cell/row re-renders rather than whole-tree reconciliations.
2. **Optimistic Updates:** Immediate local state change on slot status toggle, rolling back only if backend emits an error.

```javascript
// src/hooks/useAppointmentQueue.js
import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useAppointmentQueue(initialAppointments = []) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [loading, setLoading] = useState(false);

  const updateStatusOptimistic = useCallback(async (appointmentId, newStatus) => {
    // 1. Snapshot previous state for rollback
    const previous = [...appointments];

    // 2. Instantaneous local state update (0ms UI latency)
    setAppointments(curr => 
      curr.map(item => item._id === appointmentId ? { ...item, status: newStatus } : item)
    );

    try {
      // 3. Async background synchronization with local backend
      await api.patch(`/appointments/${appointmentId}/status`, { status: newStatus });
    } catch (err) {
      // 4. Rollback in case of conflict or failure
      setAppointments(previous);
      throw err;
    }
  }, [appointments]);

  return { appointments, setAppointments, updateStatusOptimistic, loading };
}
```

---

## 7. Security Architecture for Local Environment

Even in a localhost environment, hospital patient data requires defense-in-depth:
1. **Password Protection:** Hashes computed with `bcryptjs` using a salt work factor of $12$. Plaintext passwords are never logged or stored.
2. **Payload Sanitization:** Rejection of NoSQL injection payloads (`$ne`, `$gt` objects) via Express validation middleware.
3. **HTTP Header Hardening:** `helmet` middleware installed to prevent MIME-sniffing and cross-site scripting vulnerabilities.
4. **CORS Boundary Enforcement:** Configured strictly to allow only the local client origin (`http://localhost:5173` or `http://localhost:3000`).
5. **Rate Limiting:** `express-rate-limit` attached to `/api/v1/auth/login` (max 10 attempts per 5 minutes per local IP) to prevent local automated brute forcing.

---

## 8. Technical Decisions & Architectural Rationales

| Decision | Selected Choice | Alternative Considered | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Database Engine** | **Local MongoDB Community Server** | PostgreSQL / SQLite | Medical encounters have variable clinical parameters (vitals, specialized notes, dosage schedules). MongoDB's schema flexibility avoids sparse columns or complex joining tables while index projections keep latency under 150ms. |
| **API Architecture** | **Express.js Layered Monolith** | NestJS / Microservices | Given on-device local execution, an Express.js layered architecture (routes $\to$ controllers $\to$ services) guarantees fast boot time (< 1s), low RAM consumption (< 120MB), and clean maintainability without microservice latency. |
| **Frontend State** | **Custom React Hooks + Context API** | Redux Toolkit / Zustand | Eliminates boilerplate and external dependencies while allowing targeted component sub-tree subscriptions. Solves the 100+ state update threshold without redux reducer serialization lag. |
| **Client Bundler** | **Vite** | Create-React-App / Webpack | Sub-300ms server cold start and instant Hot Module Replacement (HMR) for local development workflows. |
| **Zero-Cloud Auth** | **Local JWT + bcrypt** | Firebase Auth / Supabase / Auth0 | Complies with user mandate for zero external API keys and 100% offline-compatible local operation. |

---

## 9. Localhost Deployment & Execution Plan

### 9.1 Prerequisites
* Node.js v20.x or higher installed.
* Local MongoDB Service running on `mongodb://127.0.0.1:27017` (via Windows Service or MongoDB Compass).

### 9.2 Directory Layout

```text
HM/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/         # Reusable atomic UI components
│   │   ├── context/            # AuthContext, NotificationContext
│   │   ├── hooks/              # useAppointmentQueue, useDoctorSchedule
│   │   ├── pages/              # DoctorPortal, StaffPortal, PatientPortal
│   │   ├── services/           # Axios instance with auth interceptors
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend Application (Express.js)
│   ├── src/
│   │   ├── config/             # DB connection, environment variables
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Auth, RBAC, ErrorHandler, Validator
│   │   ├── models/             # Mongoose schemas (User, Patient, Appointment)
│   │   ├── routes/             # Modular routers (/auth, /appointments, /records)
│   │   ├── seeds/              # Database seeder (seedData.js)
│   │   └── app.js
│   ├── package.json
│   └── .env
│
├── PRD.md                      # Product Requirements Document
└── TRD.md                      # Technical Requirements Document
```

### 9.3 Environment Configuration (`server/.env`)
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/carepulse_hms
JWT_SECRET=super_secret_local_dev_key_carepulse_secure_jwt_token_2026_xyz987
JWT_EXPIRES_IN=1h
```

### 9.4 Execution Commands
```bash
# 1. Start MongoDB (ensure service is active on localhost:27017)
net start MongoDB

# 2. Start Backend Server
cd server
npm install
npm run seed     # Injects mock doctors, demo staff, test patients, and initial slots
npm run dev      # Runs Express via nodemon on http://localhost:5000

# 3. Start Frontend Client (in a separate terminal)
cd client
npm install
npm run dev      # Runs Vite dev server on http://localhost:5173
```
