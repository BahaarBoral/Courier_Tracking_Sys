-- ============================================================
-- LOGISTICS COURIER TRACKING SYSTEM
-- 09_triggers.sql
-- Database triggers for history tracking, audit logging,
-- and automated state updates.
-- ============================================================

-- 1. Trigger to automatically track status changes in the shipment lifecycle
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
        NULL,   -- Changed_By is NUMBER; 'SYSTEM' string would cause ORA-01722
        SYSTIMESTAMP,
        'Status updated automatically'
    );
END;
/

-- 2. Audit trigger for customer registration
CREATE OR REPLACE TRIGGER TRG_AUDIT_CUSTOMER_INSERT
AFTER INSERT ON CUSTOMER
FOR EACH ROW
BEGIN
    INSERT INTO AUDIT_LOG (
        Audit_ID, User_ID, Action, Table_Name, Record_ID, Action_Time, Description
    ) VALUES (
        SEQ_AUDIT.NEXTVAL,
        NULL,
        'INSERT',
        'CUSTOMER',
        :NEW.Customer_ID,
        SYSTIMESTAMP,
        'New customer registered: ' || :NEW.Email
    );
END;
/

-- 3. Audit trigger for shipment creation
CREATE OR REPLACE TRIGGER TRG_AUDIT_SHIPMENT_INSERT
AFTER INSERT ON SHIPMENT
FOR EACH ROW
BEGIN
    INSERT INTO AUDIT_LOG (
        Audit_ID, User_ID, Action, Table_Name, Record_ID, Action_Time, Description
    ) VALUES (
        SEQ_AUDIT.NEXTVAL,
        NULL,
        'INSERT',
        'SHIPMENT',
        :NEW.Shipment_ID,
        SYSTIMESTAMP,
        'New shipment booked for customer: ' || :NEW.Customer_ID
    );
END;
/

-- 4. Audit trigger for payment status changes
CREATE OR REPLACE TRIGGER TRG_AUDIT_PAYMENT_UPDATE
AFTER UPDATE OF Payment_Status ON PAYMENT
FOR EACH ROW
WHEN (OLD.Payment_Status != NEW.Payment_Status)
BEGIN
    INSERT INTO AUDIT_LOG (
        Audit_ID, User_ID, Action, Table_Name, Record_ID, Action_Time, Description
    ) VALUES (
        SEQ_AUDIT.NEXTVAL,
        NULL,
        'UPDATE',
        'PAYMENT',
        :NEW.Payment_ID,
        SYSTIMESTAMP,
        'Payment status changed from ' || :OLD.Payment_Status || ' to ' || :NEW.Payment_Status
    );
END;
/

-- 5. Trigger to automatically update vehicle availability upon delivery assignment
CREATE OR REPLACE TRIGGER TRG_VEHICLE_AVAILABILITY
AFTER INSERT ON DELIVERY
FOR EACH ROW
DECLARE
    v_vehicle_id NUMBER;
BEGIN
    -- Find the vehicle assigned to the delivery agent
    SELECT Vehicle_ID INTO v_vehicle_id 
    FROM DELIVERY_AGENT 
    WHERE Employee_ID = :NEW.Agent_ID;
    
    -- Update availability of that vehicle
    IF v_vehicle_id IS NOT NULL THEN
        UPDATE VEHICLE 
        SET Availability = 'IN_USE' 
        WHERE Vehicle_ID = v_vehicle_id;
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        -- Handle edge case if agent has no assigned vehicle
        NULL;
END;
/
