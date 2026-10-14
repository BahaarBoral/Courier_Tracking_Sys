// js/warehouse.js

document.addEventListener('DOMContentLoaded', () => {
    const user = requireAuth(['WAREHOUSE_STAFF']);
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

            if (target === 'dashboard-section') loadDashboard();
            if (target === 'incoming-section') loadIncoming();
            if (target === 'dispatch-section') loadDispatch();
        });
    });

    loadDashboard();
});

async function loadDashboard() {
    try {
        const stats = await apiCall('/warehouse/me/stats');
        
        document.getElementById('wh-name').innerText = stats.warehouse.locationName || 'Main Warehouse';
        document.getElementById('wh-code').innerText = stats.warehouse.warehouseCode || 'WH001';
        
        document.getElementById('stat-inventory').innerText = stats.currentInventory || 0;
        document.getElementById('stat-incoming').innerText = stats.expectedIncoming || 0;
        document.getElementById('stat-dispatch').innerText = stats.readyForDispatch || 0;
        
        const capacity = stats.warehouse.capacity || 1000;
        const inventory = stats.currentInventory || 0;
        const usage = Math.min(Math.round((inventory / capacity) * 100), 100);
        
        document.getElementById('capacity-text').innerText = `${usage}% (${inventory}/${capacity})`;
        const bar = document.getElementById('capacity-bar');
        bar.style.width = `${usage}%`;
        
        if (usage > 90) bar.style.backgroundColor = 'var(--danger)';
        else if (usage > 75) bar.style.backgroundColor = 'var(--warning)';
        else bar.style.backgroundColor = 'var(--success)';
        
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function loadIncoming() {
    showLoading('incoming-container');
    try {
        const shipments = await apiCall('/warehouse/me/incoming');
        const html = renderTable(
            ['Tracking No', 'From', 'Expected', 'Action'],
            shipments,
            (s) => {
                const id = s.id || s.SHIPMENT_ID;
                const addr = s.senderAddress || s.customerName || 'N/A';
                const dt = s.createdAt || s.BOOKING_DATE;
                return `
                <tr>
                    <td><strong>#${id}</strong></td>
                    <td>${addr}</td>
                    <td>${formatDate(dt)}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="receiveShipment(${id})">
                            <i class="fas fa-check"></i> Receive
                        </button>
                    </td>
                </tr>
            `;
            }
        );
        document.getElementById('incoming-container').innerHTML = html;
    } catch (err) {
        document.getElementById('incoming-container').innerHTML = '<p class="text-danger">Failed to load</p>';
    }
}

async function loadDispatch() {
    showLoading('dispatch-container');
    try {
        const shipments = await apiCall('/warehouse/me/dispatch');
        const html = renderTable(
            ['Tracking No', 'Destination', 'Received On', 'Action'],
            shipments,
            (s) => {
                const id = s.id || s.SHIPMENT_ID;
                const dest = s.receiverAddress || s.destination || 'In Facility';
                const dt = s.updatedAt || s.BOOKING_DATE;
                return `
                <tr>
                    <td><strong>#${id}</strong></td>
                    <td>${dest}</td>
                    <td>${formatDate(dt)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="dispatchShipment(${id})">
                            <i class="fas fa-truck"></i> Dispatch
                        </button>
                    </td>
                </tr>
            `;
            }
        );
        document.getElementById('dispatch-container').innerHTML = html;
    } catch (err) {
        document.getElementById('dispatch-container').innerHTML = '<p class="text-danger">Failed to load</p>';
    }
}

window.receiveShipment = function(id) {
    showModal('Receive Shipment', 
        '<p>Are you sure you want to mark this shipment as received at this warehouse?</p>',
        async () => {
            try {
                await apiCall(`/warehouse/shipments/${id}/receive`, { method: 'PUT' });
                showToast('Shipment received successfully', 'success');
                loadIncoming();
            } catch(err) {
                showToast(err.message, 'error');
                throw err;
            }
        }
    );
};

window.dispatchShipment = function(id) {
    showModal('Dispatch Shipment', 
        '<p>Are you sure you want to dispatch this shipment? Status will change to IN_TRANSIT.</p>',
        async () => {
            try {
                await apiCall(`/warehouse/shipments/${id}/dispatch`, { method: 'PUT' });
                showToast('Shipment dispatched successfully', 'success');
                loadDispatch();
            } catch(err) {
                showToast(err.message, 'error');
                throw err;
            }
        }
    );
};
