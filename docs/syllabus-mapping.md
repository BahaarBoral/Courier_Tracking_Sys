# Database Systems Syllabus Mapping

The Logistics Courier Tracking System is designed as a practical implementation of academic database concepts. Below is the mapping of the project features to the standard database syllabus.

## Module 1: Database Systems Concepts and Architecture

| Syllabus Topic | Project Feature | Implementation File | Demo Method |
|---|---|---|---|
| Three-schema architecture | Physical (Oracle), Logical (views), External (API) | `05_views.sql`, `backend/routes/` | Explain system layers during architecture review |
| Client/server architecture | Express server + Oracle DB integration | `backend/server.js`, `backend/config/database.js` | Show running system communicating with DB |
| DBA role and Data Dictionary | Admin dashboard, user management, system logs | `admin-dashboard.html`, `PKG_ADMIN` | Login as admin and view dashboard metrics |
| ACID Properties | Atomic shipment booking operations | `06_packages.sql` (PKG_SHIPMENT) | Show successful insert vs constraint rollback |

## Module 2: Relational Model & ER Design

| Syllabus Topic | Project Feature | Implementation File | Demo Method |
|---|---|---|---|
| Entities and Attributes | Customers, Shipments, Warehouses, Vehicles | `01_tables.sql` | Show DDL scripts and table structures |
| Primary Keys & Foreign Keys | Entity relationships and referential integrity | `01_tables.sql` | Demonstrate `ON DELETE CASCADE` or FK blocks |
| EER Specialization | Employee subtypes (Admin, Agent, Staff) | `01_tables.sql` | Show inheritance pattern in DB tables |
| Constraints (Domain, Key) | CHECK constraints for statuses, UNIQUE keys | `01_tables.sql` | Attempt to insert invalid status type |

## Module 3: Database Design & Normalization

| Syllabus Topic | Project Feature | Implementation File | Demo Method |
|---|---|---|---|
| Functional Dependencies | Core entity relationships (e.g. Shipment -> ID) | `docs/normalization.md` | Discuss FD list |
| Normal Forms (1NF, 2NF) | Atomic columns, single-attribute PKs | Schema layout | Show CUSTOMER table structure |
| Boyce-Codd (BCNF) & 3NF | Eliminating transitive dependencies | Schema layout | Show separation of CUSTOMER and SHIPMENT |
| Lossless-Join Decomposition | Designing normalized relational schemas | `docs/normalization.md` | Explain schema breakdown |

## Module 4: Physical Design & Query Processing

| Syllabus Topic | Project Feature | Implementation File | Demo Method |
|---|---|---|---|
| Indexing structures (B+ Trees) | PK constraints, secondary indexes | `03_indexes.sql` | Run EXPLAIN PLAN on indexed column |
| Relational Algebra | SQL to RA translation for views and functions | `docs/relational-algebra.md` | Map `05_views.sql` queries to RA |
| Query Optimization/CBO | Efficient join strategies, heuristic optimization | `docs/query-optimization.md` | Show execution plan differences |
| Views and Materialization | Abstracting complex joins for the frontend | `05_views.sql` | Query `VW_SHIPMENT_DETAILS` in SQL Developer |

## Module 5: Transaction Processing & Recovery

| Syllabus Topic | Project Feature | Implementation File | Demo Method |
|---|---|---|---|
| Transaction States | Active, Commit, Rollback | `06_packages.sql` | Review exception blocks in PL/SQL |
| COMMIT and ROLLBACK | Explicit transaction boundaries | `06_packages.sql` | Demonstrate a bundled PL/SQL insert failing |
| SAVEPOINT | Partial rollbacks for non-critical sub-tasks | `06_packages.sql` (BOOK_SHIPMENT) | Trace PL/SQL execution |
| Log-based recovery | Oracle Undo/Redo mechanisms | `docs/transactions.md` | Explain Oracle instance recovery |

## Module 6: Concurrency Control

| Syllabus Topic | Project Feature | Implementation File | Demo Method |
|---|---|---|---|
| Serializability | Ensuring consistent concurrent updates | `backend/routes/shipment.js` | Explain DB level locks during updates |
| Locking protocols | Exclusive locks on row updates | Live DB testing | Run `SELECT FOR UPDATE` in two SQL tabs |
| Deadlock prevention | Ordered updates, timeout configurations | Oracle internals | Discuss Oracle's deadlock detection (ORA-00060) |
| Isolation Levels | Read Committed (Oracle Default) | Oracle internals | Show dirty read prevention |

## Module 7: Advanced DB Concepts (NoSQL & Triggers)

| Syllabus Topic | Project Feature | Implementation File | Demo Method |
|---|---|---|---|
| Active Databases (Triggers) | Automated auditing, history tracking | `04_triggers.sql` | Update a shipment and show audit table auto-insert |
| Stored Procedures/Functions | Encapsulating business logic in DB | `06_packages.sql` | Execute function to calculate delivery estimate |
| PL/SQL cursors/exceptions | Iterating data, robust error handling | `06_packages.sql` | Show cursor usage in admin reports |
| NoSQL (Conceptual comparison)| Contrast relational schema with document stores | `docs/syllabus-mapping.md` | Briefly mention how JSON tracking data compares |
