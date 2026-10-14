import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (on all pages except page 1)
        if self._pageNumber > 1:
            self.drawString(54, letter[1] - 36, "LogiTrack — Complete DBMS & Architecture Technical Guide")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, letter[1] - 42, letter[0] - 54, letter[1] - 42)
        
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, footer_text)
        self.drawString(54, 36, "Confidential — For Internal Project Review & Viva Preparation")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)
        self.restoreState()

def build_pdf(filename="LogiTrack_DBMS_Complete_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#1a1f36")     # Navy
    c_accent = colors.HexColor("#4f46e5")      # Indigo
    c_success = colors.HexColor("#0f766e")     # Teal
    c_bg_light = colors.HexColor("#f8fafc")    # Light slate
    c_border = colors.HexColor("#cbd5e1")
    c_text = colors.HexColor("#1e293b")
    c_code_bg = colors.HexColor("#f1f5f9")
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=0,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_accent,
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_accent,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_text,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeStyleCustom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#0f172a")
    )
    
    viva_q_style = ParagraphStyle(
        'VivaQ',
        parent=body_style,
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#b91c1c"),
        spaceBefore=6,
        spaceAfter=2,
        keepWithNext=True
    )

    viva_a_style = ParagraphStyle(
        'VivaA',
        parent=body_style,
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=c_text,
        leftIndent=10,
        spaceAfter=6
    )

    elements = []

    # Title Block
    elements.append(Paragraph("LogiTrack: Courier Tracking System", title_style))
    elements.append(Paragraph("Complete Technical Architecture, Database Specifications & Viva Exam Guide", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=0, spaceAfter=12))

    # Meta Table
    meta_data = [
        [
            Paragraph("<b>Database:</b> Oracle AI Database 23c Free (Docker)", body_style),
            Paragraph("<b>PDB Service:</b> FREEPDB1", body_style),
            Paragraph("<b>Schema User:</b> courier_admin", body_style)
        ],
        [
            Paragraph("<b>Backend:</b> Node.js + Express (Port 3000)", body_style),
            Paragraph("<b>Driver:</b> node-oracledb (Thin Mode)", body_style),
            Paragraph("<b>Course Code:</b> BCSE302L Database Systems", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[170, 160, 174])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # SECTION 1
    elements.append(Paragraph("1. System Architecture & 3-Tier Enterprise Design", h1_style))
    elements.append(Paragraph(
        "LogiTrack is built strictly following the standard <b>3-Tier Enterprise Architecture</b>. "
        "Unlike basic academic projects that manipulate flat files or embedded SQLite databases, this system uses an "
        "industrial-grade, client-server relational DBMS.", body_style
    ))
    
    tier_data = [
        [
            Paragraph("<b>Tier</b>", body_style),
            Paragraph("<b>Technology</b>", body_style),
            Paragraph("<b>Responsibilities & Interaction Flow</b>", body_style)
        ],
        [
            Paragraph("<b>Presentation Tier</b> (Frontend)", body_style),
            Paragraph("HTML5, CSS3, Vanilla JavaScript, Chart.js", body_style),
            Paragraph("Role-based responsive portals (Customer, Admin, Warehouse Staff, Delivery Agent). Makes asynchronous REST calls via <code>apiCall()</code> to port 3000.", body_style)
        ],
        [
            Paragraph("<b>Application Tier</b> (Backend)", body_style),
            Paragraph("Node.js, Express, node-oracledb, JWT, bcrypt", body_style),
            Paragraph("Thin coordination layer. Handles password hashing, token validation, and dispatches stored procedure calls to Oracle via TCP port 1521 without raw ad-hoc SQL.", body_style)
        ],
        [
            Paragraph("<b>Database Tier</b> (RDBMS)", body_style),
            Paragraph("Oracle Database 23c Free (Docker)", body_style),
            Paragraph("Manages ACID transactions, compiled PL/SQL packages, row-level locks, autonomous sequences, indexes, and automated audit triggers.", body_style)
        ]
    ]
    t_tier = Table(tier_data, colWidths=[110, 120, 274])
    t_tier.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_tier)
    elements.append(Spacer(1, 10))

    # SECTION 2
    elements.append(Paragraph("2. The '.db File' Question: Why There Is No Local File in the Backend", h1_style))
    elements.append(Paragraph(
        "<b>Key Viva Concept:</b> Students often expect a visible file like <code>database.db</code> inside the backend folder. "
        "Understanding why this does not exist in Oracle is vital for explaining RDBMS design to examiners.", body_style
    ))
    elements.append(Paragraph(
        "• <b>Embedded Databases (SQLite):</b> A serverless library where the app directly writes bytes to a single file on disk. "
        "It lacks network listeners, concurrent write transactions, stored packages, and multi-user privilege controls.", bullet_style
    ))
    elements.append(Paragraph(
        "• <b>Client-Server RDBMS (Oracle Database):</b> The Node.js app is strictly a client. It communicates over the network (Oracle Net protocol, port 1521) "
        "with an independent database server daemon inside Docker. The server manages data blocks inside binary tablespaces (<code>users01.dbf</code>) "
        "at <code>/opt/oracle/oradata/FREE/FREEPDB1/</code>.", bullet_style
    ))
    elements.append(Paragraph(
        "• <b>Real-time State vs. Source Code:</b> When a customer books a shipment, the database engine commits rows directly into Oracle's memory buffer and tablespace files. "
        "It does <i>not</i> modify static <code>.sql</code> text files. The <code>.sql</code> files in your repository are DDL/DML deployment blueprints, not runtime storage.", bullet_style
    ))
    elements.append(Spacer(1, 10))

    # SECTION 3
    elements.append(Paragraph("3. End-to-End Role Workflows & Live Lifecycle", h1_style))
    elements.append(Paragraph(
        "A parcel transitions through a strict state machine across 4 distinct user roles:", body_style
    ))

    flow_data = [
        [
            Paragraph("<b>Stage & Role</b>", body_style),
            Paragraph("<b>Status</b>", body_style),
            Paragraph("<b>Internal PL/SQL & Table Modifications</b>", body_style)
        ],
        [
            Paragraph("<b>1. Customer</b><br/>Books Parcel", body_style),
            Paragraph("<font color='#2563eb'><b>BOOKED</b></font>", body_style),
            Paragraph("Calls <code>PKG_SHIPMENT.BOOK_SHIPMENT</code>. Atomically inserts records into <code>SHIPMENT</code>, <code>PARCEL</code>, <code>TRACKING</code>, and <code>PAYMENT</code>. Evaluates warehouse capacity using <code>SELECT FOR UPDATE</code>.", body_style)
        ],
        [
            Paragraph("<b>2. Warehouse Staff</b><br/>Receives Package", body_style),
            Paragraph("<font color='#7c3aed'><b>WAREHOUSE_ RECEIVED</b></font>", body_style),
            Paragraph("Appears in Staff's 'Incoming' tab. Staff clicks 'Receive', invoking <code>PKG_WAREHOUSE.RECEIVE_SHIPMENT</code>. Re-checks capacity, acquires lock on <code>WAREHOUSE</code> row, logs <code>AUDIT_LOG</code>.", body_style)
        ],
        [
            Paragraph("<b>3. Warehouse Staff</b><br/>Dispatches Hub", body_style),
            Paragraph("<font color='#d97706'><b>IN_TRANSIT</b></font>", body_style),
            Paragraph("Moves to 'Dispatch' tab. Staff clicks 'Dispatch', calling <code>PKG_WAREHOUSE.DISPATCH_SHIPMENT</code>. Trigger <code>TRG_SHIPMENT_STATUS_HISTORY</code> fires automatically.", body_style)
        ],
        [
            Paragraph("<b>4. Administrator</b><br/>Assigns Agent", body_style),
            Paragraph("<font color='#d97706'><b>IN_TRANSIT</b><br/>(Assigned)</font>", body_style),
            Paragraph("Admin clicks 'Assign Agent' on Shipments table. Invokes <code>PKG_DELIVERY.ASSIGN_DELIVERY</code>. Inserts into <code>DELIVERY</code> table and updates <code>SHIPMENT.Agent_ID</code>.", body_style)
        ],
        [
            Paragraph("<b>5. Delivery Agent</b><br/>Doorstep Delivery", body_style),
            Paragraph("<font color='#ea580c'><b>OUT_FOR_ DELIVERY</b></font>", body_style),
            Paragraph("Immediately visible on Agent's portal under 'Active Deliveries'. Agent marks 'Out for Delivery' calling <code>PKG_DELIVERY.UPDATE_DELIVERY_STATUS</code>.", body_style)
        ],
        [
            Paragraph("<b>6. Delivery Agent</b><br/>Customer Signs", body_style),
            Paragraph("<font color='#16a34a'><b>DELIVERED</b></font>", body_style),
            Paragraph("Agent captures receiver name & signature, invoking <code>PKG_DELIVERY.MARK_DELIVERED</code>. Sets Delivery_Date, updates status to DELIVERED, and frees agent vehicle to AVAILABLE.", body_style)
        ]
    ]
    t_flow = Table(flow_data, colWidths=[110, 85, 309])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('INNERGRID', (0,0), (-1,-1), 0.5, c_border),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_flow)
    elements.append(Spacer(1, 10))

    elements.append(PageBreak())

    # SECTION 4
    elements.append(Paragraph("4. Comprehensive Database Scripts Breakdown (File by File)", h1_style))
    elements.append(Paragraph(
        "All database definitions reside in the <code>database/</code> directory and compile cleanly into the <code>courier_admin</code> schema:", body_style
    ))

    sql_files = [
        ("01_create_tables.sql", "Defines all 16 tables in dependency order with explicit constraint naming. Implements EER specialization: EMPLOYEE is the supertype, with ADMIN, DELIVERY_AGENT, and WAREHOUSE_STAFF as disjoint subtypes with ON DELETE CASCADE. Enforces 1:1 relationships using UNIQUE foreign keys (e.g. PARCEL.Shipment_ID, PAYMENT.Shipment_ID)."),
        ("02_constraints.sql", "Adds cross-table integrity guarantees, complex CHECK constraints (e.g. USER_ACCOUNT role isolation ensuring accounts link to either Customer_ID or Employee_ID), and documents complete database schema integrity."),
        ("03_sequences.sql", "Creates 13 autonomous Oracle sequences (SEQ_CUSTOMER, SEQ_SHIPMENT, SEQ_PARCEL, SEQ_DELIVERY, etc.) ensuring atomic, contention-free surrogate key generation without table locks."),
        ("04_indexes.sql", "B-Tree indexes on frequent lookup and join columns (CUSTOMER.Email, SHIPMENT.Current_Status, SHIPMENT.Customer_ID, TRACKING.Shipment_ID). Includes EXPLAIN PLAN demonstrations showing reduction in cost and table full scans."),
        ("05_views.sql", "8 complex database views for decoupled analytics: VW_CUSTOMER_SHIPMENTS, VW_SHIPMENT_TRACKING, VW_PENDING_DELIVERIES, VW_WAREHOUSE_UTILIZATION (calculating live load percentages), and VW_REVENUE_REPORT (monthly aggregations)."),
        ("06_functions.sql", "Pure PL/SQL functions: FN_CALCULATE_SHIPPING_COST (rate formulas based on weight, distance, delivery mode), FN_GET_WAREHOUSE_UTILIZATION, FN_IS_VALID_STATUS_TRANSITION (state machine validator returning 1 or 0), and FN_GET_TOTAL_REVENUE."),
        ("07_procedures.sql", "Standalone demonstration procedures: SP_LOG_AUDIT (autonomous audit recording), SP_UPDATE_LAST_LOGIN, and SP_GENERATE_DELIVERY_REPORT (demonstrating explicit CURSOR declaration, FETCH loop, and record aggregation)."),
        ("08_packages.sql", "The core business logic engine organized into 8 modular PL/SQL packages: PKG_AUTH (bcrypt hash comparison, registration transactions), PKG_SHIPMENT (atomic booking with SAVEPOINT and capacity check), PKG_WAREHOUSE (SELECT FOR UPDATE row-locking), PKG_DELIVERY (agent assignment & status progression), PKG_PAYMENT, PKG_CUSTOMER, PKG_ADMIN, and PKG_REPORTS."),
        ("09_triggers.sql", "Database event hooks: TRG_SHIPMENT_STATUS_HISTORY (AFTER UPDATE OF Current_Status recording old and new states), TRG_AUDIT_CUSTOMER_INSERT, TRG_AUDIT_SHIPMENT_INSERT, and TRG_VEHICLE_AVAILABILITY (automatically marks vehicle IN_USE when a delivery is assigned)."),
        ("10_seed_data.sql", "Bootstrap seed script creating 4 demo accounts (Customer, Admin, Delivery Agent, Warehouse Staff with bcrypt-hashed passwords for 'Demo@123'), realistic routes, vehicles, warehouses, and initial historical shipments."),
        ("11_demo_queries.sql", "Curated evaluation scripts demonstrating Inner/Left/Right Joins, GROUP BY, HAVING, subqueries, CASE statements, analytical aggregate functions, and Explain Plans."),
        ("12_transaction_concurrency_demo.sql", "Two-session concurrency demonstration verifying Oracle's Row-Level Exclusive Locks (TX), SELECT FOR UPDATE NOWAIT, Two-Phase Locking (2PL), and deadlock detection.")
    ]

    for fname, fdesc in sql_files:
        elements.append(Paragraph(f"<b>• {fname}</b>", h2_style))
        elements.append(Paragraph(fdesc, body_style))

    elements.append(Spacer(1, 10))

    # SECTION 5
    elements.append(Paragraph("5. How Frontend Buttons Trigger Real SQL (Under the Hood)", h1_style))
    elements.append(Paragraph(
        "To explain to your professor that the UI isn't a mock, trace this exact code path for <b>Shipment Booking</b>:", body_style
    ))

    code_box = """
1. [Browser: booking.html]
   Customer selects destination route, package dimensions, delivery type and clicks 'Confirm & Pay'.
   JavaScript: apiCall('/shipments', { method: 'POST', body: JSON.stringify({...}) })

2. [Node.js: shipmentController.bookShipment]
   Express receives payload and executes PL/SQL with bind parameters:
   BEGIN 
     PKG_SHIPMENT.BOOK_SHIPMENT(
       :p_customer_id, :p_warehouse_id, :p_route_id, :p_weight, :p_delivery_type,
       :p_parcel_type, :p_length, :p_width, :p_height, :p_fragile, :p_payment_method,
       :p_shipment_id, :p_parcel_id, :p_tracking_id, :p_payment_id
     ); 
   END;

3. [Oracle Database: PKG_SHIPMENT.BOOK_SHIPMENT]
   a. SAVEPOINT sp_book_shipment;
   b. SELECT Capacity FROM WAREHOUSE WHERE Warehouse_ID = p_warehouse_id FOR UPDATE; (Locks row)
   c. v_cost := FN_CALCULATE_SHIPPING_COST(p_weight, v_distance, p_delivery_type);
   d. INSERT INTO SHIPMENT (...) VALUES (SEQ_SHIPMENT.NEXTVAL, ...);
   e. INSERT INTO PARCEL (...) VALUES (SEQ_PARCEL.NEXTVAL, ...);
   f. INSERT INTO TRACKING (...) VALUES (SEQ_TRACKING.NEXTVAL, ...);
   g. INSERT INTO PAYMENT (...) VALUES (SEQ_PAYMENT.NEXTVAL, ...);
   h. SP_LOG_AUDIT(...);
   i. COMMIT; (Persists to Oracle disk datafiles)
"""
    t_code = Table([[Paragraph(f"<pre>{code_box.strip()}</pre>", code_style)]], colWidths=[504])
    t_code.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), c_code_bg),
        ('BOX', (0,0), (-1,-1), 0.5, c_border),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_code)

    elements.append(PageBreak())

    # SECTION 6
    elements.append(Paragraph("6. High-Probability DBMS Viva Questions & Model Answers", h1_style))
    elements.append(Paragraph(
        "Study these 12 questions carefully. They represent the exact syllabus concepts examiners test during BCSE302L vivas:", body_style
    ))

    viva_qa = [
        (
            "Q1: Why did you use Oracle instead of MySQL or SQLite?",
            "Answer: Oracle is an enterprise-grade client-server RDBMS providing robust support for PL/SQL packages (encapsulating state and procedures), row-level locks via SELECT FOR UPDATE, autonomous audit triggers, sequence generators, and strict ACID transaction compliance. SQLite is an embedded file-based engine that lacks multi-user package architecture and granular concurrency controls."
        ),
        (
            "Q2: How does your system enforce ACID properties during shipment booking?",
            "Answer: Atomicity & Consistency: PKG_SHIPMENT.BOOK_SHIPMENT uses a SAVEPOINT (sp_book_shipment). If any insertion into PARCEL, TRACKING, or PAYMENT fails, the entire transaction issues a ROLLBACK TO SAVEPOINT. Isolation: The origin warehouse row is locked using SELECT FOR UPDATE to prevent lost updates or capacity overselling. Durability: Upon successful completion, an explicit COMMIT writes the transaction to Oracle's online redo log files."
        ),
        (
            "Q3: Where is the EER (Enhanced Entity-Relationship) Specialization in your schema?",
            "Answer: In our EMPLOYEE table. EMPLOYEE serves as the Supertype containing shared attributes (Name, Email, Phone, Salary, Employee_Type). ADMIN, DELIVERY_AGENT, and WAREHOUSE_STAFF are disjoint Subtypes that reference EMPLOYEE(Employee_ID) as both Primary Key and Foreign Key with ON DELETE CASCADE."
        ),
        (
            "Q4: How do you enforce a 1:1 relationship between SHIPMENT and PARCEL or PAYMENT?",
            "Answer: In Oracle, a 1:1 relationship is enforced by placing a UNIQUE constraint on the Foreign Key in the child table. In PARCEL and PAYMENT, Shipment_ID is declared as: CONSTRAINT fk_parcel_shipment REFERENCES SHIPMENT(Shipment_ID) and CONSTRAINT uq_parcel_shipment UNIQUE(Shipment_ID)."
        ),
        (
            "Q5: Why did you use PL/SQL Packages instead of writing SQL queries inside Node.js?",
            "Answer: Encapsulation and Separation of Concerns: Moving business logic into packages (PKG_SHIPMENT, PKG_WAREHOUSE) minimizes network roundtrips between Node.js and Oracle. It enables compiled query optimization inside Oracle's Shared Pool, enforces security by preventing SQL injection through bind variables, and guarantees that business integrity rules cannot be bypassed by frontend callers."
        ),
        (
            "Q6: What is the purpose of the TRG_SHIPMENT_STATUS_HISTORY trigger?",
            "Answer: It is an AFTER UPDATE OF Current_Status row-level trigger on SHIPMENT. Whenever a shipment's status changes (e.g. from BOOKED to WAREHOUSE_RECEIVED), it autonomously captures :OLD.Current_Status, :NEW.Current_Status, and the current timestamp, and logs it into SHIPMENT_STATUS_HISTORY for legal tracking auditability."
        ),
        (
            "Q7: What is the default isolation level in Oracle, and what anomalies does it prevent?",
            "Answer: Oracle's default isolation level is READ COMMITTED. It guarantees that a query only sees data committed before the query began. It completely prevents Dirty Reads (reading uncommitted changes from concurrent transactions), while permitting non-repeatable reads and phantom reads unless SERIALIZABLE or explicit row locks are used."
        ),
        (
            "Q8: If I insert a record directly in SQL*Plus, why must I execute COMMIT before it appears on the website?",
            "Answer: Because Oracle uses multi-version concurrency control (MVCC) with Read Committed isolation. Uncommitted modifications exist solely in the local session's undo segment. The Node.js server maintains separate connection pool sessions and cannot see dirty data until an explicit COMMIT writes it to the database."
        ),
        (
            "Q9: How did you implement Concurrency Control and avoid the Lost Update problem?",
            "Answer: In PKG_WAREHOUSE.RECEIVE_SHIPMENT, we execute: SELECT Capacity INTO v_capacity FROM WAREHOUSE WHERE Warehouse_ID = p_id FOR UPDATE. This acquires an exclusive row-level TX lock on the warehouse row. Concurrent staff transactions attempting to receive shipments simultaneously are serialized until the lock is released upon COMMIT."
        ),
        (
            "Q10: What indexes did you create and why?",
            "Answer: We created B-tree indexes on foreign keys and frequently filtered columns (IDX_SHIPMENT_STATUS on Current_Status, IDX_SHIPMENT_CUSTOMER on Customer_ID, IDX_TRACKING_SHIPMENT on Shipment_ID). By default, foreign keys in Oracle are not automatically indexed, which can lead to table-level share locks during parent deletes. Indexing them avoids full table scans."
        ),
        (
            "Q11: How does password security work in your project?",
            "Answer: We do not store plaintext passwords. The application tier uses bcrypt with a salt round of 10 to generate cryptographic one-way hashes. The 60-character hash is stored in USER_ACCOUNT.Password_Hash. During login, bcrypt.compare verifies the entered password against the stored hash."
        ),
        (
            "Q12: What role do Oracle Sequences play in your database?",
            "Answer: Sequences (such as SEQ_SHIPMENT and SEQ_CUSTOMER) provide high-performance, atomic, gap-free surrogate keys. Unlike auto-increment columns in file databases which require locking the table header, Oracle sequences use internal memory caches to generate sequential numbers without transactional bottlenecks."
        )
    ]

    for q, a in viva_qa:
        elements.append(Paragraph(q, viva_q_style))
        elements.append(Paragraph(a, viva_a_style))

    # Build the document
    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"✅ PDF successfully generated: {filename}")

if __name__ == "__main__":
    out_pdf = "/Users/dinabandhu.boral2000gmail.com/Desktop/Courier_Tracking_Sys/LogiTrack_DBMS_Complete_Guide.pdf"
    build_pdf(out_pdf)
