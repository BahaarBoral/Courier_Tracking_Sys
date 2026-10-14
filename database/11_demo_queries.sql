-- ============================================================
-- LOGISTICS COURIER TRACKING SYSTEM - DEMONSTRATION QUERIES
-- ============================================================
-- These queries demonstrate SQL concepts for academic evaluation.
-- Run each section individually in Oracle SQL Developer.
-- ============================================================

-- ============================================================
-- 1. BASIC QUERIES AND JOINS
-- ============================================================

-- 1.1 Customer Shipment History (INNER JOIN)
SELECT c.Name, s.Shipment_ID, s.Booking_Date, s.Current_Status, s.Delivery_Type
FROM CUSTOMER c
INNER JOIN SHIPMENT s ON c.Customer_ID = s.Customer_ID
ORDER BY s.Booking_Date DESC;

-- 1.2 Active Shipments with Customer Info (LEFT JOIN)
SELECT s.Shipment_ID, c.Name AS Customer_Name, s.Current_Status, 
       w.Warehouse_Name, r.Source || ' → ' || r.Destination AS Route
FROM SHIPMENT s
LEFT JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
LEFT JOIN WAREHOUSE w ON s.Warehouse_ID = w.Warehouse_ID
LEFT JOIN ROUTE r ON s.Route_ID = r.Route_ID
WHERE s.Current_Status NOT IN ('DELIVERED', 'CANCELLED');

-- 1.3 Pending Payments with Shipment Details
SELECT p.Payment_ID, s.Shipment_ID, c.Name, p.Amount, p.Payment_Method, p.Payment_Status
FROM PAYMENT p
JOIN SHIPMENT s ON p.Shipment_ID = s.Shipment_ID
JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
WHERE p.Payment_Status = 'PENDING';

-- ============================================================
-- 2. AGGREGATE FUNCTIONS AND GROUP BY
-- ============================================================

-- 2.1 Revenue by Month
SELECT EXTRACT(YEAR FROM Payment_Date) AS Year,
       EXTRACT(MONTH FROM Payment_Date) AS Month,
       SUM(Amount) AS Total_Revenue,
       COUNT(*) AS Payment_Count
FROM PAYMENT
WHERE Payment_Status = 'PAID'
GROUP BY EXTRACT(YEAR FROM Payment_Date), EXTRACT(MONTH FROM Payment_Date)
ORDER BY Year DESC, Month DESC;

-- 2.2 Warehouse Utilization
SELECT w.Warehouse_Name, w.Capacity,
       COUNT(s.Shipment_ID) AS Current_Shipments,
       w.Capacity - COUNT(s.Shipment_ID) AS Available,
       ROUND(COUNT(s.Shipment_ID) / w.Capacity * 100, 2) AS Utilization_Pct
FROM WAREHOUSE w
LEFT JOIN SHIPMENT s ON w.Warehouse_ID = s.Warehouse_ID
  AND s.Current_Status NOT IN ('DELIVERED', 'CANCELLED')
GROUP BY w.Warehouse_ID, w.Warehouse_Name, w.Capacity;

-- 2.3 Agent Performance
SELECT e.Name AS Agent_Name, da.License_No,
       COUNT(d.Delivery_ID) AS Total_Deliveries,
       SUM(CASE WHEN d.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) AS Completed,
       ROUND(SUM(CASE WHEN d.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) / 
             NULLIF(COUNT(d.Delivery_ID), 0) * 100, 2) AS Success_Rate
FROM EMPLOYEE e
JOIN DELIVERY_AGENT da ON e.Employee_ID = da.Employee_ID
LEFT JOIN DELIVERY d ON da.Employee_ID = d.Agent_ID
GROUP BY e.Name, da.License_No;

-- 2.4 Most Used Routes (HAVING)
SELECT r.Source, r.Destination, r.Distance,
       COUNT(s.Shipment_ID) AS Shipment_Count
FROM ROUTE r
JOIN SHIPMENT s ON r.Route_ID = s.Route_ID
GROUP BY r.Route_ID, r.Source, r.Destination, r.Distance
HAVING COUNT(s.Shipment_ID) >= 1
ORDER BY Shipment_Count DESC;

-- 2.5 Shipment Count by Status
SELECT Current_Status, COUNT(*) AS Shipment_Count
FROM SHIPMENT
GROUP BY Current_Status
ORDER BY Shipment_Count DESC;

-- ============================================================
-- 3. SUBQUERIES
-- ============================================================

-- 3.1 Customers with Most Shipments (Correlated Subquery)
SELECT c.Name, c.Email,
       (SELECT COUNT(*) FROM SHIPMENT s WHERE s.Customer_ID = c.Customer_ID) AS Shipment_Count
FROM CUSTOMER c
ORDER BY Shipment_Count DESC;

-- 3.2 Delayed Shipments (Subquery with Date Comparison)
SELECT s.Shipment_ID, c.Name, s.Current_Status, 
       s.Estimated_Delivery, SYSDATE - s.Estimated_Delivery AS Days_Delayed
FROM SHIPMENT s
JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
WHERE s.Current_Status NOT IN ('DELIVERED', 'CANCELLED')
  AND s.Estimated_Delivery < SYSDATE;

-- 3.3 Customers who have never shipped (NOT EXISTS)
SELECT c.Customer_ID, c.Name, c.Email
FROM CUSTOMER c
WHERE NOT EXISTS (SELECT 1 FROM SHIPMENT s WHERE s.Customer_ID = c.Customer_ID);

-- ============================================================
-- 4. CASE EXPRESSIONS
-- ============================================================

-- 4.1 Delivery Completion Statistics
SELECT 
  COUNT(*) AS Total_Shipments,
  SUM(CASE WHEN Current_Status = 'DELIVERED' THEN 1 ELSE 0 END) AS Delivered,
  SUM(CASE WHEN Current_Status = 'CANCELLED' THEN 1 ELSE 0 END) AS Cancelled,
  SUM(CASE WHEN Current_Status IN ('BOOKED','WAREHOUSE_RECEIVED','IN_TRANSIT','OUT_FOR_DELIVERY') THEN 1 ELSE 0 END) AS Active,
  ROUND(SUM(CASE WHEN Current_Status = 'DELIVERED' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS Delivery_Rate_Pct
FROM SHIPMENT;

-- ============================================================
-- 5. VIEWS DEMONSTRATION
-- ============================================================

-- 5.1 Customer Shipments View
SELECT * FROM VW_CUSTOMER_SHIPMENTS;

-- 5.2 Warehouse Utilization View  
SELECT * FROM VW_WAREHOUSE_UTILIZATION;

-- 5.3 Agent Performance View
SELECT * FROM VW_AGENT_PERFORMANCE;

-- 5.4 Revenue Report View
SELECT * FROM VW_REVENUE_REPORT;

-- 5.5 Pending Deliveries View
SELECT * FROM VW_PENDING_DELIVERIES;

-- ============================================================
-- 6. PL/SQL FUNCTION CALLS
-- ============================================================

-- 6.1 Get Customer Shipment Count
SELECT FN_GET_CUSTOMER_SHIPMENT_COUNT(1000) AS Shipment_Count FROM DUAL;

-- 6.2 Get Warehouse Utilization
SELECT FN_GET_WAREHOUSE_UTILIZATION(3000) AS Utilization_Pct FROM DUAL;

-- 6.3 Get Total Revenue
SELECT FN_GET_TOTAL_REVENUE() AS Total_Revenue FROM DUAL;

-- 6.4 Calculate Shipping Cost
SELECT FN_CALCULATE_SHIPPING_COST(5, 500, 'EXPRESS') AS Cost FROM DUAL;

-- 6.5 Validate Status Transition
SELECT FN_IS_VALID_STATUS_TRANSITION('BOOKED', 'WAREHOUSE_RECEIVED') AS Is_Valid FROM DUAL;
SELECT FN_IS_VALID_STATUS_TRANSITION('DELIVERED', 'BOOKED') AS Is_Valid FROM DUAL;

-- ============================================================
-- 7. PL/SQL PROCEDURE CALLS (Anonymous Block)
-- ============================================================

-- 7.1 Shipment Booking Transaction
DECLARE
  v_shipment_id NUMBER;
  v_parcel_id NUMBER;
  v_tracking_id NUMBER;
  v_payment_id NUMBER;
BEGIN
  PKG_SHIPMENT.BOOK_SHIPMENT(
    p_customer_id => 1000,
    p_warehouse_id => 3000,
    p_route_id => 5000,
    p_weight => 3.5,
    p_delivery_type => 'EXPRESS',
    p_parcel_type => 'SMALL_PACKAGE',
    p_length => 20,
    p_width => 15,
    p_height => 10,
    p_fragile => 'N',
    p_payment_method => 'UPI',
    p_shipment_id => v_shipment_id,
    p_parcel_id => v_parcel_id,
    p_tracking_id => v_tracking_id,
    p_payment_id => v_payment_id
  );
  DBMS_OUTPUT.PUT_LINE('Shipment: ' || v_shipment_id);
  DBMS_OUTPUT.PUT_LINE('Parcel: ' || v_parcel_id);
  DBMS_OUTPUT.PUT_LINE('Tracking: ' || v_tracking_id);
  DBMS_OUTPUT.PUT_LINE('Payment: ' || v_payment_id);
END;
/

-- Verify the booking
SELECT * FROM SHIPMENT WHERE Shipment_ID = (SELECT MAX(Shipment_ID) FROM SHIPMENT);
SELECT * FROM PARCEL WHERE Shipment_ID = (SELECT MAX(Shipment_ID) FROM SHIPMENT);
SELECT * FROM TRACKING WHERE Shipment_ID = (SELECT MAX(Shipment_ID) FROM SHIPMENT);
SELECT * FROM PAYMENT WHERE Shipment_ID = (SELECT MAX(Shipment_ID) FROM SHIPMENT);

-- ============================================================
-- 8. TRANSACTION DEMONSTRATION (SAVEPOINT / ROLLBACK)
-- ============================================================

-- Demonstrate SAVEPOINT and ROLLBACK
DECLARE
  v_ship_id NUMBER;
BEGIN
  SAVEPOINT sp_demo;
  
  -- Insert a test shipment
  INSERT INTO SHIPMENT (Shipment_ID, Customer_ID, Warehouse_ID, Route_ID, Weight, Delivery_Type, Current_Status)
  VALUES (SEQ_SHIPMENT.NEXTVAL, 1000, 3000, 5000, 2.0, 'STANDARD', 'BOOKED')
  RETURNING Shipment_ID INTO v_ship_id;
  
  DBMS_OUTPUT.PUT_LINE('Inserted Shipment: ' || v_ship_id);
  
  -- Verify it exists
  -- SELECT COUNT(*) FROM SHIPMENT WHERE Shipment_ID = v_ship_id; -- Would return 1
  
  -- Now ROLLBACK to savepoint
  ROLLBACK TO sp_demo;
  
  DBMS_OUTPUT.PUT_LINE('Rolled back. Shipment ' || v_ship_id || ' no longer exists.');
END;
/

-- ============================================================
-- 9. INDEXING AND EXPLAIN PLAN
-- ============================================================

-- 9.1 Explain Plan for indexed lookup
EXPLAIN PLAN FOR
SELECT * FROM CUSTOMER WHERE Email = 'customer.demo@example.com';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- 9.2 Explain Plan for shipment status query
EXPLAIN PLAN FOR
SELECT s.*, c.Name 
FROM SHIPMENT s JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
WHERE s.Current_Status = 'IN_TRANSIT';
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- 9.3 Explain Plan for tracking lookup
EXPLAIN PLAN FOR
SELECT * FROM TRACKING WHERE Shipment_ID = 10000 ORDER BY Update_Time DESC;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY);

-- ============================================================
-- 10. TRIGGER DEMONSTRATION
-- ============================================================

-- Update a shipment status to see TRG_SHIPMENT_STATUS_HISTORY fire
UPDATE SHIPMENT SET Current_Status = 'IN_TRANSIT' 
WHERE Shipment_ID = (SELECT MIN(Shipment_ID) FROM SHIPMENT WHERE Current_Status = 'WAREHOUSE_RECEIVED');
COMMIT;

-- Check the history
SELECT * FROM SHIPMENT_STATUS_HISTORY ORDER BY Changed_At DESC;

-- ============================================================
-- 11. CURSOR DEMONSTRATION (Anonymous Block)
-- ============================================================

DECLARE
  CURSOR c_warehouse_report IS
    SELECT w.Warehouse_Name, w.Capacity,
           COUNT(s.Shipment_ID) AS Active_Shipments
    FROM WAREHOUSE w
    LEFT JOIN SHIPMENT s ON w.Warehouse_ID = s.Warehouse_ID
      AND s.Current_Status NOT IN ('DELIVERED', 'CANCELLED')
    GROUP BY w.Warehouse_ID, w.Warehouse_Name, w.Capacity;
  
  v_name VARCHAR2(100);
  v_cap NUMBER;
  v_active NUMBER;
BEGIN
  DBMS_OUTPUT.PUT_LINE('=== WAREHOUSE UTILIZATION REPORT ===');
  DBMS_OUTPUT.PUT_LINE(RPAD('Warehouse', 30) || RPAD('Capacity', 12) || RPAD('Active', 10) || 'Util%');
  DBMS_OUTPUT.PUT_LINE(RPAD('-', 65, '-'));
  
  OPEN c_warehouse_report;
  LOOP
    FETCH c_warehouse_report INTO v_name, v_cap, v_active;
    EXIT WHEN c_warehouse_report%NOTFOUND;
    DBMS_OUTPUT.PUT_LINE(
      RPAD(v_name, 30) || 
      RPAD(v_cap, 12) || 
      RPAD(v_active, 10) || 
      ROUND(v_active/v_cap*100, 2) || '%'
    );
  END LOOP;
  CLOSE c_warehouse_report;
  
  DBMS_OUTPUT.PUT_LINE('=== END REPORT ===');
END;
/

-- ============================================================
-- 12. ACCOUNT DELETION DEMONSTRATION
-- ============================================================

-- First create a test customer with no shipments
INSERT INTO CUSTOMER VALUES (SEQ_CUSTOMER.NEXTVAL, 'Test Delete User', 'delete.test@example.com', '9999999999', 'Test Address');
INSERT INTO USER_ACCOUNT VALUES (SEQ_ACCOUNT.NEXTVAL, 'delete.test@example.com', '$2a$10$rOvHPxfzO2yLJbCQG8mSHu8gE9f6KoF1s5oCKqkWqFTGy5fQz1kGm', 'CUSTOMER', (SELECT Customer_ID FROM CUSTOMER WHERE Email = 'delete.test@example.com'), NULL, 'ACTIVE', SYSTIMESTAMP, NULL);
COMMIT;

-- Verify exists
SELECT * FROM CUSTOMER WHERE Email = 'delete.test@example.com';
SELECT * FROM USER_ACCOUNT WHERE Email = 'delete.test@example.com';

-- Delete the account
DECLARE
  v_account_id NUMBER;
BEGIN
  SELECT Account_ID INTO v_account_id FROM USER_ACCOUNT WHERE Email = 'delete.test@example.com';
  PKG_AUTH.DELETE_ACCOUNT(v_account_id);
END;
/

-- Verify deleted
SELECT * FROM CUSTOMER WHERE Email = 'delete.test@example.com';  -- Should return no rows
SELECT * FROM USER_ACCOUNT WHERE Email = 'delete.test@example.com';  -- Should return no rows

-- ============================================================
-- 13. EER SPECIALIZATION DEMONSTRATION
-- ============================================================

-- Show Employee supertype with all subtypes
SELECT e.Employee_ID, e.Name, e.Employee_Type,
       CASE 
         WHEN a.Employee_ID IS NOT NULL THEN 'Admin: ' || a.Role
         WHEN da.Employee_ID IS NOT NULL THEN 'Agent: License ' || da.License_No
         WHEN ws.Employee_ID IS NOT NULL THEN 'Staff: ' || ws.Shift || ' shift'
       END AS Subtype_Info
FROM EMPLOYEE e
LEFT JOIN ADMIN a ON e.Employee_ID = a.Employee_ID
LEFT JOIN DELIVERY_AGENT da ON e.Employee_ID = da.Employee_ID
LEFT JOIN WAREHOUSE_STAFF ws ON e.Employee_ID = ws.Employee_ID;

-- ============================================================
-- 14. AUDIT LOG REVIEW
-- ============================================================

SELECT * FROM AUDIT_LOG ORDER BY Action_Time DESC;
