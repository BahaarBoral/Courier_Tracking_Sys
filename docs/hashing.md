# Hashing Concepts in Database Systems

## 1. Hashing Concepts
Hashing is a technique used for direct data access, aiming for $O(1)$ search complexity.
- **Hash Function ($h$):** A mathematical algorithm that takes a search key and computes an integer.
- **Bucket:** A storage unit (typically a disk block or memory page) whose address corresponds to the output of the hash function.
- **Purpose:** By skipping tree traversals, hashing allows immediate identification of the block containing the required record.

## 2. Static Hashing
In static hashing, the number of buckets is fixed when the database is created.
- **Hash Function:** Commonly a modulo operation: $h(K) = K \pmod N$ (where $N$ is the fixed number of buckets).
- **Example with Project Data:**
  Let's assume we use static hashing for the `CUSTOMER` table with 5 buckets.
  ```text
  Buckets = 5
  Customer_ID 1001: h(1001) = 1001 MOD 5 = 1 → Assigned to Bucket 1
  Customer_ID 1002: h(1002) = 1002 MOD 5 = 2 → Assigned to Bucket 2
  Customer_ID 1006: h(1006) = 1006 MOD 5 = 1 → Assigned to Bucket 1
  ```
- **Collisions & Overflow Chains:** As seen above, 1001 and 1006 hash to the same bucket. If Bucket 1 is full, a new overflow bucket is allocated and linked via a pointer, degrading performance to linear search within the chain.

## 3. Dynamic Hashing (Extendible Hashing)
Dynamic hashing adapts the number of buckets as data grows, preventing long overflow chains.
- **Directory:** Uses a directory of pointers to buckets.
- **Global Depth:** The number of bits of the hash used by the directory.
- **Local Depth:** The number of bits used by an individual bucket.
- **Bucket Splitting:** When a bucket overflows, only that bucket splits. If local depth equals global depth, the directory size doubles (global depth increases by 1). 
- *Walkthrough:* If a bucket holding `Customer_IDs` ending in binary `01` overflows, it splits into `001` and `101`, and the directory updates accordingly.

## 4. Linear Hashing
An alternative dynamic approach that avoids a central directory.
- **Gradual Splitting:** Buckets are split sequentially (round-robin), not necessarily the one that overflowed.
- **Split Pointer:** Points to the next bucket to be split. When an overflow occurs anywhere, the bucket at the split pointer is divided, and the pointer advances.

## 5. Hashing in Oracle
While Oracle defaults to B+ Trees, it supports hashing for specific scenarios:
- **Hash Clusters:** Physically stores related rows together based on a hash function, useful for tables that are primarily accessed via equality checks on the primary key.
- **Hash Partitioning:** Distributes table rows evenly across storage partitions using a hash function on a partition key (e.g., partitioning `SHIPMENT` by hashing `Customer_ID`).
- **Hash Joins:** During query execution, Oracle often builds an in-memory hash table on the smaller result set to optimize join performance.

## 6. Hashing vs Indexing Comparison

| Aspect | Hashing | B+ Tree Index (Default in Project) |
|--------|---------|---------------|
| **Equality Lookup (`=`)** | Extremely fast, typically $O(1)$ | Fast, $O(\log n)$ |
| **Range Query (`>`, `<`)** | Inefficient (requires full scan) | Very Efficient (leaves are linked) |
| **Ordered Access (`ORDER BY`)** | No inherent order | Data is logically sorted |
| **Dynamic Growth** | Can require restructuring | Naturally balanced |

*Conclusion:* Our Courier Tracking System uses B+ Tree indexes because features like viewing tracking history over a date range, or fetching shipments by weight bounds, require efficient range queries which hashing cannot provide.
