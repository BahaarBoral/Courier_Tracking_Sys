-- ====================================================================
-- Script Name: 01_create_tables.sql
-- Description: Table creation script for Logistics Courier Tracking System
-- RDBMS: Oracle Database
-- ====================================================================

-- 1. CUSTOMER
CREATE TABLE CUSTOMER (
    Customer_ID NUMBER CONSTRAINT pk_customer PRIMARY KEY,
    Name VARCHAR2(100) CONSTRAINT nn_customer_name NOT NULL,
    Email VARCHAR2(100) CONSTRAINT uq_customer_email UNIQUE CONSTRAINT nn_customer_email NOT NULL,
    Phone VARCHAR2(20),
    Address VARCHAR2(500)
);

-- 2. EMPLOYEE (SUPERTYPE)
-- EER Specialization: This is the supertype for ADMIN, DELIVERY_AGENT, and WAREHOUSE_STAFF.
CREATE TABLE EMPLOYEE (
    Employee_ID NUMBER CONSTRAINT pk_employee PRIMARY KEY,
    Name VARCHAR2(100) CONSTRAINT nn_employee_name NOT NULL,
    Phone VARCHAR2(20),
    Email VARCHAR2(100) CONSTRAINT uq_employee_email UNIQUE CONSTRAINT nn_employee_email NOT NULL,
    Joining_Date DATE DEFAULT SYSDATE,
    Salary NUMBER(10,2),
    Employee_Type VARCHAR2(20) CONSTRAINT chk_employee_type CHECK (Employee_Type IN ('ADMIN','DELIVERY_AGENT','WAREHOUSE_STAFF'))
);

-- 3. ADMIN (SUBTYPE)
-- EER Specialization: Subtype of EMPLOYEE. 1:1 relationship with supertype.
CREATE TABLE ADMIN (
    Employee_ID NUMBER CONSTRAINT pk_admin PRIMARY KEY CONSTRAINT fk_admin_employee REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Role VARCHAR2(50) CONSTRAINT nn_admin_role NOT NULL
);

-- 4. WAREHOUSE
CREATE TABLE WAREHOUSE (
    Warehouse_ID NUMBER CONSTRAINT pk_warehouse PRIMARY KEY,
    Warehouse_Name VARCHAR2(100) CONSTRAINT nn_warehouse_name NOT NULL,
    Location VARCHAR2(200) CONSTRAINT nn_warehouse_location NOT NULL,
    Capacity NUMBER CONSTRAINT nn_warehouse_capacity NOT NULL,
    Contact_No VARCHAR2(20)
);

-- 5. WAREHOUSE_STAFF (SUBTYPE)
-- EER Specialization: Subtype of EMPLOYEE.
CREATE TABLE WAREHOUSE_STAFF (
    Employee_ID NUMBER CONSTRAINT pk_warehouse_staff PRIMARY KEY CONSTRAINT fk_whstaff_employee REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Warehouse_ID NUMBER CONSTRAINT fk_whstaff_warehouse REFERENCES WAREHOUSE(Warehouse_ID),
    Shift VARCHAR2(20) CONSTRAINT chk_whstaff_shift CHECK (Shift IN ('MORNING','AFTERNOON','NIGHT'))
);

-- 6. VEHICLE
CREATE TABLE VEHICLE (
    Vehicle_ID NUMBER CONSTRAINT pk_vehicle PRIMARY KEY,
    Vehicle_Number VARCHAR2(20) CONSTRAINT uq_vehicle_number UNIQUE CONSTRAINT nn_vehicle_number NOT NULL,
    Vehicle_Type VARCHAR2(30) CONSTRAINT chk_vehicle_type CHECK (Vehicle_Type IN ('BIKE','VAN','TRUCK','CARGO')),
    Capacity NUMBER(10,2),
    Availability VARCHAR2(10) DEFAULT 'AVAILABLE' CONSTRAINT chk_vehicle_availability CHECK (Availability IN ('AVAILABLE','IN_USE','MAINTENANCE'))
);

-- 7. DELIVERY_AGENT (SUBTYPE)
-- EER Specialization: Subtype of EMPLOYEE.
CREATE TABLE DELIVERY_AGENT (
    Employee_ID NUMBER CONSTRAINT pk_delivery_agent PRIMARY KEY CONSTRAINT fk_agent_employee REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Vehicle_ID NUMBER CONSTRAINT fk_agent_vehicle REFERENCES VEHICLE(Vehicle_ID),
    License_No VARCHAR2(30) CONSTRAINT uq_agent_license UNIQUE CONSTRAINT nn_agent_license NOT NULL,
    Experience NUMBER DEFAULT 0
);

-- 8. ROUTE
CREATE TABLE ROUTE (
    Route_ID NUMBER CONSTRAINT pk_route PRIMARY KEY,
    Source VARCHAR2(100) CONSTRAINT nn_route_source NOT NULL,
    Destination VARCHAR2(100) CONSTRAINT nn_route_destination NOT NULL,
    Distance NUMBER(10,2) CONSTRAINT nn_route_distance NOT NULL,
    Estimated_Time NUMBER(5,2)
);

-- 9. SHIPMENT
CREATE TABLE SHIPMENT (
    Shipment_ID NUMBER CONSTRAINT pk_shipment PRIMARY KEY,
    Customer_ID NUMBER CONSTRAINT nn_shipment_customer NOT NULL CONSTRAINT fk_shipment_customer REFERENCES CUSTOMER(Customer_ID) ON DELETE CASCADE,
    Warehouse_ID NUMBER CONSTRAINT fk_shipment_warehouse REFERENCES WAREHOUSE(Warehouse_ID),
    Route_ID NUMBER CONSTRAINT fk_shipment_route REFERENCES ROUTE(Route_ID),
    Agent_ID NUMBER CONSTRAINT fk_shipment_agent REFERENCES DELIVERY_AGENT(Employee_ID),
    Booking_Date TIMESTAMP DEFAULT SYSTIMESTAMP,
    Weight NUMBER(10,2),
    Delivery_Type VARCHAR2(20) CONSTRAINT chk_shipment_deltype CHECK (Delivery_Type IN ('STANDARD','EXPRESS','OVERNIGHT')),
    Estimated_Delivery DATE,
    Current_Status VARCHAR2(30) DEFAULT 'BOOKED' CONSTRAINT chk_shipment_status CHECK (Current_Status IN ('BOOKED','WAREHOUSE_RECEIVED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'))
);

-- 10. PARCEL
-- 1:1 Enforced by UNIQUE FK (Shipment_ID)
CREATE TABLE PARCEL (
    Parcel_ID NUMBER CONSTRAINT pk_parcel PRIMARY KEY,
    Shipment_ID NUMBER CONSTRAINT nn_parcel_shipment NOT NULL CONSTRAINT uq_parcel_shipment UNIQUE CONSTRAINT fk_parcel_shipment REFERENCES SHIPMENT(Shipment_ID) ON DELETE CASCADE,
    Parcel_Type VARCHAR2(30) CONSTRAINT chk_parcel_type CHECK (Parcel_Type IN ('DOCUMENT','SMALL_PACKAGE','MEDIUM_PACKAGE','LARGE_PACKAGE','FRAGILE','HEAVY')),
    Weight NUMBER(10,2),
    Length NUMBER(10,2),
    Height NUMBER(10,2),
    Width NUMBER(10,2),
    Fragile CHAR(1) DEFAULT 'N' CONSTRAINT chk_parcel_fragile CHECK (Fragile IN ('Y','N'))
);

-- 11. TRACKING
-- 1:M relationship for tracking history
CREATE TABLE TRACKING (
    Tracking_ID NUMBER CONSTRAINT pk_tracking PRIMARY KEY,
    Shipment_ID NUMBER CONSTRAINT nn_tracking_shipment NOT NULL CONSTRAINT fk_tracking_shipment REFERENCES SHIPMENT(Shipment_ID) ON DELETE CASCADE,
    Current_Location VARCHAR2(200),
    Status VARCHAR2(30) CONSTRAINT nn_tracking_status NOT NULL,
    Update_Time TIMESTAMP DEFAULT SYSTIMESTAMP,
    Remarks VARCHAR2(500)
);

-- 12. DELIVERY
-- 1:1 Enforced by UNIQUE FK (Shipment_ID)
CREATE TABLE DELIVERY (
    Delivery_ID NUMBER CONSTRAINT pk_delivery PRIMARY KEY,
    Shipment_ID NUMBER CONSTRAINT nn_delivery_shipment NOT NULL CONSTRAINT uq_delivery_shipment UNIQUE CONSTRAINT fk_delivery_shipment REFERENCES SHIPMENT(Shipment_ID) ON DELETE CASCADE,
    Agent_ID NUMBER CONSTRAINT nn_delivery_agent NOT NULL CONSTRAINT fk_delivery_agent REFERENCES DELIVERY_AGENT(Employee_ID),
    Delivery_Date DATE,
    Delivery_Status VARCHAR2(30) DEFAULT 'PENDING' CONSTRAINT chk_delivery_status CHECK (Delivery_Status IN ('PENDING','ASSIGNED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED')),
    Receiver_Name VARCHAR2(100),
    Receiver_Signature VARCHAR2(200)
);

-- 13. PAYMENT
-- 1:1 Enforced by UNIQUE FK (Shipment_ID)
CREATE TABLE PAYMENT (
    Payment_ID NUMBER CONSTRAINT pk_payment PRIMARY KEY,
    Shipment_ID NUMBER CONSTRAINT nn_payment_shipment NOT NULL CONSTRAINT uq_payment_shipment UNIQUE CONSTRAINT fk_payment_shipment REFERENCES SHIPMENT(Shipment_ID) ON DELETE CASCADE,
    Amount NUMBER(10,2) CONSTRAINT nn_payment_amount NOT NULL,
    Payment_Method VARCHAR2(30) CONSTRAINT chk_payment_method CHECK (Payment_Method IN ('CASH','CREDIT_CARD','DEBIT_CARD','UPI','NET_BANKING')),
    Payment_Status VARCHAR2(20) DEFAULT 'PENDING' CONSTRAINT chk_payment_status CHECK (Payment_Status IN ('PENDING','PAID','FAILED','REFUNDED')),
    Payment_Date TIMESTAMP
);

-- 14. USER_ACCOUNT
-- Implementation-level table for authentication
CREATE TABLE USER_ACCOUNT (
    Account_ID NUMBER CONSTRAINT pk_user_account PRIMARY KEY,
    Email VARCHAR2(100) CONSTRAINT uq_account_email UNIQUE CONSTRAINT nn_account_email NOT NULL,
    Password_Hash VARCHAR2(256) CONSTRAINT nn_account_password NOT NULL,
    Role VARCHAR2(20) CONSTRAINT nn_account_role NOT NULL CONSTRAINT chk_account_role CHECK (Role IN ('CUSTOMER','ADMIN','DELIVERY_AGENT','WAREHOUSE_STAFF')),
    Customer_ID NUMBER CONSTRAINT fk_account_customer REFERENCES CUSTOMER(Customer_ID) ON DELETE CASCADE,
    Employee_ID NUMBER CONSTRAINT fk_account_employee REFERENCES EMPLOYEE(Employee_ID) ON DELETE CASCADE,
    Account_Status VARCHAR2(20) DEFAULT 'ACTIVE' CONSTRAINT chk_account_status CHECK (Account_Status IN ('ACTIVE','INACTIVE','SUSPENDED')),
    Created_At TIMESTAMP DEFAULT SYSTIMESTAMP,
    Last_Login TIMESTAMP
);

-- 15. SHIPMENT_STATUS_HISTORY
-- Implementation-level table for tracking status changes via trigger
CREATE TABLE SHIPMENT_STATUS_HISTORY (
    History_ID NUMBER CONSTRAINT pk_history PRIMARY KEY,
    Shipment_ID NUMBER CONSTRAINT nn_history_shipment NOT NULL CONSTRAINT fk_history_shipment REFERENCES SHIPMENT(Shipment_ID) ON DELETE CASCADE,
    Old_Status VARCHAR2(30),
    New_Status VARCHAR2(30) CONSTRAINT nn_history_new_status NOT NULL,
    Changed_By NUMBER, -- Can be linked to User Account
    Changed_At TIMESTAMP DEFAULT SYSTIMESTAMP,
    Remarks VARCHAR2(500)
);

-- 16. AUDIT_LOG
-- Implementation-level table for auditing
CREATE TABLE AUDIT_LOG (
    Audit_ID NUMBER CONSTRAINT pk_audit PRIMARY KEY,
    User_ID NUMBER,
    Action VARCHAR2(50) CONSTRAINT nn_audit_action NOT NULL,
    Table_Name VARCHAR2(50),
    Record_ID NUMBER,
    Action_Time TIMESTAMP DEFAULT SYSTIMESTAMP,
    Description VARCHAR2(1000)
);
