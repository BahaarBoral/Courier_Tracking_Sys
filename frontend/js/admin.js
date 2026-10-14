// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    const user = requireAuth(['ADMIN']);
    if (!user) return;

    // Navigation
    const navLinks = document.querySelectorAll('.nav-links a[data-section]');
    const sections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const target = link.getAttribute('data-section');
            sections.forEach(sec => sec.classList.add('hidden'));
            document.getElementById(target).classList.remove('hidden');

            loadSection(target);
        });
    });

    // Initial load
    loadSection('dashboard-section');
    
    // Filters
    document.getElementById('admin-shipment-filter')?.addEventListener('change', () => loadSection('shipments-section'));
});

function loadSection(section) {
    if (section === 'dashboard-section') loadDashboard();
    if (section === 'shipments-section') loadShipments();
    if (section === 'customers-section') loadCustomers();
    if (section === 'employees-section') loadEmployees();
    if (section === 'warehouses-section') loadWarehouses();
    if (section === 'routes-section') loadRoutes();
    if (section === 'vehicles-section') loadVehicles();
    if (section === 'payments-section') loadPayments();
}

async function loadDashboard() {
    try {
        const stats = await apiCall('/admin/stats');
        document.getElementById('stat-customers').innerText = stats.totalCustomers || 0;
        document.getElementById('stat-shipments').innerText = stats.totalShipments || 0;
        document.getElementById('stat-revenue').innerText = formatCurrency(stats.totalRevenue || 0);
        document.getElementById('stat-employees').innerText = stats.activeEmployees || 0;

        // Render Chart
        const ctx = document.getElementById('statusChart');
        if (ctx) {
            // Check if chart exists to destroy it before re-rendering
            if (window.statusChartInstance) {
                window.statusChartInstance.destroy();
            }
            const data = stats.statusDistribution || { BOOKED: 0, IN_TRANSIT: 0, DELIVERED: 0 };
            window.statusChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(data),
                    datasets: [{
                        data: Object.values(data),
                        backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#6366f1']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadShipments() {
    showLoading('admin-shipments-container');
    const filter = document.getElementById('admin-shipment-filter').value;
    let url = '/shipments';
    if(filter) url += `?status=${filter}`;
    
    try {
        const data = await apiCall(url);
        const html = renderTable(
            ['ID', 'Tracking No', 'Customer ID', 'Assigned Agent', 'Date', 'Status', 'Actions'],
            data,
            (s) => {
                const id = s.id || s.SHIPMENT_ID;
                const cust = s.customerId || s.CUSTOMER_ID;
                const dt = s.createdAt || s.BOOKING_DATE;
                const st = s.status || s.CURRENT_STATUS;
                const agentId = s.agentId || s.AGENT_ID;
                const canAssign = st !== 'DELIVERED' && st !== 'CANCELLED';

                const agentBadge = agentId 
                    ? `<span class="badge blue"><i class="fas fa-motorcycle"></i> Agent #${agentId}</span>` 
                    : `<span class="badge" style="background:#e2e8f0; color:#475569;">Unassigned</span>`;

                return `
                <tr>
                    <td>${id}</td>
                    <td><strong>#${id}</strong></td>
                    <td>Customer #${cust}</td>
                    <td>${agentBadge}</td>
                    <td>${formatDate(dt)}</td>
                    <td>${getStatusBadge(st)}</td>
                    <td>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="btn btn-sm btn-primary" onclick="showShipmentDetails(${id})">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                            ${canAssign ? `
                            <button class="btn btn-sm btn-success" onclick="showAssignAgentModal(${id})">
                                <i class="fas fa-user-plus"></i> Assign Agent
                            </button>` : ''}
                            <a href="tracking.html?id=${id}" class="btn btn-sm btn-outline">
                                <i class="fas fa-location-arrow"></i> Track
                            </a>
                        </div>
                    </td>
                </tr>
            `;
            }
        );
        document.getElementById('admin-shipments-container').innerHTML = html;
    } catch (err) {
        document.getElementById('admin-shipments-container').innerHTML = '<p class="text-danger">Failed to load shipments</p>';
    }
}

async function loadCustomers() {
    showLoading('admin-customers-container');
    try {
        const data = await apiCall('/customers');
        const html = renderTable(
            ['ID', 'Name', 'Email', 'Phone', 'Address'],
            data,
            (c) => {
                const id = c.id || c.CUSTOMER_ID;
                const name = c.name || (c.User && c.User.name) || c.NAME || '-';
                const email = (c.User && c.User.email) || c.EMAIL || '-';
                const phone = c.phone || c.PHONE || '-';
                const addr = c.address || c.ADDRESS || '-';
                return `
                <tr>
                    <td>${id}</td>
                    <td>${name}</td>
                    <td>${email}</td>
                    <td>${phone}</td>
                    <td>${addr}</td>
                </tr>
            `;
            }
        );
        document.getElementById('admin-customers-container').innerHTML = html;
    } catch (err) {
        document.getElementById('admin-customers-container').innerHTML = '<p class="text-danger">Failed to load</p>';
    }
}

async function loadEmployees() {
    showLoading('admin-employees-container');
    try {
        const data = await apiCall('/employees');
        const html = renderTable(
            ['ID', 'Name', 'Email', 'Role', 'Status', 'Action'],
            data,
            (e) => {
                const id = e.id || e.EMPLOYEE_ID;
                const name = e.name || e.NAME;
                const email = e.email || e.EMAIL;
                const role = e.role || e.EMPLOYEE_TYPE;
                const active = e.isActive !== undefined ? e.isActive : true;
                return `
                <tr>
                    <td>${id}</td>
                    <td>${name}</td>
                    <td>${email}</td>
                    <td><span class="badge purple">${role}</span></td>
                    <td>${active ? '<span class="badge green">Active</span>' : '<span class="badge red">Inactive</span>'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="editEmployee(${id})"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `;
            }
        );
        document.getElementById('admin-employees-container').innerHTML = html;
    } catch (err) {
        document.getElementById('admin-employees-container').innerHTML = '<p class="text-danger">Failed to load</p>';
    }
}

function showEmployeeModal(emp = null) {
    const template = document.getElementById('employee-form-template');
    const content = template.content.cloneNode(true);
    
    showModal(emp ? 'Edit Employee' : 'Add Employee', content, async () => {
        const form = document.getElementById('employee-form');
        const payload = {
            name: form.querySelector('#emp-name').value,
            email: form.querySelector('#emp-email').value,
            role: form.querySelector('#emp-role').value,
            password: form.querySelector('#emp-password').value
        };
        if(!payload.password) delete payload.password; // Don't send empty password on edit
        
        if (payload.role === 'DELIVERY_AGENT') {
            payload.licenseNumber = form.querySelector('#emp-license').value;
            payload.vehicleId = parseInt(form.querySelector('#emp-vehicle').value);
        } else if (payload.role === 'WAREHOUSE_STAFF') {
            payload.warehouseId = parseInt(form.querySelector('#emp-warehouse').value);
        }
        
        try {
            if (emp) {
                await apiCall(`/employees/${emp.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                showToast('Employee updated', 'success');
            } else {
                await apiCall('/employees', { method: 'POST', body: JSON.stringify(payload) });
                showToast('Employee created', 'success');
            }
            loadEmployees();
        } catch(err) {
            showToast(err.message, 'error');
            throw err;
        }
    });

    // Populate data if editing
    if (emp) {
        document.getElementById('emp-id').value = emp.id;
        document.getElementById('emp-name').value = emp.name;
        document.getElementById('emp-email').value = emp.email;
        document.getElementById('emp-role').value = emp.role;
        // Need additional API call to get specific agent/staff details in real app
        toggleRoleFields();
    }
}

// Attach to window so modal HTML can use it
window.toggleRoleFields = function() {
    const role = document.getElementById('emp-role').value;
    document.querySelectorAll('.role-specific').forEach(el => el.classList.add('hidden'));
    if (role === 'DELIVERY_AGENT') document.getElementById('agent-fields').classList.remove('hidden');
    if (role === 'WAREHOUSE_STAFF') document.getElementById('warehouse-fields').classList.remove('hidden');
}

// Similarly implement Warehouse, Route, Vehicle CRUDs (omitted for brevity, follows same pattern)
async function loadWarehouses() {
    showLoading('admin-warehouses-container');
    try {
        const data = await apiCall('/warehouses');
        const html = renderTable(
            ['ID', 'Code', 'Location', 'Capacity', 'Action'],
            data,
            (w) => {
                const id = w.id || w.WAREHOUSE_ID;
                const code = w.warehouseCode || `WH-${id}`;
                const loc = w.locationName || `${w.WAREHOUSE_NAME || ''} (${w.LOCATION || ''})`.trim();
                const cap = w.capacity || w.CAPACITY;
                return `
                <tr>
                    <td>${id}</td>
                    <td><strong>${code}</strong></td>
                    <td>${loc}</td>
                    <td>${cap}</td>
                    <td>
                        <button class="btn btn-sm btn-outline"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `;
            }
        );
        document.getElementById('admin-warehouses-container').innerHTML = html;
    } catch (err) {
        document.getElementById('admin-warehouses-container').innerHTML = '<p class="text-danger">Failed to load</p>';
    }
}

function showWarehouseModal() {
    const template = document.getElementById('warehouse-form-template');
    const content = template.content.cloneNode(true);
    
    showModal('Add Warehouse', content, async () => {
        const form = document.getElementById('warehouse-form');
        const payload = {
            name: form.querySelector('#wh-name').value.trim(),
            location: form.querySelector('#wh-location').value.trim(),
            capacity: parseInt(form.querySelector('#wh-capacity').value) || 100,
            contact: form.querySelector('#wh-contact').value.trim() || '022-12345678'
        };
        try {
            await apiCall('/warehouses', { method: 'POST', body: JSON.stringify(payload) });
            showToast('Warehouse created successfully', 'success');
            loadWarehouses();
        } catch(err) {
            showToast(err.message, 'error');
            throw err;
        }
    });
}

async function loadPayments() {
    showLoading('admin-payments-container');
    try {
        const data = await apiCall('/admin/payments');
        const html = renderTable(
            ['ID', 'Shipment', 'Amount', 'Method', 'Status', 'Date'],
            data,
            (p) => {
                const id = p.id || p.PAYMENT_ID;
                const shipId = p.shipmentId || p.SHIPMENT_ID;
                const amt = p.amount !== undefined ? p.amount : p.AMOUNT;
                const method = p.paymentMethod || p.PAYMENT_METHOD;
                const status = p.status || p.PAYMENT_STATUS;
                const dt = p.createdAt || p.PAYMENT_DATE;
                return `
                <tr>
                    <td>${id}</td>
                    <td>#${shipId}</td>
                    <td>${formatCurrency(amt)}</td>
                    <td>${method}</td>
                    <td>${getPaymentBadge(status)}</td>
                    <td>${formatDate(dt)}</td>
                </tr>
            `;
            }
        );
        document.getElementById('admin-payments-container').innerHTML = html;
    } catch (err) {
        document.getElementById('admin-payments-container').innerHTML = '<p class="text-danger">Failed to load payments</p>';
    }
}

async function loadRoutes() {
    showLoading('admin-routes-container');
    try {
        const data = await apiCall('/admin/routes');
        const html = renderTable(
            ['ID', 'Source', 'Destination', 'Distance (km)', 'Est. Time (hrs)', 'Action'],
            data,
            (r) => {
                const id = r.id || r.ROUTE_ID;
                const src = r.source || r.SOURCE;
                const dest = r.destination || r.DESTINATION;
                const dist = r.distance || r.DISTANCE;
                const time = r.estimatedTime || r.ESTIMATED_TIME;
                return `
                <tr>
                    <td>${id}</td>
                    <td><strong>${src}</strong></td>
                    <td><strong>${dest}</strong></td>
                    <td>${dist} km</td>
                    <td>${time} hrs</td>
                    <td>
                        <button class="btn btn-sm btn-outline text-danger" onclick="deleteRoute(${id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            }
        );
        document.getElementById('admin-routes-container').innerHTML = html;
    } catch (err) {
        document.getElementById('admin-routes-container').innerHTML = '<p class="text-danger">Failed to load routes</p>';
    }
}

function showRouteModal() {
    const template = document.getElementById('route-form-template');
    const content = template.content.cloneNode(true);
    
    showModal('Add Route', content, async () => {
        const form = document.getElementById('route-form');
        const payload = {
            source: form.querySelector('#route-source').value.trim(),
            destination: form.querySelector('#route-destination').value.trim(),
            distance: parseFloat(form.querySelector('#route-distance').value) || 0,
            estimatedTime: parseFloat(form.querySelector('#route-time').value) || 0
        };
        try {
            await apiCall('/admin/routes', { method: 'POST', body: JSON.stringify(payload) });
            showToast('Route added successfully', 'success');
            loadRoutes();
        } catch(err) {
            showToast(err.message, 'error');
            throw err;
        }
    });
}

window.deleteRoute = function(id) {
    showModal('Delete Route', `<p>Are you sure you want to delete Route #${id}?</p>`, async () => {
        try {
            await apiCall(`/admin/routes/${id}`, { method: 'DELETE' });
            showToast('Route deleted successfully', 'success');
            loadRoutes();
        } catch(err) {
            showToast(err.message, 'error');
            throw err;
        }
    });
};

async function loadVehicles() {
    showLoading('admin-vehicles-container');
    try {
        const data = await apiCall('/admin/vehicles');
        const html = renderTable(
            ['ID', 'License Plate', 'Type', 'Capacity (kg)', 'Availability'],
            data,
            (v) => {
                const id = v.id || v.VEHICLE_ID;
                const num = v.vehicleNumber || v.VEHICLE_NUMBER;
                const type = v.vehicleType || v.VEHICLE_TYPE;
                const cap = v.capacity || v.CAPACITY;
                const avail = v.availability || v.AVAILABILITY || 'AVAILABLE';
                const badgeColor = avail === 'AVAILABLE' ? 'green' : (avail === 'IN_USE' ? 'amber' : 'red');
                return `
                <tr>
                    <td>${id}</td>
                    <td><strong>${num}</strong></td>
                    <td><span class="badge blue">${type}</span></td>
                    <td>${cap} kg</td>
                    <td><span class="badge ${badgeColor}">${avail}</span></td>
                </tr>
            `;
            }
        );
        document.getElementById('admin-vehicles-container').innerHTML = html;
    } catch (err) {
        document.getElementById('admin-vehicles-container').innerHTML = '<p class="text-danger">Failed to load vehicles</p>';
    }
}

function showVehicleModal() {
    const template = document.getElementById('vehicle-form-template');
    const content = template.content.cloneNode(true);
    
    showModal('Add Vehicle', content, async () => {
        const form = document.getElementById('vehicle-form');
        const payload = {
            number: form.querySelector('#veh-number').value.trim(),
            type: form.querySelector('#veh-type').value,
            capacity: parseFloat(form.querySelector('#veh-capacity').value) || 100
        };
        try {
            await apiCall('/admin/vehicles', { method: 'POST', body: JSON.stringify(payload) });
            showToast('Vehicle added successfully', 'success');
            loadVehicles();
        } catch(err) {
            showToast(err.message, 'error');
            throw err;
        }
    });
}

async function showShipmentDetails(id) {
    showModal('Shipment Details', `<div class="text-center" style="padding:20px;"><span class="spinner"></span> Loading shipment details...</div>`, null);
    
    try {
        const res = await apiCall(`/shipments/${id}`);
        const s = (res && res.data) ? (Array.isArray(res.data) ? res.data[0] : res.data) : res;
        
        const trackingNo = s.SHIPMENT_ID || s.id || id;
        const custId = s.CUSTOMER_ID || s.customerId;
        const st = s.CURRENT_STATUS || s.status || 'BOOKED';
        const type = s.DELIVERY_TYPE || s.deliveryType || 'STANDARD';
        const weight = s.WEIGHT || s.weight || '-';
        const bookingDate = s.BOOKING_DATE || s.createdAt;
        const estDelivery = s.ESTIMATED_DELIVERY || s.estimatedDelivery;
        const whId = s.WAREHOUSE_ID || s.warehouseId || '-';
        const routeId = s.ROUTE_ID || s.routeId || '-';
        const agentId = s.AGENT_ID || s.agentId;

        const content = `
            <div style="line-height: 1.8;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
                    <h3 style="margin: 0;">Shipment #${trackingNo}</h3>
                    ${getStatusBadge(st)}
                </div>
                
                <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <p class="text-muted" style="margin-bottom: 2px;">Customer</p>
                        <strong>Customer #${custId}</strong>
                    </div>
                    <div>
                        <p class="text-muted" style="margin-bottom: 2px;">Booking Date</p>
                        <strong>${formatDate(bookingDate)}</strong>
                    </div>
                    <div>
                        <p class="text-muted" style="margin-bottom: 2px;">Service Type</p>
                        <span class="badge blue">${type}</span>
                    </div>
                    <div>
                        <p class="text-muted" style="margin-bottom: 2px;">Weight</p>
                        <strong>${weight} kg</strong>
                    </div>
                    <div>
                        <p class="text-muted" style="margin-bottom: 2px;">Assigned Warehouse</p>
                        <strong>Warehouse #${whId}</strong>
                    </div>
                    <div>
                        <p class="text-muted" style="margin-bottom: 2px;">Transit Route</p>
                        <strong>Route #${routeId}</strong>
                    </div>
                </div>

                <div style="padding: 12px; background: var(--bg); border-radius: var(--radius); margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p class="text-muted" style="margin-bottom: 2px; font-size: 0.85rem;">Delivery Agent</p>
                            <strong>${agentId ? `<i class="fas fa-motorcycle"></i> Agent #${agentId}` : '<span style="color:var(--text-muted)">Not assigned yet</span>'}</strong>
                        </div>
                        ${(st !== 'DELIVERED' && st !== 'CANCELLED') ? `
                            <button class="btn btn-sm btn-success" onclick="closeModal(); showAssignAgentModal(${trackingNo});">
                                <i class="fas fa-user-plus"></i> ${agentId ? 'Change Agent' : 'Assign Agent'}
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div style="text-align: right; margin-top: 15px;">
                    <a href="tracking.html?id=${trackingNo}" class="btn btn-primary btn-sm">
                        <i class="fas fa-location-arrow"></i> View Live Tracking Timeline
                    </a>
                </div>
            </div>
        `;
        
        showModal(`Shipment #${trackingNo}`, content, null);
    } catch(err) {
        showModal('Shipment Details', `<p class="text-danger">Failed to load details: ${err.message}</p>`, null);
    }
}

async function showAssignAgentModal(shipmentId) {
    const template = document.getElementById('assign-agent-template');
    const content = template.content.cloneNode(true);
    
    showModal(`Assign Agent to Shipment #${shipmentId}`, content, async () => {
        const agentSelect = document.getElementById('assign-agent-select');
        const agentId = parseInt(agentSelect.value);
        if (!agentId) {
            showToast('Please select a delivery agent', 'error');
            throw new Error('No agent selected');
        }
        
        try {
            await apiCall('/deliveries/assign', {
                method: 'POST',
                body: JSON.stringify({ shipmentId, agentId })
            });
            showToast(`Shipment #${shipmentId} assigned to Agent #${agentId} successfully!`, 'success');
            loadShipments();
        } catch(err) {
            showToast(err.message, 'error');
            throw err;
        }
    });

    // Populate the dropdown with delivery agents
    try {
        const res = await apiCall('/employees');
        const employees = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        const agents = employees.filter(e => (e.EMPLOYEE_TYPE === 'DELIVERY_AGENT' || e.role === 'DELIVERY_AGENT'));
        
        const select = document.getElementById('assign-agent-select');
        if (agents.length === 0) {
            select.innerHTML = '<option value="">No delivery agents registered</option>';
        } else {
            select.innerHTML = '<option value="">-- Choose a Delivery Agent --</option>' + 
                agents.map(a => {
                    const id = a.EMPLOYEE_ID || a.id;
                    const name = a.NAME || a.name;
                    const phone = a.PHONE || a.phone || '';
                    return `<option value="${id}">${name} (ID: ${id}${phone ? `, Tel: ${phone}` : ''})</option>`;
                }).join('');
        }
    } catch(err) {
        const select = document.getElementById('assign-agent-select');
        if (select) select.innerHTML = '<option value="">Error loading agents</option>';
    }
}

// Global window exposure for inline onclick handlers
window.showShipmentDetails = showShipmentDetails;
window.showAssignAgentModal = showAssignAgentModal;
window.showWarehouseModal = showWarehouseModal;
window.showRouteModal = showRouteModal;
window.showVehicleModal = showVehicleModal;
window.showEmployeeModal = showEmployeeModal;


