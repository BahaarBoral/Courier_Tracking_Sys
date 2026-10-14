# Architecture - LogiTrack Courier Tracking System

> End-to-end traceability: from frontend UI to Oracle database.

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                 │
│                                                                          │
│   HTML Pages          JavaScript Modules        CSS                      │
│   ─────────          ──────────────────         ───                      │
│   index.html          js/common.js              css/style.css            │
│   login.html          js/auth.js                                         │
│   register.html       js/customer.js                                     │
│   customer-dashboard  js/admin.js                                        │
│   admin-dashboard     js/agent.js                                        │
│   agent-dashboard     js/warehouse.js                                    │
│   warehouse-dashboard js/booking.js                                      │
│   booking.html        js/tracking.js                                     │
│   tracking.html                                                          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ HTTP (fetch API)
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER (Thin)                           │
│                                                                          │
│   Express Server        Middleware           Routes → Controllers        │
│   ──────────────       ──────────           ─────────────────────        │
│   server.js             auth.js              authController.js           │
│   config/database.js    roleCheck.js         customerController.js       │
│                                              shipmentController.js       │
│                                              trackingController.js       │
│                                              paymentController.js        │
│                                              deliveryController.js       │
│                                              warehouseController.js      │
│                                              adminController.js          │
│                                              reportsController.js        │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ node-oracledb (bind variables)
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       ORACLE DATABASE LAYER                              │
│                                                                          │
│   PL/SQL Packages      Functions          Triggers       Views           │
│   ───────────────     ─────────          ────────       ─────           │
│   PKG_AUTH             FN_GET_*           TRG_SHIPMENT_  VW_CUSTOMER_    │
│   PKG_CUSTOMER         FN_CALCULATE_*     STATUS_HISTORY SHIPMENTS      │
│   PKG_SHIPMENT         FN_IS_VALID_*     TRG_AUDIT_*    VW_SHIPMENT_   │
│   PKG_TRACKING                            TRG_VEHICLE_   TRACKING       │
│   PKG_PAYMENT          Procedures          AVAILABILITY  VW_PENDING_    │
│   PKG_DELIVERY         ──────────                         DELIVERIES    │
│   PKG_WAREHOUSE        SP_LOG_AUDIT       Sequences      VW_WAREHOUSE_ │
│   PKG_ADMIN            SP_UPDATE_LOGIN    ─────────       UTILIZATION   │
│   PKG_REPORTS          SP_GENERATE_RPT    SEQ_CUSTOMER   VW_REVENUE_   │
│                                           SEQ_SHIPMENT    REPORT        │
│                                           SEQ_PAYMENT    VW_AGENT_      │
│   Tables (16)          Indexes (17)       SEQ_* (13)      PERFORMANCE   │
│   ──────────          ────────                                          │
│   CUSTOMER             IDX_CUSTOMER_EMAIL                                │
│   EMPLOYEE             IDX_SHIPMENT_*                                    │
│   ADMIN                IDX_TRACKING_*                                    │
│   WAREHOUSE_STAFF      IDX_PAYMENT_*                                     │
│   DELIVERY_AGENT       IDX_DELIVERY_*                                    │
│   WAREHOUSE            IDX_WAREHOUSE_*                                   │
│   VEHICLE              IDX_AUDIT_*                                       │
│   ROUTE                IDX_HISTORY_*                                     │
│   SHIPMENT                                                               │
│   PARCEL                                                                 │
│   TRACKING                                                               │
│   DELIVERY                                                               │
│   PAYMENT                                                                │
│   USER_ACCOUNT                                                           │
│   SHIPMENT_STATUS_HISTORY                                                │
│   AUDIT_LOG                                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Request Flow Traceability

### Authentication Flows

#### Customer Registration
```
register.html
  → js/auth.js (handleRegister)
    → POST /api/auth/register
      → routes/auth.js
        → controllers/authController.js (register)
          → bcrypt.hash(password)
          → PKG_AUTH.REGISTER_CUSTOMER(name, email, phone, address, hashedPassword)
            → INSERT INTO CUSTOMER (SEQ_CUSTOMER.NEXTVAL)
            → INSERT INTO USER_ACCOUNT (SEQ_ACCOUNT.NEXTVAL)
            → INSERT INTO AUDIT_LOG
            → COMMIT
          → Generate JWT token
        ← { token, user: {accountId, email, role, customerId, name} }
```

#### User Login
```
login.html
  → js/auth.js (handleLogin)
    → POST /api/auth/login
      → routes/auth.js
        → controllers/authController.js (login)
          → PKG_AUTH.AUTHENTICATE_USER(email, password)
            → SELECT FROM USER_ACCOUNT
              JOIN CUSTOMER/EMPLOYEE
            → Returns SYS_REFCURSOR
          → bcrypt.compare(password, hash)
          → SP_UPDATE_LAST_LOGIN(accountId)
          → Generate JWT token
        ← { token, user: {accountId, email, role, customerId/employeeId, name} }
```

#### Account Deletion
```
customer-dashboard.html (profile section)
  → js/customer.js (deleteAccount)
    → Confirmation modal
    → DELETE /api/auth/account
      → routes/auth.js
        → middleware/auth.js (verify JWT)
        → controllers/authController.js (deleteAccount)
          → PKG_AUTH.DELETE_ACCOUNT(accountId)
            → Check active shipments
            → DELETE FROM USER_ACCOUNT
            → DELETE FROM CUSTOMER
            → INSERT INTO AUDIT_LOG
            → COMMIT
        ← { success: true }
```

#### Change Password
```
customer-dashboard.html (profile section)
  → js/customer.js (changePassword)
    → PUT /api/auth/password
      → routes/auth.js
        → middleware/auth.js (verify JWT)
        → controllers/authController.js (changePassword)
          → Verify old password (bcrypt)
          → Hash new password (bcrypt)
          → PKG_AUTH.CHANGE_PASSWORD(accountId, oldHash, newHash)
            → UPDATE USER_ACCOUNT.Password_Hash
            → INSERT INTO AUDIT_LOG
            → COMMIT
        ← { success: true }
```

---

### Shipment Flows

#### Book Shipment (Critical Transaction)
```
booking.html
  → js/booking.js (submitBooking)
    → POST /api/shipments
      → routes/shipment.js
        → middleware/auth.js + roleCheck('CUSTOMER')
        → controllers/shipmentController.js (bookShipment)
          → PKG_SHIPMENT.BOOK_SHIPMENT(
              customerId, warehouseId, routeId,
              weight, deliveryType,
              parcelType, length, width, height, fragile,
              paymentMethod
            )
            → SAVEPOINT sp_book_shipment
            → SELECT ... FOR UPDATE on WAREHOUSE (row lock)
            → FN_CALCULATE_SHIPPING_COST(weight, distance, deliveryType)
            → FN_CALCULATE_ESTIMATED_DELIVERY(deliveryType, distance)
            → INSERT INTO SHIPMENT (SEQ_SHIPMENT.NEXTVAL)
            → INSERT INTO PARCEL (SEQ_PARCEL.NEXTVAL)
            → INSERT INTO TRACKING (SEQ_TRACKING.NEXTVAL) [status: 'BOOKED']
            → INSERT INTO PAYMENT (SEQ_PAYMENT.NEXTVAL)
            → INSERT INTO AUDIT_LOG
            → COMMIT
            → On exception: ROLLBACK TO sp_book_shipment
          ← OUT: shipmentId, parcelId, trackingId, paymentId
        ← { success: true, data: {shipmentId, parcelId, trackingId, paymentId} }
```

#### Track Shipment
```
tracking.html
  → js/tracking.js (searchShipment)
    → GET /api/tracking/:shipmentId
      → routes/tracking.js
        → middleware/auth.js
        → controllers/trackingController.js (getTrackingHistory)
          → PKG_TRACKING.GET_TRACKING_HISTORY(shipmentId)
            → SELECT FROM TRACKING WHERE Shipment_ID = :id
              ORDER BY Update_Time DESC
            → Returns SYS_REFCURSOR
        ← { success: true, data: [tracking records] }
    → GET /api/shipments/:shipmentId
      → controllers/shipmentController.js (getShipment)
        → PKG_SHIPMENT.GET_SHIPMENT(shipmentId)
          → SELECT FROM SHIPMENT
            JOIN CUSTOMER, PARCEL, WAREHOUSE, ROUTE
          → Returns SYS_REFCURSOR
        ← { success: true, data: {shipment details} }
```

#### Update Shipment Status
```
agent-dashboard.html / warehouse-dashboard.html
  → js/agent.js or js/warehouse.js
    → PUT /api/shipments/:id/status
      → routes/shipment.js
        → middleware/auth.js + roleCheck('ADMIN','DELIVERY_AGENT','WAREHOUSE_STAFF')
        → controllers/shipmentController.js (updateStatus)
          → PKG_SHIPMENT.UPDATE_SHIPMENT_STATUS(shipmentId, newStatus, location, remarks, userId)
            → FN_IS_VALID_STATUS_TRANSITION(oldStatus, newStatus)
            → If invalid: RAISE e_invalid_status
            → UPDATE SHIPMENT SET Current_Status = newStatus
            → INSERT INTO TRACKING (new record)
            → INSERT INTO AUDIT_LOG
            → COMMIT
            → TRIGGER: TRG_SHIPMENT_STATUS_HISTORY fires
              → INSERT INTO SHIPMENT_STATUS_HISTORY
        ← { success: true }
```

#### Cancel Shipment
```
customer-dashboard.html
  → js/customer.js (cancelShipment)
    → PUT /api/shipments/:id/cancel
      → routes/shipment.js
        → middleware/auth.js + roleCheck('CUSTOMER','ADMIN')
        → controllers/shipmentController.js (cancelShipment)
          → PKG_SHIPMENT.CANCEL_SHIPMENT(shipmentId, userId)
            → Check status (not DELIVERED)
            → UPDATE SHIPMENT SET Current_Status = 'CANCELLED'
            → UPDATE PAYMENT SET Payment_Status = 'REFUNDED' (if PAID)
            → INSERT INTO TRACKING
            → INSERT INTO AUDIT_LOG
            → COMMIT
        ← { success: true }
```

---

### Delivery Flows

#### Assign Delivery
```
admin-dashboard.html
  → js/admin.js (assignDelivery)
    → POST /api/deliveries/assign
      → routes/delivery.js
        → middleware/auth.js + roleCheck('ADMIN')
        → controllers/deliveryController.js (assignDelivery)
          → PKG_DELIVERY.ASSIGN_DELIVERY(shipmentId, agentId, userId)
            → INSERT INTO DELIVERY (SEQ_DELIVERY.NEXTVAL)
            → UPDATE SHIPMENT SET Agent_ID = agentId
            → INSERT INTO AUDIT_LOG
            → COMMIT
            → TRIGGER: TRG_VEHICLE_AVAILABILITY fires
              → UPDATE VEHICLE SET Availability = 'IN_USE'
          ← OUT: deliveryId
        ← { success: true, data: {deliveryId} }
```

#### Mark Delivered (Transaction)
```
agent-dashboard.html
  → js/agent.js (markDelivered)
    → PUT /api/deliveries/:id/complete
      → routes/delivery.js
        → middleware/auth.js + roleCheck('DELIVERY_AGENT')
        → controllers/deliveryController.js (markDelivered)
          → PKG_DELIVERY.MARK_DELIVERED(deliveryId, receiverName, receiverSignature, userId)
            → UPDATE DELIVERY: status='DELIVERED', receiver info, date=SYSDATE
            → UPDATE SHIPMENT: Current_Status='DELIVERED'
            → INSERT INTO TRACKING: status='DELIVERED'
            → UPDATE VEHICLE: Availability='AVAILABLE'
            → INSERT INTO AUDIT_LOG
            → COMMIT
            → TRIGGER: TRG_SHIPMENT_STATUS_HISTORY fires
        ← { success: true }
```

---

### Warehouse Flows

#### Receive Shipment (with Row Locking)
```
warehouse-dashboard.html
  → js/warehouse.js (receiveShipment)
    → PUT /api/warehouses/receive/:shipmentId
      → routes/warehouse.js
        → middleware/auth.js + roleCheck('WAREHOUSE_STAFF')
        → controllers/warehouseController.js (receiveShipment)
          → PKG_WAREHOUSE.RECEIVE_SHIPMENT(shipmentId, warehouseId, userId)
            → SELECT ... FOR UPDATE on WAREHOUSE (concurrency control!)
            → FN_GET_WAREHOUSE_UTILIZATION(warehouseId)
            → If over capacity: RAISE e_insufficient_capacity
            → UPDATE SHIPMENT: status='WAREHOUSE_RECEIVED', Warehouse_ID
            → INSERT INTO TRACKING
            → INSERT INTO AUDIT_LOG
            → COMMIT (releases lock)
        ← { success: true }
```

#### Dispatch Shipment
```
warehouse-dashboard.html
  → js/warehouse.js (dispatchShipment)
    → PUT /api/warehouses/dispatch/:shipmentId
      → routes/warehouse.js
        → middleware/auth.js + roleCheck('WAREHOUSE_STAFF')
        → controllers/warehouseController.js (dispatchShipment)
          → PKG_WAREHOUSE.DISPATCH_SHIPMENT(shipmentId, userId)
            → UPDATE SHIPMENT: status='IN_TRANSIT'
            → INSERT INTO TRACKING
            → INSERT INTO AUDIT_LOG
            → COMMIT
        ← { success: true }
```

---

### Payment Flows

#### Process Payment
```
customer-dashboard.html (payments section)
  → js/customer.js (processPayment)
    → PUT /api/payments/:id/process
      → routes/payment.js
        → middleware/auth.js + roleCheck('CUSTOMER')
        → controllers/paymentController.js (processPayment)
          → PKG_PAYMENT.PROCESS_PAYMENT(paymentId, userId)
            → UPDATE PAYMENT: Payment_Status='PAID', Payment_Date=SYSTIMESTAMP
            → INSERT INTO AUDIT_LOG
            → COMMIT
            → TRIGGER: TRG_AUDIT_PAYMENT_UPDATE fires
        ← { success: true }
```

---

### Admin Flows

#### Dashboard Statistics
```
admin-dashboard.html
  → js/admin.js (loadDashboard)
    → GET /api/admin/dashboard
      → routes/admin.js
        → middleware/auth.js + roleCheck('ADMIN')
        → controllers/adminController.js (getDashboardStats)
          → PKG_ADMIN.GET_DASHBOARD_STATS()
            → SELECT total_customers FROM CUSTOMER (COUNT)
            → SELECT total_shipments FROM SHIPMENT (COUNT)
            → SELECT active shipments (COUNT WHERE status NOT IN ...)
            → FN_GET_TOTAL_REVENUE()
            → Returns SYS_REFCURSOR
        ← { success: true, data: {stats} }
```

#### Reports
```
admin-dashboard.html (reports section)
  → js/admin.js (loadReports)
    → GET /api/reports/revenue
      → controllers/reportsController.js
        → PKG_REPORTS.GET_REVENUE_BY_MONTH()
          → SELECT EXTRACT(YEAR/MONTH), SUM(Amount)
            FROM PAYMENT WHERE Status='PAID'
            GROUP BY year, month ORDER BY ...
          → Returns SYS_REFCURSOR (uses cursor internally)
    → GET /api/reports/agent-performance
      → PKG_REPORTS.GET_AGENT_PERFORMANCE_REPORT()
    → GET /api/reports/warehouse-utilization
      → PKG_REPORTS.GET_WAREHOUSE_UTILIZATION_REPORT()
    → GET /api/reports/top-customers
      → PKG_REPORTS.GET_TOP_CUSTOMERS(10)
```

#### Employee Management (EER Specialization)
```
admin-dashboard.html (employees section)
  → js/admin.js (addEmployee)
    → POST /api/admin/employees
      → controllers/adminController.js (addEmployee)
        → PKG_ADMIN.ADD_EMPLOYEE(name, phone, email, salary, type, password, ...)
          → SAVEPOINT sp_add_emp
          → INSERT INTO EMPLOYEE (SEQ_EMPLOYEE.NEXTVAL)
          → CASE type:
              'ADMIN'           → INSERT INTO ADMIN
              'DELIVERY_AGENT'  → INSERT INTO DELIVERY_AGENT
              'WAREHOUSE_STAFF' → INSERT INTO WAREHOUSE_STAFF
          → INSERT INTO USER_ACCOUNT (SEQ_ACCOUNT.NEXTVAL)
          → INSERT INTO AUDIT_LOG
          → COMMIT
          → On exception: ROLLBACK TO sp_add_emp
```

---

### Customer Profile Flows

#### View Profile
```
customer-dashboard.html (profile section)
  → js/customer.js (loadProfile)
    → GET /api/customers/profile
      → middleware/auth.js + roleCheck('CUSTOMER')
      → controllers/customerController.js (getProfile)
        → PKG_CUSTOMER.GET_CUSTOMER_PROFILE(customerId)
          → SELECT FROM CUSTOMER WHERE Customer_ID = :id
          → Returns SYS_REFCURSOR
        ← { success: true, data: {customer details} }
```

---

## Database Object Reference

### Tables → Created By → Used By

| Table | Created In | Primary Package | Triggers |
|-------|-----------|-----------------|----------|
| CUSTOMER | 01_create_tables.sql | PKG_AUTH, PKG_CUSTOMER | TRG_AUDIT_CUSTOMER_INSERT |
| EMPLOYEE | 01_create_tables.sql | PKG_ADMIN | - |
| ADMIN | 01_create_tables.sql | PKG_ADMIN | - |
| WAREHOUSE_STAFF | 01_create_tables.sql | PKG_ADMIN | - |
| DELIVERY_AGENT | 01_create_tables.sql | PKG_ADMIN, PKG_DELIVERY | - |
| WAREHOUSE | 01_create_tables.sql | PKG_WAREHOUSE | - |
| VEHICLE | 01_create_tables.sql | PKG_ADMIN | TRG_VEHICLE_AVAILABILITY |
| ROUTE | 01_create_tables.sql | PKG_ADMIN | - |
| SHIPMENT | 01_create_tables.sql | PKG_SHIPMENT | TRG_SHIPMENT_STATUS_HISTORY, TRG_AUDIT_SHIPMENT_INSERT |
| PARCEL | 01_create_tables.sql | PKG_SHIPMENT | - |
| TRACKING | 01_create_tables.sql | PKG_TRACKING, PKG_SHIPMENT | - |
| DELIVERY | 01_create_tables.sql | PKG_DELIVERY | TRG_VEHICLE_AVAILABILITY |
| PAYMENT | 01_create_tables.sql | PKG_PAYMENT | TRG_AUDIT_PAYMENT_UPDATE |
| USER_ACCOUNT | 01_create_tables.sql | PKG_AUTH | - |
| SHIPMENT_STATUS_HISTORY | 01_create_tables.sql | PKG_TRACKING | (populated by TRG_SHIPMENT_STATUS_HISTORY) |
| AUDIT_LOG | 01_create_tables.sql | SP_LOG_AUDIT, all packages | (populated by TRG_AUDIT_* triggers) |

### Views → Source Tables → Used By

| View | Source Tables | API Endpoint |
|------|-------------|--------------|
| VW_CUSTOMER_SHIPMENTS | CUSTOMER, SHIPMENT, PARCEL, PAYMENT | /api/shipments/my |
| VW_SHIPMENT_TRACKING | SHIPMENT, TRACKING, CUSTOMER | /api/tracking/:id |
| VW_PENDING_DELIVERIES | DELIVERY, SHIPMENT, CUSTOMER, EMPLOYEE, ROUTE | /api/deliveries |
| VW_WAREHOUSE_UTILIZATION | WAREHOUSE, SHIPMENT | /api/reports/warehouse-utilization |
| VW_REVENUE_REPORT | PAYMENT | /api/reports/revenue |
| VW_AGENT_PERFORMANCE | EMPLOYEE, DELIVERY_AGENT, DELIVERY | /api/reports/agent-performance |
| VW_SHIPMENT_DETAILS | SHIPMENT, CUSTOMER, PARCEL, WAREHOUSE, ROUTE, PAYMENT, DELIVERY | /api/admin/dashboard |
| VW_EMPLOYEE_DETAILS | EMPLOYEE, ADMIN, DELIVERY_AGENT, WAREHOUSE_STAFF | /api/admin/employees |

### Sequences → Used In

| Sequence | Start | Used By |
|----------|-------|---------|
| SEQ_CUSTOMER | 1000 | PKG_AUTH.REGISTER_CUSTOMER |
| SEQ_EMPLOYEE | 2000 | PKG_ADMIN.ADD_EMPLOYEE |
| SEQ_WAREHOUSE | 3000 | PKG_WAREHOUSE.ADD_WAREHOUSE |
| SEQ_VEHICLE | 4000 | PKG_ADMIN.ADD_VEHICLE |
| SEQ_ROUTE | 5000 | PKG_ADMIN.ADD_ROUTE |
| SEQ_SHIPMENT | 10000 | PKG_SHIPMENT.BOOK_SHIPMENT |
| SEQ_PARCEL | 20000 | PKG_SHIPMENT.BOOK_SHIPMENT |
| SEQ_TRACKING | 30000 | PKG_SHIPMENT, PKG_WAREHOUSE, PKG_DELIVERY |
| SEQ_DELIVERY | 40000 | PKG_DELIVERY.ASSIGN_DELIVERY |
| SEQ_PAYMENT | 50000 | PKG_SHIPMENT.BOOK_SHIPMENT |
| SEQ_ACCOUNT | 60000 | PKG_AUTH.REGISTER_CUSTOMER, PKG_ADMIN.ADD_EMPLOYEE |
| SEQ_HISTORY | 70000 | TRG_SHIPMENT_STATUS_HISTORY |
| SEQ_AUDIT | 80000 | SP_LOG_AUDIT, TRG_AUDIT_* |

### Functions → Called By

| Function | Called By |
|----------|----------|
| FN_GET_CUSTOMER_SHIPMENT_COUNT | PKG_REPORTS, direct SQL |
| FN_GET_WAREHOUSE_UTILIZATION | PKG_WAREHOUSE.RECEIVE_SHIPMENT |
| FN_GET_TOTAL_REVENUE | PKG_ADMIN.GET_DASHBOARD_STATS |
| FN_GET_PENDING_PAYMENT_COUNT | PKG_ADMIN.GET_DASHBOARD_STATS |
| FN_CALCULATE_SHIPPING_COST | PKG_SHIPMENT.BOOK_SHIPMENT |
| FN_GET_AGENT_DELIVERY_COUNT | PKG_REPORTS |
| FN_CALCULATE_ESTIMATED_DELIVERY | PKG_SHIPMENT.BOOK_SHIPMENT |
| FN_IS_VALID_STATUS_TRANSITION | PKG_SHIPMENT.UPDATE_SHIPMENT_STATUS |

---

## Security Model

```
┌─────────────┐   JWT Token    ┌──────────────┐   Oracle User    ┌──────────┐
│   Browser   │ ──────────────▶│   Express    │ ──────────────▶ │  Oracle  │
│             │                │   Server     │   (pooled conn)  │  DB      │
│  - No DB    │                │              │                  │          │
│    creds    │                │  - Validates │                  │ - PKG    │
│  - JWT only │                │    JWT       │                  │   auth   │
│  - Role in  │                │  - Checks   │                  │ - Role   │
│    token    │                │    role      │                  │   check  │
│             │                │  - Bind vars │                  │ - No SQL │
│             │                │              │                  │   inject │
└─────────────┘                └──────────────┘                  └──────────┘
```

**Security layers:**
1. **Frontend:** No database credentials, JWT stored in localStorage
2. **Backend middleware:** JWT verification, role-based route protection
3. **Backend controllers:** Parameterized queries (bind variables only)
4. **Oracle PL/SQL:** Business rule validation, exception handling
5. **Oracle constraints:** Data integrity at the database level

---

## Where to Find Key Concepts

| Concept | File(s) |
|---------|---------|
| **Table Creation** | database/01_create_tables.sql |
| **Constraints** | database/01_create_tables.sql, database/02_constraints.sql |
| **Sequences** | database/03_sequences.sql |
| **Indexes** | database/04_indexes.sql |
| **Views** | database/05_views.sql |
| **Functions** | database/06_functions.sql |
| **Procedures** | database/07_procedures.sql |
| **Packages** | database/08_packages.sql |
| **Triggers** | database/09_triggers.sql |
| **Sample Data** | database/10_seed_data.sql |
| **Demo Queries** | database/11_demo_queries.sql |
| **Concurrency** | database/12_transaction_concurrency_demo.sql |
| **SAVEPOINT/ROLLBACK** | database/08_packages.sql (PKG_SHIPMENT, PKG_AUTH) |
| **SELECT FOR UPDATE** | database/08_packages.sql (PKG_WAREHOUSE, PKG_SHIPMENT) |
| **Cursors** | database/07_procedures.sql, database/08_packages.sql (PKG_REPORTS) |
| **Exception Handling** | database/08_packages.sql (all packages) |
| **EER Specialization** | database/01_create_tables.sql (EMPLOYEE → subtypes) |
| **Normalization** | docs/normalization.md |
| **Transactions/ACID** | docs/transactions.md |
| **Relational Algebra** | docs/relational-algebra.md |
| **Query Optimization** | docs/query-optimization.md |
| **Hashing** | docs/hashing.md |
| **EXPLAIN PLAN** | database/04_indexes.sql, database/11_demo_queries.sql |
