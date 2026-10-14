-- ====================================================================
-- Script Name: 02_constraints.sql
-- Description: Additional constraints for the Logistics Courier Tracking System
-- RDBMS: Oracle Database
-- ====================================================================

/*
====================================================================
COMPREHENSIVE CONSTRAINT LISTING
====================================================================
TABLE: CUSTOMER
- pk_customer: Primary Key on Customer_ID
- nn_customer_name: NOT NULL on Name
- uq_customer_email: Unique on Email
- nn_customer_email: NOT NULL on Email

TABLE: EMPLOYEE
- pk_employee: Primary Key on Employee_ID
- nn_employee_name: NOT NULL on Name
- uq_employee_email: Unique on Email
- nn_employee_email: NOT NULL on Email
- chk_employee_type: CHECK IN ('ADMIN','DELIVERY_AGENT','WAREHOUSE_STAFF')

TABLE: ADMIN
- pk_admin: Primary Key on Employee_ID
- fk_admin_employee: Foreign Key to EMPLOYEE ON DELETE CASCADE
- nn_admin_role: NOT NULL on Role

TABLE: WAREHOUSE
- pk_warehouse: Primary Key on Warehouse_ID
- nn_warehouse_name: NOT NULL on Warehouse_Name
- nn_warehouse_location: NOT NULL on Location
- nn_warehouse_capacity: NOT NULL on Capacity

TABLE: WAREHOUSE_STAFF
- pk_warehouse_staff: Primary Key on Employee_ID
- fk_whstaff_employee: Foreign Key to EMPLOYEE ON DELETE CASCADE
- fk_whstaff_warehouse: Foreign Key to WAREHOUSE
- chk_whstaff_shift: CHECK IN ('MORNING','AFTERNOON','NIGHT')

TABLE: VEHICLE
- pk_vehicle: Primary Key on Vehicle_ID
- uq_vehicle_number: Unique on Vehicle_Number
- nn_vehicle_number: NOT NULL on Vehicle_Number
- chk_vehicle_type: CHECK IN ('BIKE','VAN','TRUCK','CARGO')
- chk_vehicle_availability: CHECK IN ('AVAILABLE','IN_USE','MAINTENANCE')

TABLE: DELIVERY_AGENT
- pk_delivery_agent: Primary Key on Employee_ID
- fk_agent_employee: Foreign Key to EMPLOYEE ON DELETE CASCADE
- fk_agent_vehicle: Foreign Key to VEHICLE
- uq_agent_license: Unique on License_No
- nn_agent_license: NOT NULL on License_No

TABLE: ROUTE
- pk_route: Primary Key on Route_ID
- nn_route_source: NOT NULL on Source
- nn_route_destination: NOT NULL on Destination
- nn_route_distance: NOT NULL on Distance

TABLE: SHIPMENT
- pk_shipment: Primary Key on Shipment_ID
- nn_shipment_customer: NOT NULL on Customer_ID
- fk_shipment_customer: Foreign Key to CUSTOMER ON DELETE CASCADE
- fk_shipment_warehouse: Foreign Key to WAREHOUSE
- fk_shipment_route: Foreign Key to ROUTE
- fk_shipment_agent: Foreign Key to DELIVERY_AGENT
- chk_shipment_deltype: CHECK IN ('STANDARD','EXPRESS','OVERNIGHT')
- chk_shipment_status: CHECK IN ('BOOKED','WAREHOUSE_RECEIVED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','CANCELLED')

TABLE: PARCEL
- pk_parcel: Primary Key on Parcel_ID
- nn_parcel_shipment: NOT NULL on Shipment_ID
- uq_parcel_shipment: Unique on Shipment_ID (Enforces 1:1)
- fk_parcel_shipment: Foreign Key to SHIPMENT ON DELETE CASCADE
- chk_parcel_type: CHECK IN ('DOCUMENT','SMALL_PACKAGE','MEDIUM_PACKAGE','LARGE_PACKAGE','FRAGILE','HEAVY')
- chk_parcel_fragile: CHECK IN ('Y','N')

TABLE: TRACKING
- pk_tracking: Primary Key on Tracking_ID
- nn_tracking_shipment: NOT NULL on Shipment_ID
- fk_tracking_shipment: Foreign Key to SHIPMENT ON DELETE CASCADE
- nn_tracking_status: NOT NULL on Status

TABLE: DELIVERY
- pk_delivery: Primary Key on Delivery_ID
- nn_delivery_shipment: NOT NULL on Shipment_ID
- uq_delivery_shipment: Unique on Shipment_ID (Enforces 1:1)
- fk_delivery_shipment: Foreign Key to SHIPMENT ON DELETE CASCADE
- nn_delivery_agent: NOT NULL on Agent_ID
- fk_delivery_agent: Foreign Key to DELIVERY_AGENT
- chk_delivery_status: CHECK IN ('PENDING','ASSIGNED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED')

TABLE: PAYMENT
- pk_payment: Primary Key on Payment_ID
- nn_payment_shipment: NOT NULL on Shipment_ID
- uq_payment_shipment: Unique on Shipment_ID (Enforces 1:1)
- fk_payment_shipment: Foreign Key to SHIPMENT ON DELETE CASCADE
- nn_payment_amount: NOT NULL on Amount
- chk_payment_method: CHECK IN ('CASH','CREDIT_CARD','DEBIT_CARD','UPI','NET_BANKING')
- chk_payment_status: CHECK IN ('PENDING','PAID','FAILED','REFUNDED')

TABLE: USER_ACCOUNT
- pk_user_account: Primary Key on Account_ID
- uq_account_email: Unique on Email
- nn_account_email: NOT NULL on Email
- nn_account_password: NOT NULL on Password_Hash
- nn_account_role: NOT NULL on Role
- chk_account_role: CHECK IN ('CUSTOMER','ADMIN','DELIVERY_AGENT','WAREHOUSE_STAFF')
- fk_account_customer: Foreign Key to CUSTOMER ON DELETE CASCADE
- fk_account_employee: Foreign Key to EMPLOYEE ON DELETE CASCADE
- chk_account_status: CHECK IN ('ACTIVE','INACTIVE','SUSPENDED')

TABLE: SHIPMENT_STATUS_HISTORY
- pk_history: Primary Key on History_ID
- nn_history_shipment: NOT NULL on Shipment_ID
- fk_history_shipment: Foreign Key to SHIPMENT ON DELETE CASCADE
- nn_history_new_status: NOT NULL on New_Status

TABLE: AUDIT_LOG
- pk_audit: Primary Key on Audit_ID
- nn_audit_action: NOT NULL on Action
====================================================================
*/

-- Add a CHECK constraint ensuring USER_ACCOUNT has either Customer_ID or Employee_ID but not both (based on role)
ALTER TABLE USER_ACCOUNT
ADD CONSTRAINT chk_user_account_identity 
CHECK (
    (Role = 'CUSTOMER' AND Customer_ID IS NOT NULL AND Employee_ID IS NULL) 
    OR 
    (Role IN ('ADMIN','DELIVERY_AGENT','WAREHOUSE_STAFF') AND Employee_ID IS NOT NULL AND Customer_ID IS NULL)
);
