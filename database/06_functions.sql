-- 1. FN_GET_CUSTOMER_SHIPMENT_COUNT
CREATE OR REPLACE FUNCTION FN_GET_CUSTOMER_SHIPMENT_COUNT(p_customer_id NUMBER) RETURN NUMBER IS
    v_count NUMBER;
BEGIN
    SELECT COUNT(Shipment_ID) INTO v_count FROM SHIPMENT WHERE Customer_ID = p_customer_id;
    RETURN v_count;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
/

-- 2. FN_GET_WAREHOUSE_UTILIZATION
CREATE OR REPLACE FUNCTION FN_GET_WAREHOUSE_UTILIZATION(p_warehouse_id NUMBER) RETURN NUMBER IS
    v_capacity NUMBER;
    v_active_shipments NUMBER;
    v_utilization NUMBER;
BEGIN
    SELECT Capacity INTO v_capacity FROM WAREHOUSE WHERE Warehouse_ID = p_warehouse_id;
    IF v_capacity = 0 THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(Shipment_ID) INTO v_active_shipments 
    FROM SHIPMENT 
    WHERE Warehouse_ID = p_warehouse_id 
      AND Current_Status NOT IN ('DELIVERED', 'CANCELLED');
      
    v_utilization := (v_active_shipments / v_capacity) * 100;
    RETURN v_utilization;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 0;
    WHEN OTHERS THEN
        RETURN 0;
END;
/

-- 3. FN_GET_TOTAL_REVENUE
CREATE OR REPLACE FUNCTION FN_GET_TOTAL_REVENUE(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL) RETURN NUMBER IS
    v_revenue NUMBER;
BEGIN
    IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
        SELECT NVL(SUM(Amount), 0) INTO v_revenue 
        FROM PAYMENT 
        WHERE Payment_Status = 'PAID' AND Payment_Date BETWEEN p_start_date AND p_end_date;
    ELSE
        SELECT NVL(SUM(Amount), 0) INTO v_revenue 
        FROM PAYMENT 
        WHERE Payment_Status = 'PAID';
    END IF;
    RETURN v_revenue;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
/

-- 4. FN_GET_PENDING_PAYMENT_COUNT
CREATE OR REPLACE FUNCTION FN_GET_PENDING_PAYMENT_COUNT RETURN NUMBER IS
    v_count NUMBER;
BEGIN
    SELECT COUNT(Payment_ID) INTO v_count FROM PAYMENT WHERE Payment_Status = 'PENDING';
    RETURN v_count;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
/

-- 5. FN_CALCULATE_SHIPPING_COST
CREATE OR REPLACE FUNCTION FN_CALCULATE_SHIPPING_COST(p_weight NUMBER, p_distance NUMBER, p_delivery_type VARCHAR2) RETURN NUMBER IS
    v_base_rate NUMBER := 50;
    v_per_kg NUMBER := 10;
    v_per_km NUMBER := 2;
    v_multiplier NUMBER := 1.0;
    v_total NUMBER;
BEGIN
    IF UPPER(p_delivery_type) = 'EXPRESS' THEN
        v_multiplier := 1.5;
    ELSIF UPPER(p_delivery_type) = 'OVERNIGHT' THEN
        v_multiplier := 2.0;
    ELSE
        v_multiplier := 1.0;
    END IF;
    
    v_total := (v_base_rate + (p_weight * v_per_kg) + (p_distance * v_per_km)) * v_multiplier;
    RETURN v_total;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
/

-- 6. FN_GET_AGENT_DELIVERY_COUNT
CREATE OR REPLACE FUNCTION FN_GET_AGENT_DELIVERY_COUNT(p_agent_id NUMBER) RETURN NUMBER IS
    v_count NUMBER;
BEGIN
    SELECT COUNT(Delivery_ID) INTO v_count FROM DELIVERY WHERE Agent_ID = p_agent_id;
    RETURN v_count;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
/

-- 7. FN_CALCULATE_ESTIMATED_DELIVERY
CREATE OR REPLACE FUNCTION FN_CALCULATE_ESTIMATED_DELIVERY(p_delivery_type VARCHAR2, p_distance NUMBER) RETURN DATE IS
    v_est_date DATE;
BEGIN
    IF UPPER(p_delivery_type) = 'STANDARD' THEN
        v_est_date := SYSDATE + CEIL(p_distance / 500) + 2;
    ELSIF UPPER(p_delivery_type) = 'EXPRESS' THEN
        v_est_date := SYSDATE + CEIL(p_distance / 500) + 1;
    ELSIF UPPER(p_delivery_type) = 'OVERNIGHT' THEN
        v_est_date := SYSDATE + 1;
    ELSE
        v_est_date := SYSDATE + CEIL(p_distance / 500) + 2;
    END IF;
    RETURN v_est_date;
EXCEPTION
    WHEN OTHERS THEN
        RETURN SYSDATE + 7;
END;
/

-- 8. FN_IS_VALID_STATUS_TRANSITION
CREATE OR REPLACE FUNCTION FN_IS_VALID_STATUS_TRANSITION(p_old_status VARCHAR2, p_new_status VARCHAR2) RETURN NUMBER IS
BEGIN
    IF p_old_status = 'BOOKED' AND p_new_status IN ('WAREHOUSE_RECEIVED', 'CANCELLED') THEN
        RETURN 1;
    ELSIF p_old_status = 'WAREHOUSE_RECEIVED' AND p_new_status IN ('IN_TRANSIT', 'CANCELLED') THEN
        RETURN 1;
    ELSIF p_old_status = 'IN_TRANSIT' AND p_new_status IN ('OUT_FOR_DELIVERY') THEN
        RETURN 1;
    ELSIF p_old_status = 'OUT_FOR_DELIVERY' AND p_new_status IN ('DELIVERED') THEN
        RETURN 1;
    ELSIF p_old_status = 'DELIVERED' THEN
        RETURN 0;
    ELSIF p_old_status = 'CANCELLED' THEN
        RETURN 0;
    END IF;
    
    RETURN 0;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0;
END;
/
