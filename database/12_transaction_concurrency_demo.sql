-- ============================================================
-- TRANSACTION & CONCURRENCY CONTROL DEMONSTRATION
-- ============================================================
-- This file demonstrates concurrency control concepts using
-- Oracle's row-level locking mechanism.
--
-- INSTRUCTIONS:
-- Open TWO separate Oracle SQL Developer sessions.
-- Execute the commands as indicated for Session 1 and Session 2.
-- This demonstrates how Oracle handles concurrent access.
-- ============================================================

-- ============================================================
-- SCENARIO 1: LOST UPDATE PROBLEM (CONCEPTUAL)
-- ============================================================
-- Without proper locking, two concurrent transactions could
-- read the same warehouse capacity, both think there's space,
-- and both assign shipments, exceeding capacity.
--
-- Oracle prevents this with its locking mechanisms.

-- ============================================================
-- SCENARIO 2: ROW LOCKING WITH SELECT FOR UPDATE
-- ============================================================
--
-- Context: Two warehouse staff members try to receive
-- shipments into the same warehouse simultaneously.
-- The warehouse has limited capacity.

-- SETUP: Check current warehouse state
SELECT Warehouse_ID, Warehouse_Name, Capacity FROM WAREHOUSE WHERE Warehouse_ID = 3000;
SELECT COUNT(*) AS Current_Shipments 
FROM SHIPMENT 
WHERE Warehouse_ID = 3000 AND Current_Status NOT IN ('DELIVERED', 'CANCELLED');

-- ============================================================
-- SESSION 1: Execute these commands first
-- ============================================================

-- Step 1 (Session 1): Lock the warehouse row for update
SELECT Warehouse_ID, Warehouse_Name, Capacity 
FROM WAREHOUSE 
WHERE Warehouse_ID = 3000 
FOR UPDATE;
-- This acquires a row-level lock on the warehouse row.
-- Session 1 now holds the lock.

-- Step 2 (Session 1): Check capacity and process
-- (Imagine business logic checking if capacity allows receiving)
SELECT COUNT(*) AS Current_Load
FROM SHIPMENT 
WHERE Warehouse_ID = 3000 
AND Current_Status NOT IN ('DELIVERED', 'CANCELLED');

-- Session 1 has NOT yet committed or rolled back.
-- Now switch to Session 2.

-- ============================================================
-- SESSION 2: Execute these commands while Session 1 holds lock
-- ============================================================

-- Step 3 (Session 2): Try to lock the SAME warehouse row
SELECT Warehouse_ID, Warehouse_Name, Capacity 
FROM WAREHOUSE 
WHERE Warehouse_ID = 3000 
FOR UPDATE;
-- THIS WILL BLOCK! Session 2 waits until Session 1 releases the lock.
-- This demonstrates Oracle's row-level locking mechanism.
-- Session 2 is serialized behind Session 1.

-- Alternative: Use NOWAIT to get immediate feedback
-- SELECT * FROM WAREHOUSE WHERE Warehouse_ID = 3000 FOR UPDATE NOWAIT;
-- This would raise: ORA-00054: resource busy and acquire with NOWAIT specified

-- Alternative: Use WAIT with timeout
-- SELECT * FROM WAREHOUSE WHERE Warehouse_ID = 3000 FOR UPDATE WAIT 5;
-- This would wait up to 5 seconds before raising an error

-- ============================================================
-- BACK TO SESSION 1: Release the lock
-- ============================================================

-- Step 4 (Session 1): Commit to release the lock
COMMIT;
-- Now Session 2's SELECT FOR UPDATE will complete and acquire the lock.

-- ============================================================
-- SESSION 2: Now completes
-- ============================================================

-- Step 5 (Session 2): Session 2 now has the lock
-- Process the warehouse operation...
COMMIT;

-- ============================================================
-- SCENARIO 3: TRANSACTION ISOLATION
-- ============================================================
-- Demonstrates Oracle's default READ COMMITTED isolation level.

-- SESSION 1:
UPDATE SHIPMENT SET Current_Status = 'IN_TRANSIT' WHERE Shipment_ID = 10001;
-- Don't commit yet!

-- SESSION 2:
SELECT Current_Status FROM SHIPMENT WHERE Shipment_ID = 10001;
-- Session 2 sees the OLD status (READ COMMITTED - no dirty reads)

-- SESSION 1:
COMMIT;

-- SESSION 2:
SELECT Current_Status FROM SHIPMENT WHERE Shipment_ID = 10001;
-- Now Session 2 sees 'IN_TRANSIT'

-- ============================================================
-- SCENARIO 4: DEADLOCK DEMONSTRATION (CONCEPTUAL)
-- ============================================================
-- Oracle automatically detects deadlocks and rolls back
-- one of the transactions with ORA-00060.
--
-- Session 1: UPDATE WAREHOUSE SET Capacity = 100 WHERE Warehouse_ID = 3000;
-- Session 2: UPDATE WAREHOUSE SET Capacity = 100 WHERE Warehouse_ID = 3001;
-- Session 1: UPDATE WAREHOUSE SET Capacity = 100 WHERE Warehouse_ID = 3001; -- WAITS
-- Session 2: UPDATE WAREHOUSE SET Capacity = 100 WHERE Warehouse_ID = 3000; -- DEADLOCK!
-- Oracle detects the cycle and rolls back one session.

-- ============================================================
-- ACADEMIC NOTES
-- ============================================================
-- 
-- LOCK TYPES IN ORACLE:
-- 1. Row-level locks (TX locks): Acquired automatically on DML
-- 2. Table-level locks (TM locks): Acquired to protect table structure
--
-- TWO-PHASE LOCKING:
-- Oracle implements a variant of 2PL:
-- - Growing phase: locks acquired as needed during transaction
-- - Shrinking phase: all locks released at COMMIT/ROLLBACK
--
-- LOCK COMPATIBILITY:
-- - Multiple transactions can hold shared (read) locks
-- - Only one transaction can hold an exclusive (write) lock
-- - SELECT FOR UPDATE acquires exclusive row locks
--
-- ISOLATION LEVELS:
-- - READ COMMITTED (default): No dirty reads, but non-repeatable reads possible
-- - SERIALIZABLE: Full isolation, but may get ORA-08177
--
-- DEADLOCK HANDLING:
-- - Oracle uses a wait-for graph for detection
-- - Automatically rolls back the statement (not transaction) that detects deadlock
-- - Application should handle ORA-00060 and retry
