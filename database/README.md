# Database Scripts - Logistics Courier Tracking System

## Script Execution Order

Execute these scripts in Oracle SQL Developer in the following order:

| # | File | Description |
|---|------|-------------|
| 1 | 01_create_tables.sql | Creates all tables with constraints |
| 2 | 02_constraints.sql | Additional integrity constraints |
| 3 | 03_sequences.sql | Oracle sequences for ID generation |
| 4 | 04_indexes.sql | Performance indexes |
| 5 | 05_views.sql | Database views |
| 6 | 06_functions.sql | Standalone PL/SQL functions |
| 7 | 07_procedures.sql | Standalone PL/SQL procedures |
| 8 | 08_packages.sql | PL/SQL packages (main business logic) |
| 9 | 09_triggers.sql | Database triggers |
| 10 | 10_seed_data.sql | Sample/demo data |
| 11 | 11_demo_queries.sql | Demonstration queries (run individually) |
| 12 | 12_transaction_concurrency_demo.sql | Concurrency demo (needs 2 sessions) |

## Setup Instructions

1. Connect to Oracle as a user with CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER privileges
2. Run scripts 01 through 10 in order
3. Scripts 11 and 12 are for demonstration/evaluation only

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | customer.demo@example.com | Demo@123 |
| Admin | admin.demo@example.com | Demo@123 |
| Delivery Agent | agent.demo@example.com | Demo@123 |
| Warehouse Staff | warehouse.demo@example.com | Demo@123 |

## Troubleshooting

- If packages show INVALID status, recompile: `ALTER PACKAGE pkg_name COMPILE;`
- If sequences already exist, drop them first: `DROP SEQUENCE seq_name;`
- To reset everything: drop all objects and rerun from script 01
