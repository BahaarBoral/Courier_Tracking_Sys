# Database Normalization Analysis

## 1. Introduction to Normalization
Normalization is a systematic process of organizing data in a database to reduce redundancy and improve data integrity. The primary objectives are to eliminate anomalous behavior during data manipulation:
- **Insertion Anomalies:** Inability to insert certain data without the presence of other unrelated data.
- **Deletion Anomalies:** Unintended loss of data when a record is deleted.
- **Update Anomalies:** Data inconsistency resulting from partial updates of redundant data.

By adhering to normal forms, the Logistics Courier Tracking System schema ensures robust and consistent data storage.

## 2. Functional Dependencies of the Project
A functional dependency (FD) $X \rightarrow Y$ implies that the attribute(s) $X$ uniquely determines the attribute(s) $Y$. Below are the core FDs identified in our schema:

```text
Customer_ID → Name, Email, Phone, Address
Email → Customer_ID (candidate key)
Shipment_ID → Customer_ID, Warehouse_ID, Route_ID, Agent_ID, Booking_Date, Weight, Delivery_Type, Estimated_Delivery, Current_Status
Parcel_ID → Shipment_ID, Parcel_Type, Weight, Length, Height, Width, Fragile
Shipment_ID → Parcel_ID (via UNIQUE constraint - 1:1)
Tracking_ID → Shipment_ID, Current_Location, Status, Update_Time, Remarks
Delivery_ID → Shipment_ID, Agent_ID, Delivery_Date, Delivery_Status, Receiver_Name, Receiver_Signature
Payment_ID → Shipment_ID, Amount, Payment_Method, Payment_Status, Payment_Date
Warehouse_ID → Warehouse_Name, Location, Capacity, Contact_No
Route_ID → Source, Destination, Distance, Estimated_Time
Employee_ID → Name, Phone, Email, Joining_Date, Salary, Employee_Type
Vehicle_ID → Vehicle_Number, Vehicle_Type, Capacity, Availability
Vehicle_Number → Vehicle_ID (candidate key)
Account_ID → Email, Password_Hash, Role, Customer_ID, Employee_ID, Account_Status, Created_At, Last_Login
```

## 3. Armstrong's Axioms Application
Armstrong's Axioms are inference rules used to deduce all functional dependencies on a relational database.

- **Reflexivity:** If $Y \subseteq X$, then $X \rightarrow Y$.
  *Example:* `{Customer_ID, Name} → {Name}`
- **Augmentation:** If $X \rightarrow Y$, then $XZ \rightarrow YZ$.
  *Example:* We know `Customer_ID → Email`. Therefore, `{Customer_ID, Phone} → {Email, Phone}`.
- **Transitivity:** If $X \rightarrow Y$ and $Y \rightarrow Z$, then $X \rightarrow Z$.
  *Example:* `Tracking_ID → Shipment_ID` and `Shipment_ID → Current_Status`. Therefore, `Tracking_ID → Current_Status`.

## 4. First Normal Form (1NF) Analysis
**Requirement:** All attributes must be atomic (indivisible) and there must be no repeating groups or arrays.
**Analysis:** In the `CUSTOMER` table, instead of storing a list of phone numbers in a single column, each customer has a single primary `Phone` attribute. The `Address` is stored as a single string, or could be decomposed further, but is currently treated as an atomic textual attribute by the backend. All tables in our schema strictly comply with 1NF.

## 5. Second Normal Form (2NF) Analysis
**Requirement:** Must be in 1NF, and all non-key attributes must fully depend on the primary key (no partial dependencies).
**Analysis:** Partial dependencies only occur in tables with composite primary keys. In our design, all entities (`CUSTOMER`, `SHIPMENT`, `WAREHOUSE`, etc.) utilize single-attribute surrogate keys (e.g., `Customer_ID`, `Shipment_ID`). 
*Why composite keys would cause issues:* If `SHIPMENT` had a composite key of `{Customer_ID, Route_ID}`, and we stored `Customer_Name` in it, `Customer_Name` would only depend on `Customer_ID` (a partial dependency), leading to redundancy. Our surrogate key approach naturally avoids this, satisfying 2NF.

## 6. Third Normal Form (3NF) Analysis
**Requirement:** Must be in 2NF, and no non-key attribute is transitively dependent on the primary key.
**Analysis:** Transitive dependencies occur when $X \rightarrow Y$ and $Y \rightarrow Z$. 
*Example Check:* In the `SHIPMENT` table, `Shipment_ID → Customer_ID`. If we had `Customer_Name` in `SHIPMENT`, we would have a transitive dependency (`Shipment_ID → Customer_ID → Customer_Name`). To prevent this, `Customer_Name` is strictly kept in the `CUSTOMER` table. `SHIPMENT` only stores the foreign key `Customer_ID`. Thus, all tables satisfy 3NF.

## 7. Boyce-Codd Normal Form (BCNF) Analysis
**Requirement:** For every non-trivial functional dependency $X \rightarrow Y$, $X$ must be a superkey.
**Analysis:** BCNF is a stronger version of 3NF. In our schema:
- `CUSTOMER`: Determinants are `Customer_ID` and `Email`. Both are candidate keys.
- `VEHICLE`: Determinants are `Vehicle_ID` and `Vehicle_Number`. Both are candidate keys.
Therefore, the core schema is in BCNF.

## 8. Fourth Normal Form (4NF) Considerations
**Requirement:** Must be in BCNF, and must contain no non-trivial multi-valued dependencies (MVDs).
**Analysis:** An MVD $X \twoheadrightarrow Y$ means that for a single value of $X$, there are multiple values of $Y$, independent of other attributes. Our schema avoids MVDs by separating distinct 1:N relationships into their own tables. For example, a Shipment can have multiple Tracking updates. These are not stored as parallel multi-valued arrays but normalized into a separate `TRACKING` table mapped to `Shipment_ID`. 

## 9. Fifth Normal Form (5NF) Considerations
**Requirement:** Must be in 4NF, and every join dependency is implied by the candidate keys.
**Analysis:** 5NF deals with cases where information can only be reconstructed by joining three or more tables. Our schema uses standard binary relationships (1:1, 1:N, M:N resolved via associative entities). There are no obscure cyclic constraints that would violate 5NF.

## 10. Decomposition Example
Imagine an unnormalized "all-in-one" shipment record:
`UNNORMALIZED_RECORD(Shipment_ID, Customer_Name, Customer_Phone, Source, Destination, Weight)`

**Anomalies:**
- If the customer changes their phone number, we have to update multiple shipment records.
- If we want to add a customer before they make a shipment, we can't (Shipment_ID is missing).

**Decomposition:**
1. Extract Customer: `CUSTOMER(Customer_ID, Name, Phone)`
2. Extract Route: `ROUTE(Route_ID, Source, Destination)`
3. Resulting Shipment: `SHIPMENT(Shipment_ID, Customer_ID, Route_ID, Weight)`

This perfectly mirrors our project's actual schema, demonstrating the practical application of normalization.
