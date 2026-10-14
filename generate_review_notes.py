import os

def generate_markdown(filepath):
    content = """# LogiTrack: Logistics Courier Tracking System
## Comprehensive Technical Architecture, SQL/PL-SQL Code Reference & DBMS Viva Guide
### Course: BCSE302L - Database Management Systems | Academic Project Reference

---

> ### 🤖 INSTRUCTIONS FOR CHATGPT / LLM TUTOR:
> **If this document is pasted or uploaded into ChatGPT / any LLM:**
> You are acting as an expert **DBMS Professor & Technical Viva Examiner** for a premier university engineering course (BCSE302L).
> 1. Use the schema, PL/SQL packages, triggers, queries, and architectural explanations in this document to test the student with mock viva questions.
> 2. If the student asks you to explain any code snippet, table, trigger, or package from this project, provide a step-by-step, line-by-line explanation connecting it to theoretical DBMS concepts (ACID, Normalization, 2PL, Indexing, B-Trees, EER Specialization, MVCC).
> 3. Provide constructive feedback, point out potential edge cases, and ensure the student can defend design decisions (e.g., Oracle vs. SQLite, Read Committed isolation, PL/SQL vs. application-layer SQL).

---

## TABLE OF CONTENTS
1. [Executive Overview & 3-Tier Enterprise Architecture](#1-executive-overview--3-tier-enterprise-architecture)
2. [The ".db File" Question: SQLite vs. Enterprise Client-Server Oracle RDBMS](#2-the-db-file-question-sqlite-vs-enterprise-client-server-oracle-rdbms)
3. [End-to-End Role Workflows & Parcel Lifecycle](#3-end-to-end-role-workflows--parcel-lifecycle)
4. [How Frontend Buttons Trigger Real SQL "In the Shadows"](#4-how-frontend-buttons-trigger-real-sql-in-the-shadows)
5. [Complete Database Code Breakdown (File-by-File & Line-by-Line)](#5-complete-database-code-breakdown-file-by-file--line-by-line)
   - [01_create_tables.sql (16 Tables, EER Specialization, 1:1 and 1:M Relationships)](#01_create_tablessql)
   - [02_constraints.sql (Integrity & Domain Constraints)](#02_constraintssql)
   - [03_sequences.sql (Autonomous Sequences)](#03_sequencessql)
   - [04_indexes.sql (B-Tree Performance Indexes & EXPLAIN PLAN)](#04_indexessql)
   - [05_views.sql (8 Specialized Analytical Views)](#05_viewssql)
   - [06_functions.sql (Stored Mathematical & Validation Functions)](#06_functionssql)
   - [07_procedures.sql (Standalone Procedures & Explicit Cursor Demonstration)](#07_proceduressql)
   - [08_packages.sql (The 8 Core PL/SQL Business Logic Packages)](#08_packagessql)
   - [09_triggers.sql (Audit, Lifecycle & Vehicle Automation Triggers)](#09_triggerssql)
   - [10_seed_data.sql (Bootstrap Accounts, Bcrypt Hashing, Routes & Fleet)](#10_seed_datasql)
   - [11_demo_queries.sql (Advanced SQL Evaluation Queries)](#11_demo_queriessql)
   - [12_transaction_concurrency_demo.sql (Two-Phase Locking, Lost Updates, Isolation)](#12_transaction_concurrency_demosql)
6. [35 High-Probability DBMS Viva Questions & Verbatim Model Answers](#6-35-high-probability-dbms-viva-questions--verbatim-model-answers)

---

## 1. Executive Overview & 3-Tier Enterprise Architecture

LogiTrack is a full-featured Logistics and Courier Management System engineered strictly on the **3-Tier Client-Server Architecture**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (UI)                          │
│  - Static HTML5, Responsive CSS3, Modular Vanilla JavaScript, Chart.js │
│  - Portals: Customer, Administrator, Warehouse Staff, Delivery Agent   │
│  - Port 3000 (Served via Express static) or Port 5500 (Live Server)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST APIs (JSON / JWT)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION TIER (API)                          │
│  - Node.js & Express REST Backend (Port 3000)                          │
│  - node-oracledb Driver (Thin Mode connecting via TCP:1521)            │
│  - Authentication: JWT (JSON Web Tokens) & Bcrypt Password Hashing     │
│  - THIN ARCHITECTURE: Dispatches PL/SQL Package calls to Oracle        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Oracle Net Protocol (TCP:1521)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATABASE TIER (RDBMS)                           │
│  - Oracle AI Database 23c Free running inside Docker ('oracle-free')   │
│  - Service Name / PDB: FREEPDB1 | Schema User: courier_admin           │
│  - Compiled PL/SQL Packages, Row-Level Locks, Sequences, Triggers      │
│  - Physical Storage: Datafiles (users01.dbf, system01.dbf) in Docker   │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Attributes:
- **Zero Raw Dynamic SQL in Application Layer:** The Node.js controllers do not execute concatenated `SELECT * FROM ... WHERE ...` strings. Instead, they invoke compiled PL/SQL stored procedures with bind parameters (`:p_customer_id`, `:p_warehouse_id`), guaranteeing 100% protection against **SQL Injection**.
- **Decoupled Architecture:** The frontend can be hosted anywhere (including VS Code Live Server on Port 5500), communicating with the backend over CORS-enabled endpoints (`/api/*`).
- **Autonomous RDBMS Engine:** The database manages its own concurrency, indexing, ACID transactions, and integrity triggers without relying on Node.js to maintain consistency.

---

## 2. The ".db File" Question: SQLite vs. Enterprise Client-Server Oracle RDBMS

### Why isn't there a `courier.db` file in the project folder?
Beginners often build projects using **SQLite**, which stores the entire database in a single flat file (e.g., `app.db`) inside the source folder. In SQLite, the Node.js application process opens the file directly and writes byte streams to disk.

However, **SQLite is an embedded, serverless engine** and is strictly inadequate for enterprise DBMS coursework because:
1. **No Stored PL/SQL Packages:** SQLite cannot compile packages, procedures, functions, or complex state machines.
2. **File-Level Locking Bottleneck:** Whenever one user writes to an SQLite `.db` file, the entire file is locked. Concurrent multi-user writes result in `SQLITE_BUSY` errors.
3. **No Network Protocol / Client-Server Model:** SQLite cannot run on a dedicated database host over TCP/IP.
4. **No Advanced Concurrency Control:** SQLite lacks `SELECT FOR UPDATE` row-level exclusive locks and Two-Phase Locking (2PL).

### How Oracle Database Operates:
- **Independent Daemon:** Oracle runs as a containerized database service inside Docker (`oracle-free`).
- **Physical Datafiles:** Oracle does store data in files, but they are enterprise **Datafiles** (`users01.dbf`, `system01.dbf`, `sysaux01.dbf`, `undo01.dbf`) located inside the container at:
  ```text
  /opt/oracle/oradata/FREE/FREEPDB1/
  ```
- **System Global Area (SGA) & Buffer Cache:** Oracle does not immediately write every single insert to disk. It writes to high-speed memory buffers (Buffer Cache) and writes transaction entries to **Redo Logs** (Write-Ahead Logging). This guarantees **Durability** (the D in ACID) even if the computer crashes or loses power.
- **Background Writers:** Oracle background processes (like `DBW0` Database Writer, `LGWR` Log Writer, `CKPT` Checkpoint) manage disk persistence asynchronously for maximum I/O throughput.

### Why Website Actions Do Not Modify the Source Code Files:
In software engineering, **Code (Schema/Logic) and State (Data) are completely segregated**.
- The `.sql` files in `database/` (`01_create_tables.sql`, `10_seed_data.sql`) are **Deployment Blueprints**.
- When a user registers or books a shipment on the website, Oracle inserts rows into its internal binary datafiles. It does **not** rewrite its own `.sql` source code files. A website that modifies its own source files on user input would violate version control, create concurrency race conditions, and represent an immense architectural flaw.

### Why SQL*Plus Terminal Inserts Require `COMMIT;` Before Showing on the Website:
Oracle implements the **READ COMMITTED** transaction isolation level using Multi-Version Concurrency Control (MVCC).
- When you execute an `INSERT INTO ROUTE ...` statement in your SQL*Plus terminal session, that new row exists only within your local session's private undo segment.
- The Node.js server connects as a separate session. To prevent **Dirty Reads** (reading uncommitted data that might subsequently be rolled back), Oracle hides the uncommitted row from the Node.js session.
- Once you execute `COMMIT;` in SQL*Plus, Oracle issues a `Commit complete.`, writes the commit record to the redo log, and makes the row visible to the backend and the website.

---

## 3. End-to-End Role Workflows & Parcel Lifecycle

LogiTrack enforces a strict state-machine lifecycle across 4 distinct user roles:

```
[CUSTOMER]
   │ Books parcel
   ▼
(Status: BOOKED)
   │
   │ Origin Warehouse Staff clicks "Receive"
   ▼
(Status: WAREHOUSE_RECEIVED) ◄── [SELECT FOR UPDATE capacity lock]
   │
   │ Origin Warehouse Staff clicks "Dispatch"
   ▼
(Status: IN_TRANSIT)
   │
   │ [ADMINISTRATOR] Assigns Delivery Agent
   ▼
(Status: IN_TRANSIT, Agent_ID assigned)
   │
   │ [DELIVERY AGENT] Marks "Out for Delivery"
   ▼
(Status: OUT_FOR_DELIVERY)
   │
   │ [DELIVERY AGENT] Enters Receiver Name + Signature
   ▼
(Status: DELIVERED) ◄── [Vehicle marked AVAILABLE, Delivery_Date recorded]
```

### 1. Customer Portal (`customer-dashboard.html`)
- **Registration & Auth:** Register new customer account (`PKG_AUTH.REGISTER_CUSTOMER`), login with JWT session.
- **Shipment Booking:** Select origin warehouse, destination route, package dimensions, weight, fragility, delivery speed (Standard, Express, Overnight), and payment mode (UPI, Card, Cash).
- **Live Tracking:** Search any Shipment ID to visualize a color-coded vertical timeline of every milestone.
- **My Shipments & Payments:** View historical shipments and payment receipts.
- **Profile & Account Deletion:** Update contact info or invoke `PKG_AUTH.DELETE_ACCOUNT`.

### 2. Warehouse Staff Portal (`warehouse-dashboard.html`)
- **Assigned Hub Context:** Linked to a specific warehouse facility (e.g., *Mumbai Central Hub*, Warehouse #3000).
- **Incoming Tab:** Displays shipments booked for this warehouse with status `BOOKED`. Staff clicks **"Receive"**, invoking `PKG_WAREHOUSE.RECEIVE_SHIPMENT` which locks the warehouse row and transitions status to `WAREHOUSE_RECEIVED`.
- **Dispatch Tab:** Displays received shipments. Staff clicks **"Dispatch"**, invoking `PKG_WAREHOUSE.DISPATCH_SHIPMENT` which transitions status to `IN_TRANSIT`.
- **Capacity Visualization:** Live progress bar showing package utilization percentage (`Current / Capacity * 100`).

### 3. Administrator Portal (`admin-dashboard.html`)
- **System Metrics:** Live KPI cards for Total Customers, Total Shipments, Revenue, and Active Employees.
- **Shipments Management:** Full shipment table with status filtering (Booked, In Transit, Delivered, etc.).
- **Agent Assignment:** Admin can click **"Assign Agent"** on any active shipment to assign a delivery agent via `PKG_DELIVERY.ASSIGN_DELIVERY`.
- **Fleet & Infrastructure Management:**
  - Add / edit warehouses (`PKG_WAREHOUSE.ADD_WAREHOUSE`).
  - Add / delete routes (`PKG_ADMIN.ADD_ROUTE`, `PKG_ADMIN.DELETE_ROUTE`).
  - Add / update fleet vehicles (`PKG_ADMIN.ADD_VEHICLE`).
  - Add employees with specialized roles (`PKG_ADMIN.ADD_EMPLOYEE`).
- **Audit Log:** Real-time visibility into all database actions recorded by Oracle triggers.

### 4. Delivery Agent Portal (`agent-dashboard.html`)
- **Personalized Roster:** Displays deliveries assigned to the logged-in agent (`Agent_ID`).
- **Milestone Progression:** Agent clicks **"Action"** to mark shipment `OUT_FOR_DELIVERY`.
- **Delivery Confirmation:** When at the customer doorstep, agent enters receiver name and signature confirmation, invoking `PKG_DELIVERY.MARK_DELIVERED`. Status becomes `DELIVERED`, and agent's vehicle availability is reset to `AVAILABLE`.

---

## 4. How Frontend Buttons Trigger Real SQL "In the Shadows"

| UI Button / Action | Frontend File & API Call | Backend Controller | Oracle PL/SQL & SQL Executed in Database |
|---|---|---|---|
| **"Create Account"** | `auth.js`<br/>`POST /api/auth/register` | `authController.js`<br/>`register()` | `PKG_AUTH.REGISTER_CUSTOMER` → `INSERT INTO CUSTOMER` & `INSERT INTO USER_ACCOUNT` |
| **"Login"** | `auth.js`<br/>`POST /api/auth/login` | `authController.js`<br/>`login()` | `PKG_AUTH.AUTHENTICATE_USER` → `SELECT ... FROM USER_ACCOUNT WHERE Email = :p_email` |
| **"Confirm & Pay"** (Book Shipment) | `booking.js`<br/>`POST /api/shipments` | `shipmentController.js`<br/>`bookShipment()` | `PKG_SHIPMENT.BOOK_SHIPMENT` → Multi-table transaction (`SHIPMENT`, `PARCEL`, `TRACKING`, `PAYMENT`) with `SAVEPOINT` |
| **"Receive"** (Warehouse) | `warehouse.js`<br/>`PUT /api/warehouse/shipments/:id/receive` | `warehouseStaff.js` | `SELECT ... FOR UPDATE` on `WAREHOUSE` + `UPDATE SHIPMENT SET Current_Status = 'WAREHOUSE_RECEIVED'` |
| **"Dispatch"** (Warehouse) | `warehouse.js`<br/>`PUT /api/warehouse/shipments/:id/dispatch` | `warehouseStaff.js` | `PKG_WAREHOUSE.DISPATCH_SHIPMENT` → `UPDATE SHIPMENT SET Current_Status = 'IN_TRANSIT'` |
| **"Assign Agent"** (Admin) | `admin.js`<br/>`POST /api/deliveries/assign` | `deliveryController.js`<br/>`assignDelivery()` | `PKG_DELIVERY.ASSIGN_DELIVERY` → `INSERT INTO DELIVERY` + `UPDATE SHIPMENT SET Agent_ID = :p_agent_id` |
| **"Confirm Delivery"** (Agent) | `agent.js`<br/>`PUT /api/agent/deliveries/:id/status` | `agent.js` (Route handler) | `PKG_DELIVERY.MARK_DELIVERED` → `UPDATE DELIVERY SET Delivery_Status = 'DELIVERED'`, updates vehicle to `AVAILABLE` |
| **"+ Add Warehouse"** | `admin.js`<br/>`POST /api/warehouses` | `warehouseController.js`<br/>`addWarehouse()` | `PKG_WAREHOUSE.ADD_WAREHOUSE` → `INSERT INTO WAREHOUSE VALUES (SEQ_WAREHOUSE.NEXTVAL, ...)` |
| **"+ Add Route"** | `admin.js`<br/>`POST /api/admin/routes` | `adminController.js`<br/>`addRoute()` | `PKG_ADMIN.ADD_ROUTE` → `INSERT INTO ROUTE VALUES (SEQ_ROUTE.NEXTVAL, ...)` |
| **"Delete Route"** | `admin.js`<br/>`DELETE /api/admin/routes/:id` | `adminController.js`<br/>`deleteRoute()` | `PKG_ADMIN.DELETE_ROUTE` → `DELETE FROM ROUTE WHERE Route_ID = :p_id` |

---

## 5. Complete Database Code Breakdown (File-by-File & Line-by-Line)

---

### `01_create_tables.sql`
**Purpose:** Creates all 16 tables in strict dependency order, enforcing relational integrity, domain checks, and EER specialization.

#### 1. CUSTOMER
```sql
CREATE TABLE CUSTOMER (
    Customer_ID NUMBER CONSTRAINT pk_customer PRIMARY KEY,
    Name VARCHAR2(100) CONSTRAINT nn_customer_name NOT NULL,
    Email VARCHAR2(100) CONSTRAINT uq_customer_email UNIQUE CONSTRAINT nn_customer_email NOT NULL,
    Phone VARCHAR2(20),
    Address VARCHAR2(500)
);
```
- **Explanation:** Stores customer contact details. `Customer_ID` is surrogate PK populated via `SEQ_CUSTOMER`. `Email` has a `UNIQUE` constraint to prevent duplicate registrations.

#### 2. EMPLOYEE (Supertype) & EER Subtypes (ADMIN, DELIVERY_AGENT, WAREHOUSE_STAFF)
```sql
CREATE TABLE EMPLOYEE (
    Employee_ID NUMBER CONSTRAINT pk_employee PRIMARY KEY,
    Name VARCHAR2(100) CONSTRAINT nn_employee_name NOT NULL,
    Phone VARCHAR2(20),
    Email VARCHAR2(100) CONSTRAINT uq_employee_email UNIQUE CONSTRAINT nn_employee_email NOT NULL,
    Joining_Date DATE DEFAULT SYSDATE,
    Salary NUMBER(10,2),
    Employee_Type VARCHAR2(20) CONSTRAINT chk_employee_type 
        CHECK (Employee_Type IN ('ADMIN','DELIVERY_AGENT','WAREHOUSE_STAFF'))
);

CREATE TABLE ADMIN (
    Employee_ID NUMBER CONSTRAINT pk_admin PRIMARY KEY 
        CONSTRAINT fk_admin_employee REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Role VARCHAR2(50) CONSTRAINT nn_admin_role NOT NULL
);

CREATE TABLE WAREHOUSE_STAFF (
    Employee_ID NUMBER CONSTRAINT pk_warehouse_staff PRIMARY KEY 
        CONSTRAINT fk_whstaff_employee REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Warehouse_ID NUMBER CONSTRAINT fk_whstaff_warehouse REFERENCES WAREHOUSE(Warehouse_ID),
    Shift VARCHAR2(20) CONSTRAINT chk_whstaff_shift CHECK (Shift IN ('MORNING','AFTERNOON','NIGHT'))
);

CREATE TABLE DELIVERY_AGENT (
    Employee_ID NUMBER CONSTRAINT pk_delivery_agent PRIMARY KEY 
        CONSTRAINT fk_agent_employee REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Vehicle_ID NUMBER CONSTRAINT fk_agent_vehicle REFERENCES VEHICLE(Vehicle_ID),
    License_No VARCHAR2(30) CONSTRAINT uq_agent_license UNIQUE CONSTRAINT nn_agent_license NOT NULL,
    Experience NUMBER DEFAULT 0
);
```
- **Explanation:** Demonstrates **Enhanced Entity-Relationship (EER) Specialization / Generalization**.
  - `EMPLOYEE` is the **Supertype** with shared attributes.
  - `ADMIN`, `WAREHOUSE_STAFF`, and `DELIVERY_AGENT` are **Disjoint Subtypes**.
  - Subtype tables have `Employee_ID` acting simultaneously as **Primary Key** and **Foreign Key** pointing to `EMPLOYEE(Employee_ID)`.
  - `ON DELETE CASCADE` guarantees that deleting an employee removes their subtype record automatically, maintaining referential integrity.

#### 3. WAREHOUSE, VEHICLE, and ROUTE
```sql
CREATE TABLE WAREHOUSE (
    Warehouse_ID NUMBER CONSTRAINT pk_warehouse PRIMARY KEY,
    Warehouse_Name VARCHAR2(100) CONSTRAINT nn_warehouse_name NOT NULL,
    Location VARCHAR2(200) CONSTRAINT nn_warehouse_location NOT NULL,
    Capacity NUMBER CONSTRAINT nn_warehouse_capacity NOT NULL,
    Contact_No VARCHAR2(20)
);

CREATE TABLE VEHICLE (
    Vehicle_ID NUMBER CONSTRAINT pk_vehicle PRIMARY KEY,
    Vehicle_Number VARCHAR2(20) CONSTRAINT uq_vehicle_number UNIQUE CONSTRAINT nn_vehicle_number NOT NULL,
    Vehicle_Type VARCHAR2(30) CONSTRAINT chk_vehicle_type CHECK (Vehicle_Type IN ('BIKE','VAN','TRUCK','CARGO')),
    Capacity NUMBER(10,2),
    Availability VARCHAR2(10) DEFAULT 'AVAILABLE' CONSTRAINT chk_vehicle_avail CHECK (Availability IN ('AVAILABLE','IN_USE','MAINTENANCE'))
);

CREATE TABLE ROUTE (
    Route_ID NUMBER CONSTRAINT pk_route PRIMARY KEY,
    Source VARCHAR2(100) CONSTRAINT nn_route_source NOT NULL,
    Destination VARCHAR2(100) CONSTRAINT nn_route_dest NOT NULL,
    Distance NUMBER(10,2) CONSTRAINT nn_route_distance NOT NULL,
    Estimated_Time NUMBER(5,2)
);
```
- **Explanation:** Represents logistics infrastructure. `VEHICLE.Availability` is updated by triggers when deliveries are assigned or completed.

#### 4. SHIPMENT (Central Fact Entity)
```sql
CREATE TABLE SHIPMENT (
    Shipment_ID NUMBER CONSTRAINT pk_shipment PRIMARY KEY,
    Customer_ID NUMBER CONSTRAINT fk_shipment_customer REFERENCES CUSTOMER(Customer_ID) CONSTRAINT nn_shipment_customer NOT NULL,
    Warehouse_ID NUMBER CONSTRAINT fk_shipment_warehouse REFERENCES WAREHOUSE(Warehouse_ID),
    Route_ID NUMBER CONSTRAINT fk_shipment_route REFERENCES ROUTE(Route_ID),
    Agent_ID NUMBER CONSTRAINT fk_shipment_agent REFERENCES DELIVERY_AGENT(Employee_ID),
    Booking_Date TIMESTAMP DEFAULT SYSTIMESTAMP,
    Weight NUMBER(10,2),
    Delivery_Type VARCHAR2(20) CONSTRAINT chk_delivery_type CHECK (Delivery_Type IN ('STANDARD','EXPRESS','OVERNIGHT')),
    Estimated_Delivery DATE,
    Current_Status VARCHAR2(30) DEFAULT 'BOOKED' CONSTRAINT chk_shipment_status 
        CHECK (Current_Status IN ('BOOKED','WAREHOUSE_RECEIVED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'))
);
```
- **Explanation:** Central hub table. Links customer, origin warehouse, route, and assigned delivery agent. `Current_Status` is validated by a `CHECK` constraint against the 6 legal domain values.

#### 5. PARCEL and PAYMENT (1:1 Relationship Enforcement)
```sql
CREATE TABLE PARCEL (
    Parcel_ID NUMBER CONSTRAINT pk_parcel PRIMARY KEY,
    Shipment_ID NUMBER CONSTRAINT fk_parcel_shipment REFERENCES SHIPMENT(Shipment_ID) 
        CONSTRAINT uq_parcel_shipment UNIQUE CONSTRAINT nn_parcel_shipment NOT NULL,
    Parcel_Type VARCHAR2(30) CONSTRAINT chk_parcel_type CHECK (Parcel_Type IN ('DOCUMENT','SMALL_PACKAGE','MEDIUM_PACKAGE','LARGE_PACKAGE','FRAGILE','HEAVY')),
    Weight NUMBER(10,2),
    Length NUMBER(10,2),
    Height NUMBER(10,2),
    Width NUMBER(10,2),
    Fragile CHAR(1) DEFAULT 'N' CONSTRAINT chk_parcel_fragile CHECK (Fragile IN ('Y','N'))
);

CREATE TABLE PAYMENT (
    Payment_ID NUMBER CONSTRAINT pk_payment PRIMARY KEY,
    Shipment_ID NUMBER CONSTRAINT fk_payment_shipment REFERENCES SHIPMENT(Shipment_ID) 
        CONSTRAINT uq_payment_shipment UNIQUE CONSTRAINT nn_payment_shipment NOT NULL,
    Amount NUMBER(10,2) CONSTRAINT nn_payment_amount NOT NULL,
    Payment_Method VARCHAR2(30) CONSTRAINT chk_payment_method CHECK (Payment_Method IN ('CASH','CREDIT_CARD','DEBIT_CARD','UPI','NET_BANKING')),
    Payment_Status VARCHAR2(20) DEFAULT 'PENDING' CONSTRAINT chk_payment_status CHECK (Payment_Status IN ('PENDING','PAID','FAILED','REFUNDED')),
    Payment_Date TIMESTAMP
);
```
- **Explanation:** To enforce a **1:1 relationship in SQL**, the Foreign Key (`Shipment_ID`) is given a **`UNIQUE` constraint**. This mathematically guarantees that a shipment cannot have more than one parcel or payment.

#### 6. TRACKING, DELIVERY, USER_ACCOUNT, SHIPMENT_STATUS_HISTORY, AUDIT_LOG
- `TRACKING`: 1:M relationship with `SHIPMENT` representing chronological location updates.
- `DELIVERY`: 1:1 relationship with `SHIPMENT` recording assigned agent, delivery date, receiver name, and signature.
- `USER_ACCOUNT`: Stores authentication credentials (`Email`, `Password_Hash`, `Role`).
- `SHIPMENT_STATUS_HISTORY`: Audit table populated exclusively by trigger `TRG_SHIPMENT_STATUS_HISTORY`.
- `AUDIT_LOG`: System-wide audit trail recording User ID, Action, Table Name, Record ID, and timestamp.

---

### `02_constraints.sql`
**Purpose:** Adds cross-entity constraints and verifies schema integrity.
- Adds constraint `chk_account_type`: Ensures that a user account points to either a `Customer_ID` (if role is `CUSTOMER`) or an `Employee_ID` (if role is `ADMIN`, `DELIVERY_AGENT`, or `WAREHOUSE_STAFF`), preventing orphaned or ambiguous account records.

---

### `03_sequences.sql`
**Purpose:** Autonomous Surrogate Key Generation.
```sql
CREATE SEQUENCE SEQ_CUSTOMER START WITH 1000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_EMPLOYEE START WITH 2000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_WAREHOUSE START WITH 3000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_VEHICLE START WITH 4000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_ROUTE START WITH 5000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_SHIPMENT START WITH 10000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_PARCEL START WITH 20000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_TRACKING START WITH 30000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_DELIVERY START WITH 40000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_PAYMENT START WITH 50000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_ACCOUNT START WITH 60000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_HISTORY START WITH 70000 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE SEQ_AUDIT START WITH 80000 INCREMENT BY 1 NOCACHE;
```
- **Why Sequences over Auto-Increment:** In enterprise RDBMS, sequences are independent schema objects. Multiple tables or procedures can draw surrogate IDs atomically from memory without taking exclusive locks on table metadata.

---

### `04_indexes.sql`
**Purpose:** Query Optimization & Foreign Key Indexing.
```sql
CREATE INDEX IDX_CUSTOMER_EMAIL ON CUSTOMER(Email);
CREATE INDEX IDX_SHIPMENT_CUSTOMER ON SHIPMENT(Customer_ID);
CREATE INDEX IDX_SHIPMENT_STATUS ON SHIPMENT(Current_Status);
CREATE INDEX IDX_SHIPMENT_WAREHOUSE ON SHIPMENT(Warehouse_ID);
CREATE INDEX IDX_TRACKING_SHIPMENT ON TRACKING(Shipment_ID);
CREATE INDEX IDX_DELIVERY_AGENT ON DELIVERY(Agent_ID);
CREATE INDEX IDX_PAYMENT_SHIPMENT ON PAYMENT(Shipment_ID);
```
- **Technical Explanation:** In Oracle, **Foreign Keys are not automatically indexed**. Without indexes on Foreign Keys, deleting a row from a parent table (like `CUSTOMER`) causes Oracle to acquire an exclusive table-level share lock on the child table (`SHIPMENT`), freezing concurrent updates. Creating B-tree indexes on foreign keys allows row-level locks and speeds up Joins from $O(N)$ full table scans to $O(\log N)$ index range scans.

---

### `05_views.sql`
**Purpose:** Decoupled Business Intelligence & Abstracted Joins.
1. `VW_CUSTOMER_SHIPMENTS`: Joins `CUSTOMER`, `SHIPMENT`, `PARCEL`, and `PAYMENT` to provide a unified customer order summary.
2. `VW_WAREHOUSE_UTILIZATION`:
   ```sql
   CREATE OR REPLACE VIEW VW_WAREHOUSE_UTILIZATION AS
   SELECT w.Warehouse_ID, w.Warehouse_Name, w.Capacity,
          COUNT(s.Shipment_ID) AS Current_Shipments,
          (w.Capacity - COUNT(s.Shipment_ID)) AS Available_Capacity,
          ROUND((COUNT(s.Shipment_ID) / w.Capacity) * 100, 2) AS Utilization_Pct
   FROM WAREHOUSE w
   LEFT JOIN SHIPMENT s ON w.Warehouse_ID = s.Warehouse_ID 
        AND s.Current_Status NOT IN ('DELIVERED', 'CANCELLED')
   GROUP BY w.Warehouse_ID, w.Warehouse_Name, w.Capacity;
   ```
   - Dynamically calculates warehouse inventory load percentage using aggregation and `LEFT JOIN`.
3. `VW_REVENUE_REPORT`: Aggregates monthly revenue using `EXTRACT(YEAR FROM Payment_Date)` and `SUM(Amount)` grouped by month.
4. `VW_AGENT_PERFORMANCE`: Computes completion success percentage for each delivery agent using `CASE WHEN Delivery_Status = 'DELIVERED'`.

---

### `06_functions.sql`
**Purpose:** Reusable, Deterministic Computational Business Logic.
1. `FN_CALCULATE_SHIPPING_COST(p_weight, p_distance, p_delivery_type)`:
   - Base cost = ₹50 + (Weight $\times$ ₹10) + (Distance $\times$ ₹2).
   - Speed multipliers: `STANDARD` = 1.0x, `EXPRESS` = 1.5x, `OVERNIGHT` = 2.0x.
2. `FN_IS_VALID_STATUS_TRANSITION(p_old_status, p_new_status)`:
   - Evaluates state machine validity:
     - `BOOKED` $\rightarrow$ `WAREHOUSE_RECEIVED`, `CANCELLED` (Valid)
     - `WAREHOUSE_RECEIVED` $\rightarrow$ `IN_TRANSIT`, `CANCELLED` (Valid)
     - `IN_TRANSIT` $\rightarrow$ `OUT_FOR_DELIVERY` (Valid)
     - `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED` (Valid)
     - `DELIVERED` $\rightarrow$ Anything (Invalid, returns 0)
3. `FN_GET_WAREHOUSE_UTILIZATION(p_warehouse_id)`: Returns live load percentage.
4. `FN_GET_TOTAL_REVENUE(p_start_date, p_end_date)`: Sums payments with status `'PAID'`.

---

### `07_procedures.sql`
**Purpose:** Standalone Procedures & Explicit Cursor Demonstration.
- `SP_LOG_AUDIT`: Autonomous procedure to write entries into `AUDIT_LOG`.
- `SP_UPDATE_LAST_LOGIN`: Updates `USER_ACCOUNT.Last_Login` to `SYSTIMESTAMP`.
- `SP_GENERATE_DELIVERY_REPORT(p_result OUT SYS_REFCURSOR)`:
  - Declares an explicit cursor, iterates with `LOOP ... FETCH ... EXIT WHEN %NOTFOUND`, and aggregates delivery success statistics for academic viva demonstration.

---

### `08_packages.sql` (The Core Engine)
**Purpose:** Encapsulated PL/SQL Packages implementing the complete transactional business logic.

#### `PKG_SHIPMENT.BOOK_SHIPMENT` (Most Critical Transaction):
```sql
PROCEDURE BOOK_SHIPMENT(
    p_customer_id NUMBER, p_warehouse_id NUMBER, p_route_id NUMBER,
    p_weight NUMBER, p_delivery_type VARCHAR2,
    p_parcel_type VARCHAR2, p_length NUMBER, p_width NUMBER, p_height NUMBER, p_fragile CHAR,
    p_payment_method VARCHAR2,
    p_shipment_id OUT NUMBER, p_parcel_id OUT NUMBER, p_tracking_id OUT NUMBER, p_payment_id OUT NUMBER
) IS
    v_capacity NUMBER;
    v_utilization NUMBER;
    v_cost NUMBER;
    v_distance NUMBER;
    v_est_days NUMBER;
BEGIN
    -- 1. Establish Savepoint for partial rollback
    SAVEPOINT sp_book_shipment;

    -- 2. Concurrency Lock: SELECT FOR UPDATE on origin warehouse
    SELECT Capacity INTO v_capacity FROM WAREHOUSE WHERE Warehouse_ID = p_warehouse_id FOR UPDATE;
    v_utilization := FN_GET_WAREHOUSE_UTILIZATION(p_warehouse_id);
    IF v_utilization >= 100 THEN
        RAISE e_insufficient_capacity;
    END IF;

    -- 3. Calculate dynamic pricing and delivery date
    SELECT Distance INTO v_distance FROM ROUTE WHERE Route_ID = p_route_id;
    v_cost := FN_CALCULATE_SHIPPING_COST(p_weight, v_distance, p_delivery_type);
    v_est_days := FN_CALCULATE_ESTIMATED_DELIVERY(p_delivery_type, v_distance);

    -- 4. Atomic Multi-Table Inserts
    INSERT INTO SHIPMENT (Shipment_ID, Customer_ID, Warehouse_ID, Route_ID, Weight, Delivery_Type, Estimated_Delivery, Current_Status)
    VALUES (SEQ_SHIPMENT.NEXTVAL, p_customer_id, p_warehouse_id, p_route_id, p_weight, p_delivery_type, SYSDATE + v_est_days, 'BOOKED')
    RETURNING Shipment_ID INTO p_shipment_id;

    INSERT INTO PARCEL (Parcel_ID, Shipment_ID, Parcel_Type, Weight, Length, Width, Height, Fragile)
    VALUES (SEQ_PARCEL.NEXTVAL, p_shipment_id, p_parcel_type, p_weight, p_length, p_width, p_height, p_fragile)
    RETURNING Parcel_ID INTO p_parcel_id;

    INSERT INTO TRACKING (Tracking_ID, Shipment_ID, Current_Location, Status, Update_Time, Remarks)
    VALUES (SEQ_TRACKING.NEXTVAL, p_shipment_id, 'Origin Facility', 'BOOKED', SYSDATE, 'Shipment booked')
    RETURNING Tracking_ID INTO p_tracking_id;

    INSERT INTO PAYMENT (Payment_ID, Shipment_ID, Amount, Payment_Method, Payment_Status, Payment_Date)
    VALUES (SEQ_PAYMENT.NEXTVAL, p_shipment_id, v_cost, p_payment_method, 'PAID', SYSDATE)
    RETURNING Payment_ID INTO p_payment_id;

    -- 5. Audit & Commit
    SP_LOG_AUDIT(p_customer_id, 'INSERT', 'SHIPMENT', p_shipment_id, 'New shipment booked');
    COMMIT;
EXCEPTION
    WHEN e_insufficient_capacity THEN
        ROLLBACK TO sp_book_shipment;
        RAISE_APPLICATION_ERROR(-20002, 'Warehouse capacity exceeded');
    WHEN OTHERS THEN
        ROLLBACK TO sp_book_shipment;
        RAISE;
END BOOK_SHIPMENT;
```

#### `PKG_WAREHOUSE.RECEIVE_SHIPMENT`:
- Implements `SELECT Capacity INTO v_capacity FROM WAREHOUSE WHERE Warehouse_ID = p_warehouse_id FOR UPDATE;`
- Row-level lock guarantees that if two warehouse staff members scan packages at the exact same millisecond, Oracle serializes their requests and prevents capacity overselling.

#### `PKG_DELIVERY.MARK_DELIVERED`:
- Executes atomic transaction: updates `DELIVERY.Delivery_Status = 'DELIVERED'`, sets receiver name and signature, updates `SHIPMENT.Current_Status = 'DELIVERED'`, adds tracking event, and resets `VEHICLE.Availability = 'AVAILABLE'`.

---

### `09_triggers.sql`
**Purpose:** Event-Driven Database Automation.

#### 1. `TRG_SHIPMENT_STATUS_HISTORY`:
```sql
CREATE OR REPLACE TRIGGER TRG_SHIPMENT_STATUS_HISTORY
AFTER UPDATE OF Current_Status ON SHIPMENT
FOR EACH ROW
WHEN (OLD.Current_Status != NEW.Current_Status OR OLD.Current_Status IS NULL)
BEGIN
    INSERT INTO SHIPMENT_STATUS_HISTORY (
        History_ID, Shipment_ID, Old_Status, New_Status, Changed_By, Changed_At, Remarks
    ) VALUES (
        SEQ_HISTORY.NEXTVAL,
        :NEW.Shipment_ID,
        :OLD.Current_Status,
        :NEW.Current_Status,
        NULL,
        SYSTIMESTAMP,
        'Status updated automatically'
    );
END;
/
```
- Fires automatically **AFTER UPDATE OF Current_Status**. It guarantees an immutable audit log of every shipment's state transition without requiring manual application logging.

#### 2. `TRG_VEHICLE_AVAILABILITY`:
```sql
CREATE OR REPLACE TRIGGER TRG_VEHICLE_AVAILABILITY
AFTER INSERT ON DELIVERY
FOR EACH ROW
DECLARE
    v_vehicle_id NUMBER;
BEGIN
    SELECT Vehicle_ID INTO v_vehicle_id FROM DELIVERY_AGENT WHERE Employee_ID = :NEW.Agent_ID;
    IF v_vehicle_id IS NOT NULL THEN
        UPDATE VEHICLE SET Availability = 'IN_USE' WHERE Vehicle_ID = v_vehicle_id;
    END IF;
END;
/
```
- Fires when a delivery is assigned, automatically changing the delivery agent's vehicle status from `AVAILABLE` to `IN_USE`.

---

### `10_seed_data.sql`
**Purpose:** Environment Initialization & Demo Users.
- Contains pre-computed Bcrypt hashes for password `Demo@123`:
  `$2a$10$rOvHPxfzO2yLJbCQG8mSHu8gE9f6KoF1s5oCKqkWqFTGy5fQz1kGm`
- Inserts 4 default role demo accounts:
  - `admin.demo@example.com` (ADMIN)
  - `customer.demo@example.com` (CUSTOMER)
  - `agent.demo@example.com` (DELIVERY_AGENT)
  - `warehouse.demo@example.com` (WAREHOUSE_STAFF)
- Populates 4 warehouses, 5 vehicles, Indian interstate routes, and sample shipments.

---

### `11_demo_queries.sql`
**Purpose:** Viva Demonstration Queries.
- Contains standalone SQL scripts demonstrating:
  1. Multi-table Inner & Outer Joins.
  2. Aggregations with `GROUP BY` and `HAVING` (e.g. most active routes).
  3. Correlated Subqueries and `NOT EXISTS` (finding customers with zero shipments).
  4. Conditional `CASE` expressions.
  5. `EXPLAIN PLAN FOR ...` and `DBMS_XPLAN.DISPLAY` to prove index efficiency.

---

### `12_transaction_concurrency_demo.sql`
**Purpose:** Concurrency Control Evaluation.
- Step-by-step instructions for running two simultaneous SQL*Plus sessions to demonstrate:
  - Scenario 1: Row Locking using `SELECT FOR UPDATE`. Session 2 blocks until Session 1 issues `COMMIT;`.
  - Scenario 2: `SELECT FOR UPDATE NOWAIT` (raises `ORA-00054: resource busy`).
  - Scenario 3: Read Committed Isolation (Session 2 cannot see Session 1's updates until committed).
  - Scenario 4: Deadlock detection and automatic rollback (`ORA-00060`).

---

## 6. 35 High-Probability DBMS Viva Questions & Verbatim Model Answers

### Architecture & Conceptual Questions

#### Q1: What is the architecture of your project?
**Answer:** "Our project follows a 3-Tier Enterprise Client-Server Architecture. The Presentation Tier is built with HTML5, CSS3, and JavaScript. The Application Tier is a Node.js/Express REST API that handles session management and JWT authentication. The Database Tier is an Oracle Database 23c Free instance running in Docker on service FREEPDB1. All business logic is encapsulated inside compiled PL/SQL packages in Oracle, which the backend calls via the `node-oracledb` thin driver over TCP port 1521."

#### Q2: Why did you choose Oracle Database instead of SQLite or MongoDB?
**Answer:** "Oracle Database provides full enterprise ACID compliance, compiled PL/SQL stored packages, fine-grained row-level locking (`SELECT FOR UPDATE`), autonomous sequences, and event triggers. SQLite is an embedded file-based database that locks the entire file on writes and lacks stored packages. MongoDB is a NoSQL document store that does not enforce relational integrity constraints or SQL-standard normalization."

#### Q3: Where is the physical database file stored? Why don't I see a `.db` file in your backend?
**Answer:** "In a client-server RDBMS like Oracle, the Node.js application does not directly read or write local OS files. Oracle runs as an independent database server daemon in Docker and writes data blocks to binary tablespace datafiles (`users01.dbf`, `system01.dbf`) located at `/opt/oracle/oradata/FREE/FREEPDB1/` inside the container. Our backend interacts with Oracle over the network socket."

#### Q4: If I insert a record on the website, does it modify the `.sql` files in your repository?
**Answer:** "No. In software engineering, code (schema definition) is strictly separated from runtime state (data). The `.sql` files are deployment scripts used to build the schema. When a user creates a record on the website, Oracle inserts binary rows into its live tablespace in memory and disk; it does not rewrite its own repository source code."

#### Q5: Why did you use PL/SQL packages instead of writing raw SQL queries inside Node.js?
**Answer:** "Using PL/SQL packages provides three major advantages:
1. **Security:** It eliminates SQL Injection because inputs are passed strictly as typed bind parameters.
2. **Performance:** PL/SQL code is pre-compiled and cached in Oracle's Shared Pool (SGA), avoiding query re-parsing overhead.
3. **Encapsulation & Integrity:** Critical business rules (like checking warehouse capacity before booking) reside inside the database engine and cannot be bypassed by client applications."

---

### Schema & Normalization Questions

#### Q6: To what normal form is your database normalized?
**Answer:** "Our schema is normalized to **3NF (Third Normal Form)** and **BCNF (Boyce-Codd Normal Form)**:
- **1NF:** All attributes are atomic (no multi-valued or repeating groups).
- **2NF:** It is in 1NF and all non-key attributes are fully functionally dependent on the primary key (no partial dependencies, as all primary keys are single surrogate attributes).
- **3NF:** It is in 2NF and there are no transitive dependencies (non-prime attributes do not depend on other non-prime attributes). For example, customer address is stored in `CUSTOMER`, not transitively inside `SHIPMENT`.
- **BCNF:** For every non-trivial functional dependency $X \rightarrow Y$, the determinant $X$ is a superkey."

#### Q7: Where have you implemented EER (Enhanced Entity-Relationship) Specialization?
**Answer:** "In our `EMPLOYEE` entity hierarchy. `EMPLOYEE` is the **Supertype** containing common attributes (`Name`, `Email`, `Phone`, `Salary`, `Employee_Type`). `ADMIN`, `DELIVERY_AGENT`, and `WAREHOUSE_STAFF` are **Disjoint Subtypes**. Each subtype table uses `Employee_ID` as both its Primary Key and a Foreign Key referencing `EMPLOYEE(Employee_ID)` with `ON DELETE CASCADE`."

#### Q8: How did you implement a 1:1 relationship in your relational schema?
**Answer:** "By placing a `UNIQUE` constraint on the Foreign Key in the child table. For example, in the `PARCEL` table, `Shipment_ID` is a Foreign Key referencing `SHIPMENT(Shipment_ID)` and is marked `UNIQUE`. This ensures that each shipment can be associated with at most one parcel record."

#### Q9: What is the purpose of surrogate keys, and how are they implemented?
**Answer:** "Surrogate keys are system-generated, non-business identifiers (like `Shipment_ID = 10005`) that provide immutable primary keys without relying on volatile natural data (like email or phone). They are implemented using autonomous Oracle sequences (`SEQ_SHIPMENT`, `SEQ_CUSTOMER`) which generate atomic integers in memory without locking table rows."

#### Q10: What constraints have you defined to ensure domain integrity?
**Answer:** "We implemented `CHECK` constraints on categorical attributes, such as:
- `chk_shipment_status`: `CHECK (Current_Status IN ('BOOKED', 'WAREHOUSE_RECEIVED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'))`
- `chk_delivery_type`: `CHECK (Delivery_Type IN ('STANDARD', 'EXPRESS', 'OVERNIGHT'))`
- `chk_parcel_fragile`: `CHECK (Fragile IN ('Y', 'N'))`
- `chk_employee_type`: `CHECK (Employee_Type IN ('ADMIN', 'DELIVERY_AGENT', 'WAREHOUSE_STAFF'))`"

---

### Transactions & Concurrency Questions

#### Q11: How do you guarantee the ACID properties in your application?
**Answer:** 
- **Atomicity:** `PKG_SHIPMENT.BOOK_SHIPMENT` uses a `SAVEPOINT`. If any sub-operation fails (e.g., payment insertion), the procedure executes `ROLLBACK TO SAVEPOINT`, ensuring an all-or-nothing outcome.
- **Consistency:** Enforced via primary/foreign key constraints, check constraints, and procedural validation (e.g. verifying that warehouse capacity has not been exceeded).
- **Isolation:** Managed via Oracle's Read Committed MVCC and row-level exclusive locks using `SELECT FOR UPDATE`.
- **Durability:** Explicit `COMMIT` writes transaction entries to Oracle's online redo log files before returning success to the client."

#### Q12: What is the Lost Update problem, and how did you prevent it?
**Answer:** "The Lost Update problem occurs when two concurrent transactions read the same value (e.g. warehouse available capacity = 1), and both proceed to write updates based on that stale read, causing one update to overwrite the other and oversell capacity. We prevent this in `PKG_WAREHOUSE.RECEIVE_SHIPMENT` by executing:
`SELECT Capacity INTO v_cap FROM WAREHOUSE WHERE Warehouse_ID = p_id FOR UPDATE;`
This acquires an exclusive row-level lock (TX lock) on the warehouse row, forcing the second transaction to wait until the first commits."

#### Q13: What is Oracle's default isolation level, and what anomalies does it permit or prevent?
**Answer:** "Oracle's default isolation level is **READ COMMITTED**. It completely prevents **Dirty Reads** (reading uncommitted changes from concurrent transactions). However, it permits **Non-Repeatable Reads** (re-reading a row may return different values if another transaction committed changes in between) and **Phantom Reads**, unless explicit row locks or the `SERIALIZABLE` isolation level are used."

#### Q14: If I execute an `INSERT` statement in SQL*Plus, why doesn't it show up on the website until I run `COMMIT;`?
**Answer:** "Because under Oracle's Read Committed isolation level, uncommitted changes reside only in the local session's private undo buffer. The Node.js application maintains independent connection pool sessions and is prevented from seeing uncommitted data. Once `COMMIT;` is executed, the changes are written to the database buffer and become visible globally."

#### Q15: What is a Deadlock, and how does Oracle handle it?
**Answer:** "A deadlock occurs when two transactions each hold a lock that the other transaction requires to proceed, creating a circular wait graph. Oracle automatically detects deadlocks within seconds using a wait-for graph, breaks the deadlock by rolling back the individual statement that triggered the cycle, and raises error `ORA-00060: deadlock detected while waiting for resource`."

---

### PL/SQL, Triggers & Views Questions

#### Q16: What is the difference between a Function and a Stored Procedure in PL/SQL?
**Answer:** "A Function must return a value using the `RETURN` clause and can be called directly inside SQL queries (e.g., `SELECT FN_CALCULATE_SHIPPING_COST(2.5, 500, 'EXPRESS') FROM DUAL`). A Stored Procedure performs actions, does not return a value directly in its header (though it can return values via `OUT` parameters), and is executed via `EXECUTE` or inside PL/SQL blocks."

#### Q17: What is a PL/SQL Package, and why did you use it?
**Answer:** "A Package is an encapsulated schema object comprising two parts: the **Package Specification** (public interface declaring procedures, functions, and exceptions) and the **Package Body** (private implementation logic). We used packages to group related operations logically (`PKG_SHIPMENT`, `PKG_WAREHOUSE`, `PKG_DELIVERY`), optimize performance via shared memory caching, and maintain modular code."

#### Q18: What is the difference between a Statement Trigger and a Row-Level Trigger?
**Answer:** "A Statement Trigger fires once per triggering SQL statement, regardless of how many rows are affected (or even if 0 rows are affected). A Row-Level Trigger includes the `FOR EACH ROW` clause and fires once for every individual row modified by the statement, allowing access to `:OLD` and `:NEW` column values."

#### Q19: Explain the working of your `TRG_SHIPMENT_STATUS_HISTORY` trigger.
**Answer:** "It is a row-level `AFTER UPDATE OF Current_Status ON SHIPMENT` trigger. It contains a `WHEN (OLD.Current_Status != NEW.Current_Status)` clause. Whenever a shipment's status changes, it autonomously captures `:OLD.Current_Status`, `:NEW.Current_Status`, the shipment ID, and `SYSTIMESTAMP`, and inserts a record into `SHIPMENT_STATUS_HISTORY` to provide an immutable audit trail."

#### Q20: What is a Database View, and what is the difference between a Simple View and a Complex View?
**Answer:** "A View is a virtual table defined by a stored SQL query; it does not store data physically unless materialized. A **Simple View** queries a single base table without aggregations or `GROUP BY` and supports DML updates. A **Complex View** (such as our `VW_WAREHOUSE_UTILIZATION` and `VW_REVENUE_REPORT`) contains joins, aggregate functions (`COUNT`, `SUM`), and `GROUP BY` clauses, and is typically read-only."

---

### Indexing & Query Optimization Questions

#### Q21: What data structure does Oracle use for indexes by default, and how does it speed up queries?
**Answer:** "Oracle uses a balanced **B-Tree (Balanced Tree)** structure. B-Trees keep keys sorted and maintain equal depth from root to all leaf nodes. Instead of performing an $O(N)$ full table scan, Oracle traverses the B-Tree in $O(\log N)$ block I/O operations by following branch pointers to find the leaf block containing the exact row identifier (`ROWID`)."

#### Q22: Why did you create an index on `SHIPMENT(Current_Status)` and `SHIPMENT(Customer_ID)`?
**Answer:** "`Current_Status` is heavily queried by our status filters and warehouse dashboards, while `Customer_ID` is used in joins between `CUSTOMER` and `SHIPMENT`. Furthermore, in Oracle, unindexed foreign keys can cause full table locks on child tables during parent updates or deletes; indexing foreign keys prevents this issue."

#### Q23: How can you check whether Oracle is actually using your index?
**Answer:** "By generating an **Execution Plan** using `EXPLAIN PLAN FOR <query>;` followed by `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);`. If Oracle uses the index, the plan will display `INDEX RANGE SCAN` or `INDEX UNIQUE SCAN` instead of `TABLE ACCESS FULL`."

#### Q24: What is the difference between `WHERE` and `HAVING` in SQL?
**Answer:** "`WHERE` filters individual rows *before* any grouping or aggregate functions are calculated. `HAVING` filters grouped summary rows *after* the `GROUP BY` clause has been evaluated. For example, `SELECT Route_ID, COUNT(*) FROM SHIPMENT GROUP BY Route_ID HAVING COUNT(*) > 5` filters routes with more than 5 shipments."

#### Q25: What is a Correlated Subquery?
**Answer:** "A correlated subquery is an inner query that references columns from the outer query for each row processed (e.g. `SELECT c.Name FROM CUSTOMER c WHERE (SELECT COUNT(*) FROM SHIPMENT s WHERE s.Customer_ID = c.Customer_ID) > 2`). Unlike a regular subquery which executes once, a correlated subquery evaluates once for every candidate row of the outer query."

---

### Security, Web & Application Questions

#### Q26: How are user passwords stored securely in your database?
**Answer:** "Passwords are never stored in plaintext. In `authController.js`, passwords are encrypted using the **Bcrypt** cryptographic hashing algorithm with a salt round of 10. The resulting 60-character one-way hash is stored in `USER_ACCOUNT.Password_Hash`. During login, `bcrypt.compare()` verifies the entered password against the stored hash."

#### Q27: How does authentication and role authorization work across the website?
**Answer:** "We use **JSON Web Tokens (JWT)**. Upon successful credential verification in `PKG_AUTH.AUTHENTICATE_USER`, the backend issues a signed JWT containing the user's Account ID, Email, and Role (`CUSTOMER`, `ADMIN`, `DELIVERY_AGENT`, `WAREHOUSE_STAFF`). On every subsequent API request, Express middleware (`middleware/auth.js` and `middleware/roleCheck.js`) decodes the token and verifies whether the user possesses the required role."

#### Q28: How does the delivery agent capture proof of delivery?
**Answer:** "When the delivery agent reaches the customer's destination, they open the shipment action modal on `agent-dashboard.html`, input the receiver's name and signature confirmation, and click 'Confirm Delivery'. The backend calls `PKG_DELIVERY.MARK_DELIVERED`, which records the receiver information in the `DELIVERY` table, updates the shipment status to `DELIVERED`, and frees the agent's vehicle."

#### Q29: What happens when an Admin deletes a route?
**Answer:** "The Admin dashboard calls `DELETE /api/admin/routes/:id`, which executes `PKG_ADMIN.DELETE_ROUTE(:p_route_id)`. The procedure deletes the route record from the `ROUTE` table and commits the transaction. If the route is referenced by active shipments, Oracle's foreign key constraint prevents deletion and raises a foreign key violation error."

#### Q30: How is warehouse capacity validated before booking?
**Answer:** "In `PKG_SHIPMENT.BOOK_SHIPMENT`, Oracle executes `SELECT Capacity FROM WAREHOUSE WHERE ... FOR UPDATE;` and queries function `FN_GET_WAREHOUSE_UTILIZATION()`. If current active shipments equal or exceed warehouse capacity, the procedure raises custom exception `e_insufficient_capacity` and rolls back to the savepoint."

#### Q31: What is a Cursor in PL/SQL, and where did you demonstrate it?
**Answer:** "A Cursor is a pointer to a private SQL memory area (context area) used to iterate over a multi-row result set. We demonstrated an explicit cursor in `SP_GENERATE_DELIVERY_REPORT` and `PKG_REPORTS.GENERATE_COMPREHENSIVE_REPORT` using `CURSOR c_report IS ...`, `OPEN`, `FETCH`, and `CLOSE`, as well as `SYS_REFCURSOR` dynamic cursors returned to Node.js."

#### Q32: What is the purpose of the `AUDIT_LOG` table?
**Answer:** "The `AUDIT_LOG` table provides non-repudiation and enterprise governance. Autonomous triggers (`TRG_AUDIT_CUSTOMER_INSERT`, `TRG_AUDIT_SHIPMENT_INSERT`) and package calls record every critical action, the affected table, record ID, and timestamp."

#### Q33: How does the system handle an agent's vehicle status?
**Answer:** "When an admin assigns a shipment to a delivery agent, trigger `TRG_VEHICLE_AVAILABILITY` automatically updates the agent's assigned vehicle status to `'IN_USE'`. When `PKG_DELIVERY.MARK_DELIVERED` completes the delivery, it resets the vehicle's availability back to `'AVAILABLE'`."

#### Q34: What is the difference between `DELETE`, `DROP`, and `TRUNCATE`?
**Answer:** 
- `DELETE`: A DML command that removes specific rows matching a `WHERE` clause. It generates undo information, fires delete triggers, and can be rolled back.
- `TRUNCATE`: A DDL command that removes all rows from a table by deallocating data extents. It does not generate row-level undo, cannot fire triggers, and cannot be rolled back.
- `DROP`: A DDL command that completely deletes the table definition, data, constraints, and associated indexes from the data dictionary."

#### Q35: If the professor asks: "Show me where live data is updating right now," what do you demonstrate?
**Answer:** 
1. Open SQL*Plus in the terminal:
   `docker exec -it oracle-free sqlplus courier_admin/Oracle123@FREEPDB1`
2. Run: `SELECT Shipment_ID, Current_Status FROM SHIPMENT ORDER BY Shipment_ID DESC FETCH FIRST 3 ROWS ONLY;`
3. Switch to the website, book a shipment or receive one in warehouse staff portal.
4. Re-run the query in terminal. Show the new row or status change appearing live.
5. Query `AUDIT_LOG` to show the trigger timestamp."

---

*Document compiled and verified for LogiTrack Logistics Courier Tracking System. All schema objects, PL/SQL definitions, and API routes tested against Oracle AI Database 23c Free on macOS Apple Silicon.*
"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Generated comprehensive review notes: {filepath}")

if __name__ == "__main__":
    out_path = "/Users/dinabandhu.boral2000gmail.com/Desktop/Courier_Tracking_Sys/PROJECT_REVIEW_NOTES.md"
    generate_markdown(out_path)
