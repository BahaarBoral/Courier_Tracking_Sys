-- ==========================================
-- PKG_AUTH
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_AUTH IS
    e_duplicate_email EXCEPTION;
    e_has_active_shipments EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_duplicate_email, -1); -- DUP_VAL_ON_INDEX
    
    PROCEDURE REGISTER_CUSTOMER(p_name VARCHAR2, p_email VARCHAR2, p_phone VARCHAR2, p_address VARCHAR2, p_password VARCHAR2, p_account_id OUT NUMBER, p_customer_id OUT NUMBER);
    FUNCTION AUTHENTICATE_USER(p_email VARCHAR2, p_password VARCHAR2) RETURN SYS_REFCURSOR;
    PROCEDURE CHANGE_PASSWORD(p_account_id NUMBER, p_old_password VARCHAR2, p_new_password VARCHAR2);
    PROCEDURE DELETE_ACCOUNT(p_account_id NUMBER);
    FUNCTION GET_USER_ROLE(p_account_id NUMBER) RETURN VARCHAR2;
END PKG_AUTH;
/

CREATE OR REPLACE PACKAGE BODY PKG_AUTH IS
    PROCEDURE REGISTER_CUSTOMER(p_name VARCHAR2, p_email VARCHAR2, p_phone VARCHAR2, p_address VARCHAR2, p_password VARCHAR2, p_account_id OUT NUMBER, p_customer_id OUT NUMBER) IS
        v_count NUMBER;
    BEGIN
        SAVEPOINT sp_register;
        
        SELECT COUNT(*) INTO v_count FROM USER_ACCOUNT WHERE Email = p_email;
        IF v_count > 0 THEN
            RAISE e_duplicate_email;
        END IF;
        
        p_customer_id := SEQ_CUSTOMER.NEXTVAL;
        INSERT INTO CUSTOMER (Customer_ID, Name, Email, Phone, Address)
        VALUES (p_customer_id, p_name, p_email, p_phone, p_address);
        
        p_account_id := SEQ_ACCOUNT.NEXTVAL;
        INSERT INTO USER_ACCOUNT (Account_ID, Email, Password_Hash, Role, Customer_ID, Account_Status, Created_At)
        VALUES (p_account_id, p_email, p_password, 'CUSTOMER', p_customer_id, 'ACTIVE', SYSDATE);
        
        SP_LOG_AUDIT(p_account_id, 'REGISTER', 'USER_ACCOUNT', p_account_id, 'Customer registered');
        COMMIT;
    EXCEPTION
        WHEN e_duplicate_email THEN
            ROLLBACK TO sp_register;
            RAISE_APPLICATION_ERROR(-20001, 'Email already exists.');
        WHEN OTHERS THEN
            ROLLBACK TO sp_register;
            RAISE;
    END REGISTER_CUSTOMER;
    
    FUNCTION AUTHENTICATE_USER(p_email VARCHAR2, p_password VARCHAR2) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT u.Account_ID, u.Email, u.Role, u.Password_Hash, u.Customer_ID, u.Employee_ID, 
                   COALESCE(c.Name, e.Name) AS Name, u.Account_Status
            FROM USER_ACCOUNT u
            LEFT JOIN CUSTOMER c ON u.Customer_ID = c.Customer_ID
            LEFT JOIN EMPLOYEE e ON u.Employee_ID = e.Employee_ID
            WHERE u.Email = p_email AND u.Account_Status = 'ACTIVE';
        RETURN v_cursor;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN NULL;
        WHEN OTHERS THEN
            RAISE;
    END AUTHENTICATE_USER;
    
    PROCEDURE CHANGE_PASSWORD(p_account_id NUMBER, p_old_password VARCHAR2, p_new_password VARCHAR2) IS
        v_current_hash VARCHAR2(255);
    BEGIN
        SELECT Password_Hash INTO v_current_hash FROM USER_ACCOUNT WHERE Account_ID = p_account_id;
        -- Assume app layer already validated, just updating
        UPDATE USER_ACCOUNT SET Password_Hash = p_new_password WHERE Account_ID = p_account_id;
        SP_LOG_AUDIT(p_account_id, 'UPDATE_PASSWORD', 'USER_ACCOUNT', p_account_id, 'Password changed');
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END CHANGE_PASSWORD;
    
    PROCEDURE DELETE_ACCOUNT(p_account_id NUMBER) IS
        v_cust_id NUMBER;
        v_active_shipments NUMBER;
    BEGIN
        SELECT Customer_ID INTO v_cust_id FROM USER_ACCOUNT WHERE Account_ID = p_account_id;
        
        IF v_cust_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_active_shipments FROM SHIPMENT 
            WHERE Customer_ID = v_cust_id AND Current_Status NOT IN ('DELIVERED', 'CANCELLED');
            
            IF v_active_shipments > 0 THEN
                RAISE e_has_active_shipments;
            END IF;
        END IF;
        
        DELETE FROM USER_ACCOUNT WHERE Account_ID = p_account_id;
        IF v_cust_id IS NOT NULL THEN
            DELETE FROM CUSTOMER WHERE Customer_ID = v_cust_id;
        END IF;
        
        SP_LOG_AUDIT(p_account_id, 'DELETE', 'USER_ACCOUNT', p_account_id, 'Account deleted');
        COMMIT;
    EXCEPTION
        WHEN e_has_active_shipments THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20002, 'Cannot delete account with active shipments.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END DELETE_ACCOUNT;
    
    FUNCTION GET_USER_ROLE(p_account_id NUMBER) RETURN VARCHAR2 IS
        v_role VARCHAR2(50);
    BEGIN
        SELECT Role INTO v_role FROM USER_ACCOUNT WHERE Account_ID = p_account_id;
        RETURN v_role;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN NULL;
        WHEN OTHERS THEN
            RAISE;
    END GET_USER_ROLE;
END PKG_AUTH;
/

-- ==========================================
-- PKG_CUSTOMER
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_CUSTOMER IS
    FUNCTION GET_CUSTOMER_PROFILE(p_customer_id NUMBER) RETURN SYS_REFCURSOR;
    PROCEDURE UPDATE_CUSTOMER(p_customer_id NUMBER, p_name VARCHAR2, p_phone VARCHAR2, p_address VARCHAR2);
    FUNCTION GET_ALL_CUSTOMERS RETURN SYS_REFCURSOR;
END PKG_CUSTOMER;
/

CREATE OR REPLACE PACKAGE BODY PKG_CUSTOMER IS
    FUNCTION GET_CUSTOMER_PROFILE(p_customer_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM CUSTOMER WHERE Customer_ID = p_customer_id;
        RETURN v_cursor;
    END GET_CUSTOMER_PROFILE;
    
    PROCEDURE UPDATE_CUSTOMER(p_customer_id NUMBER, p_name VARCHAR2, p_phone VARCHAR2, p_address VARCHAR2) IS
    BEGIN
        UPDATE CUSTOMER SET Name = p_name, Phone = p_phone, Address = p_address WHERE Customer_ID = p_customer_id;
        SP_LOG_AUDIT(p_customer_id, 'UPDATE', 'CUSTOMER', p_customer_id, 'Customer profile updated');
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END UPDATE_CUSTOMER;
    
    FUNCTION GET_ALL_CUSTOMERS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM CUSTOMER;
        RETURN v_cursor;
    END GET_ALL_CUSTOMERS;
END PKG_CUSTOMER;
/

-- ==========================================
-- PKG_SHIPMENT
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_SHIPMENT IS
    e_invalid_status EXCEPTION;
    e_insufficient_capacity EXCEPTION;
    
    PROCEDURE BOOK_SHIPMENT(
        p_customer_id NUMBER, p_warehouse_id NUMBER, p_route_id NUMBER,
        p_weight NUMBER, p_delivery_type VARCHAR2,
        p_parcel_type VARCHAR2, p_length NUMBER, p_width NUMBER, p_height NUMBER, p_fragile CHAR,
        p_payment_method VARCHAR2,
        p_shipment_id OUT NUMBER, p_parcel_id OUT NUMBER, p_tracking_id OUT NUMBER, p_payment_id OUT NUMBER
    );
    FUNCTION GET_SHIPMENT(p_shipment_id NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION GET_CUSTOMER_SHIPMENTS(p_customer_id NUMBER) RETURN SYS_REFCURSOR;
    PROCEDURE UPDATE_SHIPMENT_STATUS(p_shipment_id NUMBER, p_new_status VARCHAR2, p_location VARCHAR2, p_remarks VARCHAR2, p_changed_by NUMBER);
    PROCEDURE CANCEL_SHIPMENT(p_shipment_id NUMBER, p_user_id NUMBER);
    FUNCTION GET_ALL_SHIPMENTS RETURN SYS_REFCURSOR;
    FUNCTION GET_SHIPMENTS_BY_STATUS(p_status VARCHAR2) RETURN SYS_REFCURSOR;
    FUNCTION GET_SHIPMENTS_BY_WAREHOUSE(p_warehouse_id NUMBER) RETURN SYS_REFCURSOR;
END PKG_SHIPMENT;
/

CREATE OR REPLACE PACKAGE BODY PKG_SHIPMENT IS
    PROCEDURE BOOK_SHIPMENT(
        p_customer_id NUMBER, p_warehouse_id NUMBER, p_route_id NUMBER,
        p_weight NUMBER, p_delivery_type VARCHAR2,
        p_parcel_type VARCHAR2, p_length NUMBER, p_width NUMBER, p_height NUMBER, p_fragile CHAR,
        p_payment_method VARCHAR2,
        p_shipment_id OUT NUMBER, p_parcel_id OUT NUMBER, p_tracking_id OUT NUMBER, p_payment_id OUT NUMBER
    ) IS
        v_warehouse_capacity NUMBER;
        v_current_utilization NUMBER;
        v_route_distance NUMBER;
        v_shipping_cost NUMBER;
        v_est_delivery DATE;
    BEGIN
        SAVEPOINT sp_book_shipment;
        
        -- Row lock on WAREHOUSE to prevent capacity race conditions
        SELECT Capacity INTO v_warehouse_capacity FROM WAREHOUSE WHERE Warehouse_ID = p_warehouse_id FOR UPDATE;
        
        v_current_utilization := FN_GET_WAREHOUSE_UTILIZATION(p_warehouse_id);
        IF v_current_utilization >= 100 THEN
            RAISE e_insufficient_capacity;
        END IF;
        
        SELECT Distance INTO v_route_distance FROM ROUTE WHERE Route_ID = p_route_id;
        
        v_shipping_cost := FN_CALCULATE_SHIPPING_COST(p_weight, v_route_distance, p_delivery_type);
        v_est_delivery := FN_CALCULATE_ESTIMATED_DELIVERY(p_delivery_type, v_route_distance);
        
        p_shipment_id := SEQ_SHIPMENT.NEXTVAL;
        INSERT INTO SHIPMENT (Shipment_ID, Customer_ID, Warehouse_ID, Route_ID, Booking_Date, Weight, Delivery_Type, Estimated_Delivery, Current_Status)
        VALUES (p_shipment_id, p_customer_id, p_warehouse_id, p_route_id, SYSDATE, p_weight, p_delivery_type, v_est_delivery, 'BOOKED');
        
        p_parcel_id := SEQ_PARCEL.NEXTVAL;
        INSERT INTO PARCEL (Parcel_ID, Shipment_ID, Parcel_Type, Weight, Length, Height, Width, Fragile)
        VALUES (p_parcel_id, p_shipment_id, p_parcel_type, p_weight, p_length, p_height, p_width, p_fragile);
        
        p_tracking_id := SEQ_TRACKING.NEXTVAL;
        INSERT INTO TRACKING (Tracking_ID, Shipment_ID, Current_Location, Status, Update_Time, Remarks)
        VALUES (p_tracking_id, p_shipment_id, 'Source', 'BOOKED', SYSDATE, 'Shipment booked');
        
        p_payment_id := SEQ_PAYMENT.NEXTVAL;
        INSERT INTO PAYMENT (Payment_ID, Shipment_ID, Amount, Payment_Method, Payment_Status, Payment_Date)
        VALUES (p_payment_id, p_shipment_id, v_shipping_cost, p_payment_method, 'PENDING', NULL);
        
        SP_LOG_AUDIT(p_customer_id, 'INSERT', 'SHIPMENT', p_shipment_id, 'Booked shipment');
        COMMIT;
    EXCEPTION
        WHEN e_insufficient_capacity THEN
            ROLLBACK TO sp_book_shipment;
            RAISE_APPLICATION_ERROR(-20003, 'Warehouse is at full capacity.');
        WHEN OTHERS THEN
            ROLLBACK TO sp_book_shipment;
            RAISE;
    END BOOK_SHIPMENT;
    
    FUNCTION GET_SHIPMENT(p_shipment_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM SHIPMENT WHERE Shipment_ID = p_shipment_id;
        RETURN v_cursor;
    END GET_SHIPMENT;
    
    FUNCTION GET_CUSTOMER_SHIPMENTS(p_customer_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM SHIPMENT WHERE Customer_ID = p_customer_id;
        RETURN v_cursor;
    END GET_CUSTOMER_SHIPMENTS;
    
    PROCEDURE UPDATE_SHIPMENT_STATUS(p_shipment_id NUMBER, p_new_status VARCHAR2, p_location VARCHAR2, p_remarks VARCHAR2, p_changed_by NUMBER) IS
        v_old_status VARCHAR2(50);
        v_valid_transition NUMBER;
    BEGIN
        SELECT Current_Status INTO v_old_status FROM SHIPMENT WHERE Shipment_ID = p_shipment_id;
        
        v_valid_transition := FN_IS_VALID_STATUS_TRANSITION(v_old_status, p_new_status);
        IF v_valid_transition = 0 THEN
            RAISE e_invalid_status;
        END IF;
        
        UPDATE SHIPMENT SET Current_Status = p_new_status WHERE Shipment_ID = p_shipment_id;
        
        INSERT INTO TRACKING (Tracking_ID, Shipment_ID, Current_Location, Status, Update_Time, Remarks)
        VALUES (SEQ_TRACKING.NEXTVAL, p_shipment_id, p_location, p_new_status, SYSDATE, p_remarks);
        
        INSERT INTO SHIPMENT_STATUS_HISTORY (History_ID, Shipment_ID, Old_Status, New_Status, Changed_By, Changed_At, Remarks)
        VALUES (SEQ_HISTORY.NEXTVAL, p_shipment_id, v_old_status, p_new_status, p_changed_by, SYSDATE, p_remarks);
        
        SP_LOG_AUDIT(p_changed_by, 'UPDATE', 'SHIPMENT', p_shipment_id, 'Status updated to ' || p_new_status);
        COMMIT;
    EXCEPTION
        WHEN e_invalid_status THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20004, 'Invalid shipment status transition.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END UPDATE_SHIPMENT_STATUS;
    
    PROCEDURE CANCEL_SHIPMENT(p_shipment_id NUMBER, p_user_id NUMBER) IS
        v_status VARCHAR2(50);
        v_payment_status VARCHAR2(50);
    BEGIN
        SELECT Current_Status INTO v_status FROM SHIPMENT WHERE Shipment_ID = p_shipment_id;
        IF v_status = 'DELIVERED' THEN
            RAISE_APPLICATION_ERROR(-20005, 'Cannot cancel delivered shipment.');
        END IF;
        
        UPDATE SHIPMENT SET Current_Status = 'CANCELLED' WHERE Shipment_ID = p_shipment_id;
        
        SELECT Payment_Status INTO v_payment_status FROM PAYMENT WHERE Shipment_ID = p_shipment_id;
        IF v_payment_status = 'PAID' THEN
            UPDATE PAYMENT SET Payment_Status = 'REFUNDED' WHERE Shipment_ID = p_shipment_id;
        END IF;
        
        INSERT INTO TRACKING (Tracking_ID, Shipment_ID, Current_Location, Status, Update_Time, Remarks)
        VALUES (SEQ_TRACKING.NEXTVAL, p_shipment_id, 'Source', 'CANCELLED', SYSDATE, 'Shipment cancelled by user');
        
        SP_LOG_AUDIT(p_user_id, 'UPDATE', 'SHIPMENT', p_shipment_id, 'Cancelled shipment');
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END CANCEL_SHIPMENT;
    
    FUNCTION GET_ALL_SHIPMENTS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM SHIPMENT;
        RETURN v_cursor;
    END GET_ALL_SHIPMENTS;
    
    FUNCTION GET_SHIPMENTS_BY_STATUS(p_status VARCHAR2) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM SHIPMENT WHERE Current_Status = p_status;
        RETURN v_cursor;
    END GET_SHIPMENTS_BY_STATUS;
    
    FUNCTION GET_SHIPMENTS_BY_WAREHOUSE(p_warehouse_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM SHIPMENT WHERE Warehouse_ID = p_warehouse_id;
        RETURN v_cursor;
    END GET_SHIPMENTS_BY_WAREHOUSE;
END PKG_SHIPMENT;
/

-- ==========================================
-- PKG_TRACKING
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_TRACKING IS
    FUNCTION GET_TRACKING_HISTORY(p_shipment_id NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION GET_LATEST_TRACKING(p_shipment_id NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION GET_STATUS_HISTORY(p_shipment_id NUMBER) RETURN SYS_REFCURSOR;
END PKG_TRACKING;
/

CREATE OR REPLACE PACKAGE BODY PKG_TRACKING IS
    FUNCTION GET_TRACKING_HISTORY(p_shipment_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM TRACKING WHERE Shipment_ID = p_shipment_id ORDER BY Update_Time DESC;
        RETURN v_cursor;
    END GET_TRACKING_HISTORY;
    
    FUNCTION GET_LATEST_TRACKING(p_shipment_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT * FROM TRACKING WHERE Shipment_ID = p_shipment_id 
            ORDER BY Update_Time DESC FETCH FIRST 1 ROWS ONLY;
        RETURN v_cursor;
    END GET_LATEST_TRACKING;
    
    FUNCTION GET_STATUS_HISTORY(p_shipment_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM SHIPMENT_STATUS_HISTORY WHERE Shipment_ID = p_shipment_id ORDER BY Changed_At DESC;
        RETURN v_cursor;
    END GET_STATUS_HISTORY;
END PKG_TRACKING;
/

-- ==========================================
-- PKG_PAYMENT
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_PAYMENT IS
    FUNCTION GET_PAYMENT_BY_SHIPMENT(p_shipment_id NUMBER) RETURN SYS_REFCURSOR;
    PROCEDURE PROCESS_PAYMENT(p_payment_id NUMBER, p_user_id NUMBER);
    PROCEDURE UPDATE_PAYMENT_STATUS(p_payment_id NUMBER, p_status VARCHAR2, p_user_id NUMBER);
    FUNCTION GET_CUSTOMER_PAYMENTS(p_customer_id NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION GET_ALL_PAYMENTS RETURN SYS_REFCURSOR;
END PKG_PAYMENT;
/

CREATE OR REPLACE PACKAGE BODY PKG_PAYMENT IS
    FUNCTION GET_PAYMENT_BY_SHIPMENT(p_shipment_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM PAYMENT WHERE Shipment_ID = p_shipment_id;
        RETURN v_cursor;
    END GET_PAYMENT_BY_SHIPMENT;
    
    PROCEDURE PROCESS_PAYMENT(p_payment_id NUMBER, p_user_id NUMBER) IS
    BEGIN
        UPDATE PAYMENT SET Payment_Status = 'PAID', Payment_Date = SYSDATE WHERE Payment_ID = p_payment_id;
        SP_LOG_AUDIT(p_user_id, 'UPDATE', 'PAYMENT', p_payment_id, 'Payment processed');
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END PROCESS_PAYMENT;
    
    PROCEDURE UPDATE_PAYMENT_STATUS(p_payment_id NUMBER, p_status VARCHAR2, p_user_id NUMBER) IS
    BEGIN
        UPDATE PAYMENT SET Payment_Status = p_status WHERE Payment_ID = p_payment_id;
        SP_LOG_AUDIT(p_user_id, 'UPDATE', 'PAYMENT', p_payment_id, 'Payment status updated to ' || p_status);
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END UPDATE_PAYMENT_STATUS;
    
    FUNCTION GET_CUSTOMER_PAYMENTS(p_customer_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT P.* FROM PAYMENT P
            JOIN SHIPMENT S ON P.Shipment_ID = S.Shipment_ID
            WHERE S.Customer_ID = p_customer_id;
        RETURN v_cursor;
    END GET_CUSTOMER_PAYMENTS;
    
    FUNCTION GET_ALL_PAYMENTS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM PAYMENT;
        RETURN v_cursor;
    END GET_ALL_PAYMENTS;
END PKG_PAYMENT;
/

-- ==========================================
-- PKG_DELIVERY
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_DELIVERY IS
    FUNCTION GET_AGENT_DELIVERIES(p_agent_id NUMBER) RETURN SYS_REFCURSOR;
    PROCEDURE ASSIGN_DELIVERY(p_shipment_id NUMBER, p_agent_id NUMBER, p_user_id NUMBER, p_delivery_id OUT NUMBER);
    PROCEDURE UPDATE_DELIVERY_STATUS(p_delivery_id NUMBER, p_status VARCHAR2, p_location VARCHAR2, p_user_id NUMBER);
    PROCEDURE MARK_DELIVERED(p_delivery_id NUMBER, p_receiver_name VARCHAR2, p_receiver_signature VARCHAR2, p_user_id NUMBER);
    FUNCTION GET_DELIVERY_BY_SHIPMENT(p_shipment_id NUMBER) RETURN SYS_REFCURSOR;
    FUNCTION GET_ALL_DELIVERIES RETURN SYS_REFCURSOR;
END PKG_DELIVERY;
/

CREATE OR REPLACE PACKAGE BODY PKG_DELIVERY IS
    FUNCTION GET_AGENT_DELIVERIES(p_agent_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM DELIVERY WHERE Agent_ID = p_agent_id;
        RETURN v_cursor;
    END GET_AGENT_DELIVERIES;
    
    PROCEDURE ASSIGN_DELIVERY(p_shipment_id NUMBER, p_agent_id NUMBER, p_user_id NUMBER, p_delivery_id OUT NUMBER) IS
    BEGIN
        p_delivery_id := SEQ_DELIVERY.NEXTVAL;
        INSERT INTO DELIVERY (Delivery_ID, Shipment_ID, Agent_ID, Delivery_Status)
        VALUES (p_delivery_id, p_shipment_id, p_agent_id, 'ASSIGNED');
        
        UPDATE SHIPMENT SET Agent_ID = p_agent_id WHERE Shipment_ID = p_shipment_id;
        
        SP_LOG_AUDIT(p_user_id, 'INSERT', 'DELIVERY', p_delivery_id, 'Delivery assigned to agent ' || p_agent_id);
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END ASSIGN_DELIVERY;
    
    PROCEDURE UPDATE_DELIVERY_STATUS(p_delivery_id NUMBER, p_status VARCHAR2, p_location VARCHAR2, p_user_id NUMBER) IS
        v_shipment_id NUMBER;
    BEGIN
        UPDATE DELIVERY SET Delivery_Status = p_status WHERE Delivery_ID = p_delivery_id RETURNING Shipment_ID INTO v_shipment_id;
        
        IF p_status = 'OUT_FOR_DELIVERY' THEN
            UPDATE SHIPMENT SET Current_Status = 'OUT_FOR_DELIVERY' WHERE Shipment_ID = v_shipment_id;
            INSERT INTO TRACKING (Tracking_ID, Shipment_ID, Current_Location, Status, Update_Time, Remarks)
            VALUES (SEQ_TRACKING.NEXTVAL, v_shipment_id, p_location, 'OUT_FOR_DELIVERY', SYSDATE, 'Out for delivery');
        END IF;
        
        SP_LOG_AUDIT(p_user_id, 'UPDATE', 'DELIVERY', p_delivery_id, 'Status updated to ' || p_status);
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END UPDATE_DELIVERY_STATUS;
    
    PROCEDURE MARK_DELIVERED(p_delivery_id NUMBER, p_receiver_name VARCHAR2, p_receiver_signature VARCHAR2, p_user_id NUMBER) IS
        v_shipment_id NUMBER;
        v_agent_id NUMBER;
        v_vehicle_id NUMBER;
    BEGIN
        UPDATE DELIVERY 
        SET Delivery_Status = 'DELIVERED', Receiver_Name = p_receiver_name, Receiver_Signature = p_receiver_signature, Delivery_Date = SYSDATE 
        WHERE Delivery_ID = p_delivery_id RETURNING Shipment_ID, Agent_ID INTO v_shipment_id, v_agent_id;
        
        UPDATE SHIPMENT SET Current_Status = 'DELIVERED' WHERE Shipment_ID = v_shipment_id;
        
        INSERT INTO TRACKING (Tracking_ID, Shipment_ID, Current_Location, Status, Update_Time, Remarks)
        VALUES (SEQ_TRACKING.NEXTVAL, v_shipment_id, 'Destination', 'DELIVERED', SYSDATE, 'Delivered to ' || p_receiver_name);
        
        BEGIN
            SELECT Vehicle_ID INTO v_vehicle_id FROM DELIVERY_AGENT WHERE Employee_ID = v_agent_id;
            UPDATE VEHICLE SET Availability = 'AVAILABLE' WHERE Vehicle_ID = v_vehicle_id;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN NULL;
        END;
        
        SP_LOG_AUDIT(p_user_id, 'UPDATE', 'DELIVERY', p_delivery_id, 'Marked as delivered');
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END MARK_DELIVERED;
    
    FUNCTION GET_DELIVERY_BY_SHIPMENT(p_shipment_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM DELIVERY WHERE Shipment_ID = p_shipment_id;
        RETURN v_cursor;
    END GET_DELIVERY_BY_SHIPMENT;
    
    FUNCTION GET_ALL_DELIVERIES RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM DELIVERY;
        RETURN v_cursor;
    END GET_ALL_DELIVERIES;
END PKG_DELIVERY;
/

-- ==========================================
-- PKG_WAREHOUSE
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_WAREHOUSE IS
    e_insufficient_capacity EXCEPTION;
    
    FUNCTION GET_ALL_WAREHOUSES RETURN SYS_REFCURSOR;
    FUNCTION GET_WAREHOUSE_SHIPMENTS(p_warehouse_id NUMBER) RETURN SYS_REFCURSOR;
    PROCEDURE RECEIVE_SHIPMENT(p_shipment_id NUMBER, p_warehouse_id NUMBER, p_user_id NUMBER);
    PROCEDURE DISPATCH_SHIPMENT(p_shipment_id NUMBER, p_user_id NUMBER);
    FUNCTION GET_WAREHOUSE_CAPACITY(p_warehouse_id NUMBER) RETURN SYS_REFCURSOR;
    PROCEDURE ADD_WAREHOUSE(p_name VARCHAR2, p_location VARCHAR2, p_capacity NUMBER, p_contact VARCHAR2, p_warehouse_id OUT NUMBER);
    PROCEDURE UPDATE_WAREHOUSE(p_warehouse_id NUMBER, p_name VARCHAR2, p_location VARCHAR2, p_capacity NUMBER, p_contact VARCHAR2);
END PKG_WAREHOUSE;
/

CREATE OR REPLACE PACKAGE BODY PKG_WAREHOUSE IS
    FUNCTION GET_ALL_WAREHOUSES RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM WAREHOUSE;
        RETURN v_cursor;
    END GET_ALL_WAREHOUSES;
    
    FUNCTION GET_WAREHOUSE_SHIPMENTS(p_warehouse_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM SHIPMENT WHERE Warehouse_ID = p_warehouse_id;
        RETURN v_cursor;
    END GET_WAREHOUSE_SHIPMENTS;
    
    PROCEDURE RECEIVE_SHIPMENT(p_shipment_id NUMBER, p_warehouse_id NUMBER, p_user_id NUMBER) IS
        v_capacity NUMBER;
        v_utilization NUMBER;
    BEGIN
        SELECT Capacity INTO v_capacity FROM WAREHOUSE WHERE Warehouse_ID = p_warehouse_id FOR UPDATE;
        v_utilization := FN_GET_WAREHOUSE_UTILIZATION(p_warehouse_id);
        
        IF v_utilization >= 100 THEN
            RAISE e_insufficient_capacity;
        END IF;
        
        UPDATE SHIPMENT SET Current_Status = 'WAREHOUSE_RECEIVED', Warehouse_ID = p_warehouse_id WHERE Shipment_ID = p_shipment_id;
        
        INSERT INTO TRACKING (Tracking_ID, Shipment_ID, Current_Location, Status, Update_Time, Remarks)
        VALUES (SEQ_TRACKING.NEXTVAL, p_shipment_id, 'Warehouse ' || p_warehouse_id, 'WAREHOUSE_RECEIVED', SYSDATE, 'Received at warehouse');
        
        SP_LOG_AUDIT(p_user_id, 'UPDATE', 'SHIPMENT', p_shipment_id, 'Received at warehouse ' || p_warehouse_id);
        COMMIT;
    EXCEPTION
        WHEN e_insufficient_capacity THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20006, 'Warehouse is full.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END RECEIVE_SHIPMENT;
    
    PROCEDURE DISPATCH_SHIPMENT(p_shipment_id NUMBER, p_user_id NUMBER) IS
    BEGIN
        UPDATE SHIPMENT SET Current_Status = 'IN_TRANSIT' WHERE Shipment_ID = p_shipment_id;
        
        INSERT INTO TRACKING (Tracking_ID, Shipment_ID, Current_Location, Status, Update_Time, Remarks)
        VALUES (SEQ_TRACKING.NEXTVAL, p_shipment_id, 'Transit', 'IN_TRANSIT', SYSDATE, 'Dispatched from warehouse');
        
        SP_LOG_AUDIT(p_user_id, 'UPDATE', 'SHIPMENT', p_shipment_id, 'Dispatched shipment');
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END DISPATCH_SHIPMENT;
    
    FUNCTION GET_WAREHOUSE_CAPACITY(p_warehouse_id NUMBER) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT Capacity, FN_GET_WAREHOUSE_UTILIZATION(p_warehouse_id) as Utilization 
            FROM WAREHOUSE WHERE Warehouse_ID = p_warehouse_id;
        RETURN v_cursor;
    END GET_WAREHOUSE_CAPACITY;
    
    PROCEDURE ADD_WAREHOUSE(p_name VARCHAR2, p_location VARCHAR2, p_capacity NUMBER, p_contact VARCHAR2, p_warehouse_id OUT NUMBER) IS
    BEGIN
        p_warehouse_id := SEQ_WAREHOUSE.NEXTVAL;
        INSERT INTO WAREHOUSE (Warehouse_ID, Warehouse_Name, Location, Capacity, Contact_No)
        VALUES (p_warehouse_id, p_name, p_location, p_capacity, p_contact);
        COMMIT;
    END ADD_WAREHOUSE;
    
    PROCEDURE UPDATE_WAREHOUSE(p_warehouse_id NUMBER, p_name VARCHAR2, p_location VARCHAR2, p_capacity NUMBER, p_contact VARCHAR2) IS
    BEGIN
        UPDATE WAREHOUSE SET Warehouse_Name = p_name, Location = p_location, Capacity = p_capacity, Contact_No = p_contact
        WHERE Warehouse_ID = p_warehouse_id;
        COMMIT;
    END UPDATE_WAREHOUSE;
END PKG_WAREHOUSE;
/

-- ==========================================
-- PKG_ADMIN
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_ADMIN IS
    FUNCTION GET_DASHBOARD_STATS RETURN SYS_REFCURSOR;
    FUNCTION GET_ALL_EMPLOYEES RETURN SYS_REFCURSOR;
    PROCEDURE ADD_EMPLOYEE(p_name VARCHAR2, p_phone VARCHAR2, p_email VARCHAR2, p_salary NUMBER, p_type VARCHAR2, p_password VARCHAR2, p_role VARCHAR2 DEFAULT NULL, p_warehouse_id NUMBER DEFAULT NULL, p_shift VARCHAR2 DEFAULT NULL, p_vehicle_id NUMBER DEFAULT NULL, p_license VARCHAR2 DEFAULT NULL, p_experience NUMBER DEFAULT 0, p_employee_id OUT NUMBER);
    PROCEDURE UPDATE_EMPLOYEE(p_employee_id NUMBER, p_name VARCHAR2, p_phone VARCHAR2, p_salary NUMBER);
    PROCEDURE DELETE_EMPLOYEE(p_employee_id NUMBER, p_user_id NUMBER);
    FUNCTION GET_ALL_ROUTES RETURN SYS_REFCURSOR;
    PROCEDURE ADD_ROUTE(p_source VARCHAR2, p_destination VARCHAR2, p_distance NUMBER, p_time NUMBER, p_route_id OUT NUMBER);
    PROCEDURE UPDATE_ROUTE(p_route_id NUMBER, p_source VARCHAR2, p_destination VARCHAR2, p_distance NUMBER, p_time NUMBER);
    PROCEDURE DELETE_ROUTE(p_route_id NUMBER);
    FUNCTION GET_ALL_VEHICLES RETURN SYS_REFCURSOR;
    PROCEDURE ADD_VEHICLE(p_number VARCHAR2, p_type VARCHAR2, p_capacity NUMBER, p_vehicle_id OUT NUMBER);
    PROCEDURE UPDATE_VEHICLE(p_vehicle_id NUMBER, p_number VARCHAR2, p_type VARCHAR2, p_capacity NUMBER, p_availability VARCHAR2);
    FUNCTION GET_AUDIT_LOG RETURN SYS_REFCURSOR;
END PKG_ADMIN;
/

CREATE OR REPLACE PACKAGE BODY PKG_ADMIN IS
    FUNCTION GET_DASHBOARD_STATS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT 
                (SELECT COUNT(*) FROM CUSTOMER) as total_customers,
                (SELECT COUNT(*) FROM SHIPMENT) as total_shipments,
                (SELECT COUNT(*) FROM SHIPMENT WHERE Current_Status NOT IN ('DELIVERED', 'CANCELLED')) as active_shipments,
                (SELECT COUNT(*) FROM DELIVERY WHERE Delivery_Status != 'DELIVERED') as pending_deliveries,
                FN_GET_TOTAL_REVENUE() as total_revenue,
                (SELECT COUNT(*) FROM EMPLOYEE) as total_employees,
                (SELECT COUNT(*) FROM WAREHOUSE) as total_warehouses
            FROM DUAL;
        RETURN v_cursor;
    END GET_DASHBOARD_STATS;
    
    FUNCTION GET_ALL_EMPLOYEES RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM EMPLOYEE;
        RETURN v_cursor;
    END GET_ALL_EMPLOYEES;
    
    PROCEDURE ADD_EMPLOYEE(p_name VARCHAR2, p_phone VARCHAR2, p_email VARCHAR2, p_salary NUMBER, p_type VARCHAR2, p_password VARCHAR2, p_role VARCHAR2 DEFAULT NULL, p_warehouse_id NUMBER DEFAULT NULL, p_shift VARCHAR2 DEFAULT NULL, p_vehicle_id NUMBER DEFAULT NULL, p_license VARCHAR2 DEFAULT NULL, p_experience NUMBER DEFAULT 0, p_employee_id OUT NUMBER) IS
        v_account_id NUMBER;
    BEGIN
        SAVEPOINT sp_add_emp;
        p_employee_id := SEQ_EMPLOYEE.NEXTVAL;
        INSERT INTO EMPLOYEE (Employee_ID, Name, Phone, Email, Joining_Date, Salary, Employee_Type)
        VALUES (p_employee_id, p_name, p_phone, p_email, SYSDATE, p_salary, p_type);
        
        IF p_type = 'ADMIN' THEN
            INSERT INTO ADMIN (Employee_ID, Role) VALUES (p_employee_id, NVL(p_role, 'ADMIN'));
        ELSIF p_type = 'WAREHOUSE_STAFF' THEN
            INSERT INTO WAREHOUSE_STAFF (Employee_ID, Warehouse_ID, Shift) VALUES (p_employee_id, p_warehouse_id, p_shift);
        ELSIF p_type = 'DELIVERY_AGENT' THEN
            INSERT INTO DELIVERY_AGENT (Employee_ID, Vehicle_ID, License_No, Experience) VALUES (p_employee_id, p_vehicle_id, p_license, p_experience);
        END IF;
        
        v_account_id := SEQ_ACCOUNT.NEXTVAL;
        INSERT INTO USER_ACCOUNT (Account_ID, Email, Password_Hash, Role, Employee_ID, Account_Status, Created_At)
        VALUES (v_account_id, p_email, p_password, p_type, p_employee_id, 'ACTIVE', SYSDATE);
        
        SP_LOG_AUDIT(v_account_id, 'INSERT', 'EMPLOYEE', p_employee_id, 'Added employee ' || p_name);
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK TO sp_add_emp;
            RAISE;
    END ADD_EMPLOYEE;
    
    PROCEDURE UPDATE_EMPLOYEE(p_employee_id NUMBER, p_name VARCHAR2, p_phone VARCHAR2, p_salary NUMBER) IS
    BEGIN
        UPDATE EMPLOYEE SET Name = p_name, Phone = p_phone, Salary = p_salary WHERE Employee_ID = p_employee_id;
        COMMIT;
    END UPDATE_EMPLOYEE;
    
    PROCEDURE DELETE_EMPLOYEE(p_employee_id NUMBER, p_user_id NUMBER) IS
    BEGIN
        DELETE FROM USER_ACCOUNT WHERE Employee_ID = p_employee_id;
        DELETE FROM ADMIN WHERE Employee_ID = p_employee_id;
        DELETE FROM WAREHOUSE_STAFF WHERE Employee_ID = p_employee_id;
        DELETE FROM DELIVERY_AGENT WHERE Employee_ID = p_employee_id;
        DELETE FROM EMPLOYEE WHERE Employee_ID = p_employee_id;
        SP_LOG_AUDIT(p_user_id, 'DELETE', 'EMPLOYEE', p_employee_id, 'Deleted employee');
        COMMIT;
    END DELETE_EMPLOYEE;
    
    FUNCTION GET_ALL_ROUTES RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM ROUTE;
        RETURN v_cursor;
    END GET_ALL_ROUTES;
    
    PROCEDURE ADD_ROUTE(p_source VARCHAR2, p_destination VARCHAR2, p_distance NUMBER, p_time NUMBER, p_route_id OUT NUMBER) IS
    BEGIN
        p_route_id := SEQ_ROUTE.NEXTVAL;
        INSERT INTO ROUTE (Route_ID, Source, Destination, Distance, Estimated_Time) VALUES (p_route_id, p_source, p_destination, p_distance, p_time);
        COMMIT;
    END ADD_ROUTE;
    
    PROCEDURE UPDATE_ROUTE(p_route_id NUMBER, p_source VARCHAR2, p_destination VARCHAR2, p_distance NUMBER, p_time NUMBER) IS
    BEGIN
        UPDATE ROUTE SET Source = p_source, Destination = p_destination, Distance = p_distance, Estimated_Time = p_time WHERE Route_ID = p_route_id;
        COMMIT;
    END UPDATE_ROUTE;
    
    PROCEDURE DELETE_ROUTE(p_route_id NUMBER) IS
    BEGIN
        DELETE FROM ROUTE WHERE Route_ID = p_route_id;
        COMMIT;
    END DELETE_ROUTE;
    
    FUNCTION GET_ALL_VEHICLES RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM VEHICLE;
        RETURN v_cursor;
    END GET_ALL_VEHICLES;
    
    PROCEDURE ADD_VEHICLE(p_number VARCHAR2, p_type VARCHAR2, p_capacity NUMBER, p_vehicle_id OUT NUMBER) IS
    BEGIN
        p_vehicle_id := SEQ_VEHICLE.NEXTVAL;
        INSERT INTO VEHICLE (Vehicle_ID, Vehicle_Number, Vehicle_Type, Capacity, Availability) VALUES (p_vehicle_id, p_number, p_type, p_capacity, 'AVAILABLE');
        COMMIT;
    END ADD_VEHICLE;
    
    PROCEDURE UPDATE_VEHICLE(p_vehicle_id NUMBER, p_number VARCHAR2, p_type VARCHAR2, p_capacity NUMBER, p_availability VARCHAR2) IS
    BEGIN
        UPDATE VEHICLE SET Vehicle_Number = p_number, Vehicle_Type = p_type, Capacity = p_capacity, Availability = p_availability WHERE Vehicle_ID = p_vehicle_id;
        COMMIT;
    END UPDATE_VEHICLE;
    
    FUNCTION GET_AUDIT_LOG RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR SELECT * FROM AUDIT_LOG ORDER BY Action_Time DESC;
        RETURN v_cursor;
    END GET_AUDIT_LOG;
END PKG_ADMIN;
/

-- ==========================================
-- PKG_REPORTS
-- ==========================================
CREATE OR REPLACE PACKAGE PKG_REPORTS IS
    FUNCTION GET_REVENUE_BY_MONTH RETURN SYS_REFCURSOR;
    FUNCTION GET_SHIPMENTS_BY_STATUS RETURN SYS_REFCURSOR;
    FUNCTION GET_TOP_CUSTOMERS(p_limit NUMBER DEFAULT 10) RETURN SYS_REFCURSOR;
    FUNCTION GET_WAREHOUSE_UTILIZATION_REPORT RETURN SYS_REFCURSOR;
    FUNCTION GET_AGENT_PERFORMANCE_REPORT RETURN SYS_REFCURSOR;
    FUNCTION GET_MOST_USED_ROUTES(p_limit NUMBER DEFAULT 10) RETURN SYS_REFCURSOR;
    FUNCTION GET_DELAYED_SHIPMENTS RETURN SYS_REFCURSOR;
    FUNCTION GET_DELIVERY_STATS RETURN SYS_REFCURSOR;
    PROCEDURE GENERATE_COMPREHENSIVE_REPORT(p_result OUT SYS_REFCURSOR);
END PKG_REPORTS;
/

CREATE OR REPLACE PACKAGE BODY PKG_REPORTS IS
    FUNCTION GET_REVENUE_BY_MONTH RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT EXTRACT(YEAR FROM Payment_Date) AS Year, EXTRACT(MONTH FROM Payment_Date) AS Month, SUM(Amount) AS Total_Revenue
            FROM PAYMENT
            WHERE Payment_Status = 'PAID'
            GROUP BY EXTRACT(YEAR FROM Payment_Date), EXTRACT(MONTH FROM Payment_Date)
            ORDER BY Year DESC, Month DESC;
        RETURN v_cursor;
    END GET_REVENUE_BY_MONTH;
    
    FUNCTION GET_SHIPMENTS_BY_STATUS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT Current_Status, COUNT(*) as Count 
            FROM SHIPMENT 
            GROUP BY Current_Status;
        RETURN v_cursor;
    END GET_SHIPMENTS_BY_STATUS;
    
    FUNCTION GET_TOP_CUSTOMERS(p_limit NUMBER DEFAULT 10) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT C.Customer_ID, C.Name, COUNT(S.Shipment_ID) as Total_Shipments
            FROM CUSTOMER C
            JOIN SHIPMENT S ON C.Customer_ID = S.Customer_ID
            GROUP BY C.Customer_ID, C.Name
            ORDER BY Total_Shipments DESC
            FETCH FIRST p_limit ROWS ONLY;
        RETURN v_cursor;
    END GET_TOP_CUSTOMERS;
    
    FUNCTION GET_WAREHOUSE_UTILIZATION_REPORT RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT 
                W.Warehouse_ID, 
                W.Warehouse_Name, 
                W.Capacity,
                (SELECT COUNT(*) FROM SHIPMENT S WHERE S.Warehouse_ID = W.Warehouse_ID AND S.Current_Status NOT IN ('DELIVERED', 'CANCELLED')) as Active_Shipments,
                FN_GET_WAREHOUSE_UTILIZATION(W.Warehouse_ID) as Utilization_Percentage
            FROM WAREHOUSE W;
        RETURN v_cursor;
    END GET_WAREHOUSE_UTILIZATION_REPORT;
    
    FUNCTION GET_AGENT_PERFORMANCE_REPORT RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT 
                E.Employee_ID, E.Name,
                COUNT(D.Delivery_ID) AS Total_Assigned,
                SUM(CASE WHEN D.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) AS Successfully_Delivered
            FROM DELIVERY_AGENT DA
            JOIN EMPLOYEE E ON DA.Employee_ID = E.Employee_ID
            LEFT JOIN DELIVERY D ON DA.Employee_ID = D.Agent_ID
            GROUP BY E.Employee_ID, E.Name;
        RETURN v_cursor;
    END GET_AGENT_PERFORMANCE_REPORT;
    
    FUNCTION GET_MOST_USED_ROUTES(p_limit NUMBER DEFAULT 10) RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT R.Route_ID, R.Source, R.Destination, COUNT(S.Shipment_ID) as Usage_Count
            FROM ROUTE R
            JOIN SHIPMENT S ON R.Route_ID = S.Route_ID
            GROUP BY R.Route_ID, R.Source, R.Destination
            ORDER BY Usage_Count DESC
            FETCH FIRST p_limit ROWS ONLY;
        RETURN v_cursor;
    END GET_MOST_USED_ROUTES;
    
    FUNCTION GET_DELAYED_SHIPMENTS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT * FROM SHIPMENT 
            WHERE Current_Status NOT IN ('DELIVERED', 'CANCELLED') 
            AND Estimated_Delivery < SYSDATE;
        RETURN v_cursor;
    END GET_DELAYED_SHIPMENTS;
    
    FUNCTION GET_DELIVERY_STATS RETURN SYS_REFCURSOR IS
        v_cursor SYS_REFCURSOR;
    BEGIN
        OPEN v_cursor FOR 
            SELECT 
                Delivery_Status,
                COUNT(*) as Status_Count
            FROM DELIVERY
            GROUP BY Delivery_Status;
        RETURN v_cursor;
    END GET_DELIVERY_STATS;
    
    PROCEDURE GENERATE_COMPREHENSIVE_REPORT(p_result OUT SYS_REFCURSOR) IS
        -- Use explicit cursor for demonstration, but opening a ref cursor using standard SELECT
    BEGIN
        OPEN p_result FOR 
            SELECT 
                W.Warehouse_Name,
                COUNT(S.Shipment_ID) as Total_Processed,
                SUM(CASE WHEN S.Current_Status = 'DELIVERED' THEN 1 ELSE 0 END) as Total_Delivered,
                SUM(CASE WHEN S.Current_Status = 'CANCELLED' THEN 1 ELSE 0 END) as Total_Cancelled
            FROM WAREHOUSE W
            LEFT JOIN SHIPMENT S ON W.Warehouse_ID = S.Warehouse_ID
            GROUP BY W.Warehouse_Name;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE;
    END GENERATE_COMPREHENSIVE_REPORT;
END PKG_REPORTS;
/
