# LogiTrack - Logistics Courier Tracking System

> A comprehensive database-driven web application demonstrating advanced Oracle Database and PL/SQL concepts for a Database Systems course project.

![Database Systems Project](https://img.shields.io/badge/Course-Database%20Systems-blue)
![Oracle](https://img.shields.io/badge/Database-Oracle-red)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green)
![PL/SQL](https://img.shields.io/badge/Logic-PL%2FSQL-orange)

## 📋 Project Overview

LogiTrack is a full-stack logistics courier tracking system where **Oracle Database is the star**. The application demonstrates extensive use of Oracle SQL, PL/SQL, and relational database concepts through a realistic courier management platform.

**Key Principle:** Business logic lives in Oracle PL/SQL packages, not in JavaScript. The Node.js backend is a thin API layer that calls stored procedures and returns results.

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   Frontend   │────▶│  Express API │────▶│  PL/SQL Packages    │────▶│ Oracle Tables │
│  HTML/CSS/JS │◀────│  (Thin)      │◀────│  (Business Logic)   │◀────│ Views, etc.  │
└─────────────┘     └─────────────┘     └─────────────────────┘     └──────────────┘
```

## ✨ Features

### Role-Based System
| Role | Capabilities |
|------|-------------|
| **Customer** | Book shipments, track packages, view payments, manage profile, delete account |
| **Admin** | Manage all entities, view reports, system statistics, audit logs |
| **Delivery Agent** | View assigned deliveries, update status, mark delivered |
| **Warehouse Staff** | Receive/dispatch shipments, monitor capacity |

### Database Features Demonstrated
- ✅ Relational schema with 16 tables
- ✅ Primary keys, Foreign keys, Candidate keys
- ✅ CHECK, UNIQUE, NOT NULL, DEFAULT constraints
- ✅ EER Specialization/Generalization (Employee → Admin, Delivery Agent, Warehouse Staff)
- ✅ 9 PL/SQL Packages with full business logic
- ✅ 8 Standalone Functions
- ✅ 3 Standalone Procedures
- ✅ 5 Database Triggers
- ✅ 8 Database Views
- ✅ 17 Indexes with EXPLAIN PLAN demonstrations
- ✅ Oracle Sequences for ID generation
- ✅ Transactions with SAVEPOINT, COMMIT, ROLLBACK
- ✅ Concurrency control with SELECT FOR UPDATE
- ✅ Exception handling (predefined + custom)
- ✅ Cursor usage in reports
- ✅ Audit logging
- ✅ Status history tracking via triggers

## 🏗️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Database | Oracle Database (XE/EE) | Data storage, business logic |
| PL/SQL | Oracle PL/SQL | Packages, procedures, functions, triggers |
| Backend | Node.js + Express | Thin API layer |
| Oracle Driver | node-oracledb | Oracle connectivity |
| Auth | bcrypt + JWT | Password hashing, token auth |
| Frontend | HTML5 + CSS3 + Vanilla JS | User interface |

## 📊 Database Schema

### Entity-Relationship Summary

```
CUSTOMER ──1:M──▶ SHIPMENT ──1:1──▶ PARCEL
                      │
                      ├──1:M──▶ TRACKING (history)
                      ├──1:1──▶ PAYMENT
                      ├──1:1──▶ DELIVERY
                      ├──M:1──▶ WAREHOUSE
                      └──M:1──▶ ROUTE

EMPLOYEE (supertype)
    ├── ADMIN (subtype)
    ├── DELIVERY_AGENT (subtype) ──1:1──▶ VEHICLE
    └── WAREHOUSE_STAFF (subtype) ──M:1──▶ WAREHOUSE

DELIVERY ──M:1──▶ DELIVERY_AGENT

Supporting Tables:
    USER_ACCOUNT (authentication)
    SHIPMENT_STATUS_HISTORY (trigger-maintained)
    AUDIT_LOG (operation auditing)
```

### EER Specialization

The **Employee** entity uses **disjoint, partial** specialization:
- **Disjoint:** An employee can be ONLY one of Admin, Delivery Agent, or Warehouse Staff
- **Partial:** Not every employee must belong to a subtype (though in practice, all do)
- Implemented via shared primary key (Employee_ID) as both PK and FK in subtype tables

### Tables

| # | Table | Purpose |
|---|-------|---------|
| 1 | CUSTOMER | Customer information |
| 2 | EMPLOYEE | Employee supertype (EER) |
| 3 | ADMIN | Admin subtype |
| 4 | WAREHOUSE | Warehouse facilities |
| 5 | WAREHOUSE_STAFF | Warehouse staff subtype |
| 6 | VEHICLE | Delivery vehicles |
| 7 | DELIVERY_AGENT | Delivery agent subtype |
| 8 | ROUTE | Delivery routes |
| 9 | SHIPMENT | Core shipment records |
| 10 | PARCEL | Parcel details (1:1 with Shipment) |
| 11 | TRACKING | Tracking history |
| 12 | DELIVERY | Delivery records |
| 13 | PAYMENT | Payment records |
| 14 | USER_ACCOUNT | Authentication (implementation-level) |
| 15 | SHIPMENT_STATUS_HISTORY | Status change log (trigger-maintained) |
| 16 | AUDIT_LOG | Operation audit trail (implementation-level) |

## 📁 Folder Structure

```
Courier_Tracking_Sys/
├── database/                          # Oracle SQL/PL/SQL scripts
│   ├── README.md                      # Database setup instructions
│   ├── 01_create_tables.sql          # Table definitions with constraints
│   ├── 02_constraints.sql            # Additional integrity constraints
│   ├── 03_sequences.sql              # Oracle sequences
│   ├── 04_indexes.sql                # Indexes + EXPLAIN PLAN demos
│   ├── 05_views.sql                  # Database views
│   ├── 06_functions.sql              # Standalone PL/SQL functions
│   ├── 07_procedures.sql             # Standalone PL/SQL procedures
│   ├── 08_packages.sql               # PL/SQL packages (main logic)
│   ├── 09_triggers.sql               # Database triggers
│   ├── 10_seed_data.sql              # Demo/sample data
│   ├── 11_demo_queries.sql           # Demonstration queries
│   └── 12_transaction_concurrency_demo.sql  # Concurrency demo
├── backend/                           # Node.js Express API
│   ├── package.json
│   ├── server.js                     # Express server setup
│   ├── config/
│   │   └── database.js               # Oracle connection pool
│   ├── middleware/
│   │   ├── auth.js                   # JWT authentication
│   │   └── roleCheck.js             # Role-based access
│   ├── routes/                       # API route definitions
│   │   ├── auth.js
│   │   ├── customer.js
│   │   ├── shipment.js
│   │   ├── tracking.js
│   │   ├── payment.js
│   │   ├── delivery.js
│   │   ├── warehouse.js
│   │   ├── admin.js
│   │   └── reports.js
│   └── controllers/                  # Request handlers (call PL/SQL)
│       ├── authController.js
│       ├── customerController.js
│       ├── shipmentController.js
│       ├── trackingController.js
│       ├── paymentController.js
│       ├── deliveryController.js
│       ├── warehouseController.js
│       ├── adminController.js
│       └── reportsController.js
├── frontend/                          # HTML/CSS/JS UI
│   ├── index.html                    # Landing page
│   ├── login.html                    # Login page
│   ├── register.html                 # Registration page
│   ├── customer-dashboard.html       # Customer dashboard
│   ├── admin-dashboard.html          # Admin dashboard
│   ├── agent-dashboard.html          # Delivery agent dashboard
│   ├── warehouse-dashboard.html      # Warehouse staff dashboard
│   ├── booking.html                  # Shipment booking
│   ├── tracking.html                 # Shipment tracking
│   ├── css/
│   │   └── style.css                # Main stylesheet
│   └── js/
│       ├── common.js                # Shared utilities
│       ├── auth.js                  # Login/register logic
│       ├── customer.js              # Customer dashboard logic
│       ├── admin.js                 # Admin dashboard logic
│       ├── agent.js                 # Agent dashboard logic
│       ├── warehouse.js             # Warehouse dashboard logic
│       ├── booking.js               # Booking form logic
│       └── tracking.js             # Tracking page logic
├── docs/                             # Academic documentation
│   ├── normalization.md             # Normalization analysis (1NF-5NF)
│   ├── transactions.md              # Transaction & recovery concepts
│   ├── relational-algebra.md        # SQL to relational algebra
│   ├── query-optimization.md        # Query processing & optimization
│   ├── hashing.md                   # Hashing concepts
│   ├── syllabus-mapping.md          # Course syllabus alignment
│   └── demo-script.md              # Live demonstration guide
├── ARCHITECTURE.md                   # End-to-end traceability
├── README.md                         # This file
├── .env.example                     # Environment variables template
└── .gitignore                       # Git ignore rules
```

## 🚀 Setup Instructions

### Prerequisites

1. **Oracle Database** (XE or Enterprise Edition)
   - Download: [Oracle XE](https://www.oracle.com/database/technologies/xe-downloads.html)
   - Ensure Oracle listener is running on port 1521

2. **Oracle Instant Client** (for node-oracledb)
   - Download: [Oracle Instant Client](https://www.oracle.com/database/technologies/instant-client.html)
   - Set `LD_LIBRARY_PATH` (Linux) or `PATH` (Windows) to include Instant Client directory

3. **Node.js** (v16 or later)
   - Download: [Node.js](https://nodejs.org/)

4. **Oracle SQL Developer** (for database management and demonstrations)
   - Download: [SQL Developer](https://www.oracle.com/tools/downloads/sqldev-downloads.html)

### Step 1: Database Setup

1. Connect to Oracle as a privileged user (SYS or SYSTEM):

```sql
-- Create application user
CREATE USER courier_admin IDENTIFIED BY your_password;
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER TO courier_admin;
GRANT UNLIMITED TABLESPACE TO courier_admin;
```

2. Connect as `courier_admin` in SQL Developer

3. Execute database scripts **in order**:

```
01_create_tables.sql
02_constraints.sql
03_sequences.sql
04_indexes.sql
05_views.sql
06_functions.sql
07_procedures.sql
08_packages.sql
09_triggers.sql
10_seed_data.sql
```

> **Note:** If any package shows INVALID status, recompile:
> ```sql
> ALTER PACKAGE PKG_AUTH COMPILE;
> ALTER PACKAGE PKG_AUTH COMPILE BODY;
> ```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create `.env` file (copy from `.env.example`):

```env
DB_USER=courier_admin
DB_PASSWORD=your_password
DB_CONNECT_STRING=localhost:1521/XEPDB1
JWT_SECRET=your_secret_key_here
PORT=3000
```

Start the server:

```bash
npm start
# or for development:
npm run dev
```

### Step 3: Access the Application

Open browser: **http://localhost:3000**

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | customer.demo@example.com | Demo@123 |
| Admin | admin.demo@example.com | Demo@123 |
| Delivery Agent | agent.demo@example.com | Demo@123 |
| Warehouse Staff | warehouse.demo@example.com | Demo@123 |

## 🔍 PL/SQL Packages

| Package | Purpose | Key Operations |
|---------|---------|---------------|
| PKG_AUTH | Authentication & account management | Register, Login, Change Password, Delete Account |
| PKG_CUSTOMER | Customer profile operations | Get/Update Profile, List Customers |
| PKG_SHIPMENT | Core shipment operations | Book Shipment (transaction), Update Status, Cancel |
| PKG_TRACKING | Shipment tracking | Get History, Latest Status, Status History |
| PKG_PAYMENT | Payment processing | Process Payment, Update Status, Get Payments |
| PKG_DELIVERY | Delivery management | Assign, Update Status, Mark Delivered (transaction) |
| PKG_WAREHOUSE | Warehouse operations | Receive (with locking), Dispatch, Capacity Check |
| PKG_ADMIN | Administrative operations | Dashboard Stats, Employee CRUD, Route/Vehicle CRUD |
| PKG_REPORTS | Report generation | Revenue, Performance, Utilization (uses cursors) |

## 📝 Database Concepts Demonstrated

### Transaction Management
- **BOOK_SHIPMENT:** Creates Shipment + Parcel + Tracking + Payment atomically with SAVEPOINT
- **REGISTER_CUSTOMER:** Creates Customer + User Account with ROLLBACK on failure
- **MARK_DELIVERED:** Updates Delivery + Shipment + Tracking + Vehicle in one transaction

### Concurrency Control
- **Warehouse Receive:** Uses `SELECT ... FOR UPDATE` to lock warehouse row before capacity check
- **Demo file:** `12_transaction_concurrency_demo.sql` - Run in two SQL Developer sessions

### Triggers
- **TRG_SHIPMENT_STATUS_HISTORY:** Automatically logs status changes
- **TRG_AUDIT_*:** Audit logging for customer, shipment, and payment changes
- **TRG_VEHICLE_AVAILABILITY:** Updates vehicle status on delivery assignment

### Views
- **VW_CUSTOMER_SHIPMENTS:** Complete customer shipment overview
- **VW_WAREHOUSE_UTILIZATION:** Real-time warehouse capacity
- **VW_AGENT_PERFORMANCE:** Delivery agent statistics
- **VW_REVENUE_REPORT:** Monthly revenue analysis

### Indexing
- 17 targeted indexes on frequently queried columns
- EXPLAIN PLAN demonstrations in `04_indexes.sql` and `11_demo_queries.sql`

## 🎓 Syllabus Alignment

See [docs/syllabus-mapping.md](docs/syllabus-mapping.md) for detailed mapping of every syllabus topic to project features.

| Module | Key Demonstrations |
|--------|-------------------|
| 1. DB Concepts & Architecture | Three-schema, Client/Server |
| 2. ER/EER Model | Employee specialization, Cardinalities |
| 3. Normalization | 1NF through BCNF analysis |
| 4. Query Processing | Indexes, EXPLAIN PLAN, Optimization |
| 5. Transactions | SAVEPOINT, COMMIT, ROLLBACK, ACID |
| 6. Concurrency | SELECT FOR UPDATE, Row Locking |
| 7. NoSQL | Documented as future work |

## 🎬 Live Demo

See [docs/demo-script.md](docs/demo-script.md) for a complete 12-15 minute demonstration script.

Quick demo flow:
1. Login as Customer → Book Shipment → Verify in SQL Developer
2. Login as Warehouse Staff → Receive Shipment
3. Login as Delivery Agent → Update Status → Mark Delivered
4. Login as Admin → View Reports → Run EXPLAIN PLAN
5. Demonstrate Transaction Rollback
6. Demonstrate Account Deletion
7. Demonstrate Concurrency (two SQL Developer sessions)

## ⚠️ Known Limitations

1. Password hashing is done in the application layer (bcrypt), not in Oracle, because Oracle's DBMS_CRYPTO requires additional privileges
2. Payment processing is simulated (no real payment gateway)
3. File uploads for receiver signature are text-based
4. NoSQL is discussed in documentation but not implemented (project is Oracle-focused)
5. Real-time tracking would require WebSocket integration (future work)

## 🔮 Future Work

- WebSocket integration for real-time tracking updates
- SMS/Email notifications via Oracle Advanced Queuing
- Mobile application
- NoSQL integration for unstructured tracking data (MongoDB for GPS coordinates)
- Oracle Spatial for geographic route optimization
- Machine learning for delivery time prediction using Oracle Data Mining

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | End-to-end traceability map |
| [docs/normalization.md](docs/normalization.md) | Normalization analysis (1NF-5NF) |
| [docs/transactions.md](docs/transactions.md) | Transaction & recovery concepts |
| [docs/relational-algebra.md](docs/relational-algebra.md) | SQL to relational algebra |
| [docs/query-optimization.md](docs/query-optimization.md) | Query processing & optimization |
| [docs/hashing.md](docs/hashing.md) | Hashing concepts |
| [docs/syllabus-mapping.md](docs/syllabus-mapping.md) | Course syllabus alignment |
| [docs/demo-script.md](docs/demo-script.md) | Live demonstration guide |
| [database/README.md](database/README.md) | Database setup guide |

---

**LogiTrack** - Where the Database is the Star ⭐

*A Database Systems Course Project demonstrating Oracle SQL, PL/SQL, and relational database design principles.*
