-- ====================================================================
-- Script Name: 05_views.sql
-- Description: Views for reporting and application simplification
-- RDBMS: Oracle Database
-- ====================================================================

-- 1. VW_CUSTOMER_SHIPMENTS
-- Purpose: Joins CUSTOMER, SHIPMENT, PARCEL, PAYMENT showing customer name, shipment details, parcel info, payment status.
CREATE OR REPLACE VIEW VW_CUSTOMER_SHIPMENTS AS
SELECT 
    c.Name AS Customer_Name,
    s.Shipment_ID,
    s.Booking_Date,
    s.Current_Status,
    p.Parcel_Type,
    p.Weight,
    pay.Payment_Status,
    pay.Amount
FROM CUSTOMER c
JOIN SHIPMENT s ON c.Customer_ID = s.Customer_ID
LEFT JOIN PARCEL p ON s.Shipment_ID = p.Shipment_ID
LEFT JOIN PAYMENT pay ON s.Shipment_ID = pay.Shipment_ID;

-- 2. VW_SHIPMENT_TRACKING
-- Purpose: Joins SHIPMENT, TRACKING, CUSTOMER showing full tracking info with customer name, ordered by update time.
CREATE OR REPLACE VIEW VW_SHIPMENT_TRACKING AS
SELECT 
    c.Name AS Customer_Name,
    s.Shipment_ID,
    s.Current_Status AS Shipment_Status,
    t.Tracking_ID,
    t.Current_Location,
    t.Status AS Tracking_Status,
    t.Update_Time,
    t.Remarks
FROM CUSTOMER c
JOIN SHIPMENT s ON c.Customer_ID = s.Customer_ID
JOIN TRACKING t ON s.Shipment_ID = t.Shipment_ID
ORDER BY t.Update_Time DESC;

-- 3. VW_PENDING_DELIVERIES
-- Purpose: Shows all deliveries not yet completed, joining DELIVERY, SHIPMENT, CUSTOMER, DELIVERY_AGENT(+EMPLOYEE name), with route info.
CREATE OR REPLACE VIEW VW_PENDING_DELIVERIES AS
SELECT 
    d.Delivery_ID,
    s.Shipment_ID,
    c.Name AS Customer_Name,
    c.Address AS Delivery_Address,
    e.Name AS Agent_Name,
    da.License_No,
    r.Source,
    r.Destination,
    d.Delivery_Status
FROM DELIVERY d
JOIN SHIPMENT s ON d.Shipment_ID = s.Shipment_ID
JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
JOIN DELIVERY_AGENT da ON d.Agent_ID = da.Employee_ID
JOIN EMPLOYEE e ON da.Employee_ID = e.Employee_ID
LEFT JOIN ROUTE r ON s.Route_ID = r.Route_ID
WHERE d.Delivery_Status NOT IN ('DELIVERED', 'FAILED');

-- 4. VW_WAREHOUSE_UTILIZATION
-- Purpose: For each warehouse, shows warehouse name, location, capacity, current shipments, available capacity, and utilization percentage.
CREATE OR REPLACE VIEW VW_WAREHOUSE_UTILIZATION AS
SELECT 
    w.Warehouse_ID,
    w.Warehouse_Name,
    w.Location,
    w.Capacity,
    COUNT(s.Shipment_ID) AS Current_Shipments,
    (w.Capacity - COUNT(s.Shipment_ID)) AS Available_Capacity,
    ROUND((COUNT(s.Shipment_ID) / NULLIF(w.Capacity, 0)) * 100, 2) AS Utilization_Pct
FROM WAREHOUSE w
LEFT JOIN SHIPMENT s ON w.Warehouse_ID = s.Warehouse_ID 
    AND s.Current_Status = 'WAREHOUSE_RECEIVED'
GROUP BY 
    w.Warehouse_ID,
    w.Warehouse_Name,
    w.Location,
    w.Capacity;

-- 5. VW_REVENUE_REPORT
-- Purpose: Shows monthly revenue from PAYMENT table.
CREATE OR REPLACE VIEW VW_REVENUE_REPORT AS
SELECT 
    EXTRACT(YEAR FROM Payment_Date) AS Rev_Year,
    EXTRACT(MONTH FROM Payment_Date) AS Rev_Month,
    SUM(Amount) AS Total_Revenue,
    COUNT(Payment_ID) AS Total_Payments
FROM PAYMENT
WHERE Payment_Status = 'PAID'
GROUP BY 
    EXTRACT(YEAR FROM Payment_Date),
    EXTRACT(MONTH FROM Payment_Date)
ORDER BY 
    Rev_Year DESC, 
    Rev_Month DESC;

-- 6. VW_AGENT_PERFORMANCE
-- Purpose: For each delivery agent, shows deliveries info and completion rate percentage.
CREATE OR REPLACE VIEW VW_AGENT_PERFORMANCE AS
SELECT 
    e.Name AS Agent_Name,
    da.License_No,
    COUNT(d.Delivery_ID) AS Total_Deliveries,
    SUM(CASE WHEN d.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) AS Completed_Deliveries,
    SUM(CASE WHEN d.Delivery_Status NOT IN ('DELIVERED', 'FAILED') THEN 1 ELSE 0 END) AS Pending_Deliveries,
    ROUND(
        (SUM(CASE WHEN d.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) / 
        NULLIF(COUNT(d.Delivery_ID), 0)) * 100, 2
    ) AS Completion_Rate_Pct
FROM DELIVERY_AGENT da
JOIN EMPLOYEE e ON da.Employee_ID = e.Employee_ID
LEFT JOIN DELIVERY d ON da.Employee_ID = d.Agent_ID
GROUP BY 
    e.Name, 
    da.License_No;

-- 7. VW_SHIPMENT_DETAILS
-- Purpose: Complete shipment view joining all main entities for an admin overview.
CREATE OR REPLACE VIEW VW_SHIPMENT_DETAILS AS
SELECT 
    s.Shipment_ID,
    c.Name AS Customer_Name,
    c.Phone AS Customer_Phone,
    p.Parcel_Type,
    w.Warehouse_Name,
    r.Source,
    r.Destination,
    pay.Payment_Status,
    d.Delivery_Status,
    s.Current_Status,
    s.Booking_Date
FROM SHIPMENT s
JOIN CUSTOMER c ON s.Customer_ID = c.Customer_ID
LEFT JOIN PARCEL p ON s.Shipment_ID = p.Shipment_ID
LEFT JOIN WAREHOUSE w ON s.Warehouse_ID = w.Warehouse_ID
LEFT JOIN ROUTE r ON s.Route_ID = r.Route_ID
LEFT JOIN PAYMENT pay ON s.Shipment_ID = pay.Shipment_ID
LEFT JOIN DELIVERY d ON s.Shipment_ID = d.Shipment_ID;

-- 8. VW_EMPLOYEE_DETAILS
-- Purpose: Joins EMPLOYEE with subtype tables to show full employee info.
CREATE OR REPLACE VIEW VW_EMPLOYEE_DETAILS AS
SELECT 
    e.Employee_ID,
    e.Name,
    e.Phone,
    e.Email,
    e.Joining_Date,
    e.Salary,
    e.Employee_Type,
    a.Role AS Admin_Role,
    ws.Warehouse_ID,
    ws.Shift AS Warehouse_Shift,
    da.License_No,
    da.Experience,
    da.Vehicle_ID
FROM EMPLOYEE e
LEFT JOIN ADMIN a ON e.Employee_ID = a.Employee_ID
LEFT JOIN WAREHOUSE_STAFF ws ON e.Employee_ID = ws.Employee_ID
LEFT JOIN DELIVERY_AGENT da ON e.Employee_ID = da.Employee_ID;
