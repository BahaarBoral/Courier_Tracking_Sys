-- ====================================================================
-- Script Name: 04_indexes.sql
-- Description: Indexes to improve query performance
-- RDBMS: Oracle Database
-- ====================================================================

-- for login lookups
CREATE INDEX IDX_CUSTOMER_EMAIL ON CUSTOMER(Email);

-- for customer shipment queries
CREATE INDEX IDX_SHIPMENT_CUSTOMER ON SHIPMENT(Customer_ID);

-- for status-based filtering
CREATE INDEX IDX_SHIPMENT_STATUS ON SHIPMENT(Current_Status);

-- for warehouse shipment queries
CREATE INDEX IDX_SHIPMENT_WAREHOUSE ON SHIPMENT(Warehouse_ID);

-- for route-based queries
CREATE INDEX IDX_SHIPMENT_ROUTE ON SHIPMENT(Route_ID);

-- for agent assignment queries
CREATE INDEX IDX_SHIPMENT_AGENT ON SHIPMENT(Agent_ID);

-- for tracking lookups by shipment
CREATE INDEX IDX_TRACKING_SHIPMENT ON TRACKING(Shipment_ID);

-- for status filtering
CREATE INDEX IDX_TRACKING_STATUS ON TRACKING(Status);

-- for payment status queries
CREATE INDEX IDX_PAYMENT_STATUS ON PAYMENT(Payment_Status);

-- for shipment payment lookup
CREATE INDEX IDX_PAYMENT_SHIPMENT ON PAYMENT(Shipment_ID);

-- for agent delivery queries
CREATE INDEX IDX_DELIVERY_AGENT ON DELIVERY(Agent_ID);

-- for delivery status filtering
CREATE INDEX IDX_DELIVERY_STATUS ON DELIVERY(Delivery_Status);

-- for authentication
CREATE INDEX IDX_USER_ACCOUNT_EMAIL ON USER_ACCOUNT(Email);

-- for location-based queries
CREATE INDEX IDX_WAREHOUSE_LOCATION ON WAREHOUSE(Location);

-- for audit log queries
CREATE INDEX IDX_AUDIT_ACTION_TIME ON AUDIT_LOG(Action_Time);

-- for history lookups
CREATE INDEX IDX_HISTORY_SHIPMENT ON SHIPMENT_STATUS_HISTORY(Shipment_ID);


-- ====================================================================
-- EXPLAIN PLAN EXAMPLES
-- ====================================================================

/*
-- EXPLAIN PLAN demonstration
EXPLAIN PLAN FOR
SELECT * FROM CUSTOMER WHERE Email = 'test@example.com';

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- Without index vs with index comparison explanation:
-- Without the IDX_CUSTOMER_EMAIL index, Oracle performs a FULL TABLE SCAN, reading 
-- all rows in the CUSTOMER table to find the matching email. This is slow for large tables.
-- With the index, Oracle performs an INDEX RANGE SCAN (or UNIQUE SCAN since Email is constrained as UNIQUE),
-- which allows it to directly locate the specific block(s) storing the data by traversing 
-- a B-tree, significantly speeding up the lookup.
*/
