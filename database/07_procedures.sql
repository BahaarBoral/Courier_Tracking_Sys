-- 1. SP_LOG_AUDIT
CREATE OR REPLACE PROCEDURE SP_LOG_AUDIT(
    p_user_id NUMBER, 
    p_action VARCHAR2, 
    p_table_name VARCHAR2, 
    p_record_id NUMBER, 
    p_description VARCHAR2
) IS
BEGIN
    INSERT INTO AUDIT_LOG (
        Audit_ID, User_ID, Action, Table_Name, Record_ID, Action_Time, Description
    ) VALUES (
        SEQ_AUDIT.NEXTVAL, p_user_id, p_action, p_table_name, p_record_id, SYSTIMESTAMP, p_description
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Non-blocking log, fail silently or handle appropriately
        NULL;
END;
/

-- 2. SP_UPDATE_LAST_LOGIN
CREATE OR REPLACE PROCEDURE SP_UPDATE_LAST_LOGIN(p_account_id NUMBER) IS
BEGIN
    UPDATE USER_ACCOUNT 
    SET Last_Login = SYSTIMESTAMP 
    WHERE Account_ID = p_account_id;
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/

-- 3. SP_GENERATE_DELIVERY_REPORT
CREATE OR REPLACE PROCEDURE SP_GENERATE_DELIVERY_REPORT(p_result OUT SYS_REFCURSOR) IS
    -- Explicit cursor demonstration
    CURSOR c_agent_stats IS 
        SELECT 
            E.Name AS Agent_Name,
            COUNT(D.Delivery_ID) AS Total_Deliveries,
            SUM(CASE WHEN D.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) AS Completed,
            SUM(CASE WHEN D.Delivery_Status != 'DELIVERED' THEN 1 ELSE 0 END) AS Pending,
            ROUND(
                SUM(CASE WHEN D.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) / 
                NULLIF(COUNT(D.Delivery_ID), 0) * 100, 2
            ) AS Success_Rate
        FROM DELIVERY_AGENT DA
        JOIN EMPLOYEE E ON DA.Employee_ID = E.Employee_ID
        LEFT JOIN DELIVERY D ON DA.Employee_ID = D.Agent_ID
        GROUP BY E.Name;
BEGIN
    -- Opening the ref cursor using the explicit SELECT (since returning the cursor is requested)
    -- Technically, ref cursors open directly with SELECT. A direct OPEN FOR is best for SYS_REFCURSOR.
    OPEN p_result FOR 
        SELECT 
            E.Name AS Agent_Name,
            COUNT(D.Delivery_ID) AS Total_Deliveries,
            SUM(CASE WHEN D.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) AS Completed,
            SUM(CASE WHEN D.Delivery_Status != 'DELIVERED' THEN 1 ELSE 0 END) AS Pending,
            ROUND(
                SUM(CASE WHEN D.Delivery_Status = 'DELIVERED' THEN 1 ELSE 0 END) / 
                NULLIF(COUNT(D.Delivery_ID), 0) * 100, 2
            ) AS Success_Rate
        FROM DELIVERY_AGENT DA
        JOIN EMPLOYEE E ON DA.Employee_ID = E.Employee_ID
        LEFT JOIN DELIVERY D ON DA.Employee_ID = D.Agent_ID
        GROUP BY E.Name;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
/
