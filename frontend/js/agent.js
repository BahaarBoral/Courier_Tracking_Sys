// js/agent.js

document.addEventListener('DOMContentLoaded', () => {
    const user = requireAuth(['DELIVERY_AGENT']);
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
            if (target === 'deliveries-section') loadDeliveries();
        });
    });

    loadDashboard();
    
    document.getElementById('agent-filter')?.addEventListener('change', loadDeliveries);
});

async function loadDashboard() {
    try {
        const stats = await apiCall('/agent/me/stats');
        document.getElementById('stat-assigned').innerText = stats.assigned || 0;
        document.getElementById('stat-transit').innerText = stats.inTransit || 0;
        document.getElementById('stat-delivered').innerText = stats.deliveredToday || 0;

        const deliveries = await apiCall('/agent/me/deliveries?active=true');
        
    const html = renderTable(
            ['Tracking No', 'Destination', 'Status', 'Action'],
            deliveries,
            (d) => `
                <tr>
                    <td><strong>#${d.trackingNumber || d.SHIPMENT_ID || d.id}</strong></td>
                    <td>${d.receiverAddress || d.destination || '-'}</td>
                    <td>${getStatusBadge(d.status || d.DELIVERY_STATUS)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="openDeliveryAction(${d.id}, ${d.trackingNumber || d.SHIPMENT_ID})">Action</button>
                    </td>
                </tr>
            `
        );
        document.getElementById('active-deliveries-container').innerHTML = html;
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('active-deliveries-container').innerHTML = '<p class="text-danger">Failed to load active deliveries.</p>';
    }
}

async function loadDeliveries() {
    showLoading('all-deliveries-container');
    const filter = document.getElementById('agent-filter').value;
    let url = '/agent/me/deliveries';
    if(filter) url += `?status=${filter}`;
    
    try {
        const deliveries = await apiCall(url);
        const html = renderTable(
            ['ID', 'Tracking No', 'Destination', 'Status', 'Action'],
            deliveries,
            (d) => `
                <tr>
                    <td>${d.id || d.DELIVERY_ID}</td>
                    <td><strong>#${d.trackingNumber || d.SHIPMENT_ID || '-'}</strong></td>
                    <td>${d.receiverAddress || d.destination || '-'}</td>
                    <td>${getStatusBadge(d.status || d.DELIVERY_STATUS)}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="openDeliveryAction(${d.id}, ${d.trackingNumber || d.SHIPMENT_ID})">View</button>
                    </td>
                </tr>
            `
        );
        document.getElementById('all-deliveries-container').innerHTML = html;
    } catch (err) {
        document.getElementById('all-deliveries-container').innerHTML = '<p class="text-danger">Failed to load deliveries.</p>';
    }
}

async function openDeliveryAction(deliveryId, shipmentId) {
    try {
        // Use shipmentId if provided; otherwise try deliveryId as shipment fallback
        const lookupId = shipmentId || deliveryId;
        const res = await apiCall(`/shipments/${lookupId}`);
        const shipment = (res && res.data) ? (Array.isArray(res.data) ? res.data[0] : res.data) : res;
        const status = shipment.CURRENT_STATUS || shipment.status || 'OUT_FOR_DELIVERY';
        const trackingNo = shipment.SHIPMENT_ID || shipment.id || lookupId;
        const receiverName = shipment.NAME || shipment.CUSTOMER_NAME || shipment.receiverName || 'Customer';
        const receiverPhone = shipment.PHONE || shipment.receiverPhone || '-';
        const receiverAddress = shipment.ADDRESS || shipment.receiverAddress || 'Local Destination';
        
        let actionsHtml = '';
        if (status === 'ASSIGNED' || status === 'WAREHOUSE_RECEIVED' || status === 'IN_TRANSIT') {
            actionsHtml = `<button class="btn btn-primary" onclick="updateStatus(${deliveryId}, 'OUT_FOR_DELIVERY')">Mark Out for Delivery</button>`;
        } else if (status === 'OUT_FOR_DELIVERY') {
            actionsHtml = `
                <div class="form-group text-left mt-20">
                    <label>Receiver Name / Signature</label>
                    <input type="text" id="receiver-sig" placeholder="Name of person receiving">
                </div>
                <button class="btn btn-success mt-10" onclick="markDelivered(${deliveryId})">Confirm Delivery</button>
            `;
        } else {
            actionsHtml = `<p class="text-muted">No actions available for status: ${status}</p>`;
        }

        const content = `
            <div class="mb-20">
                <p><strong>Tracking No:</strong> #${trackingNo}</p>
                <p><strong>Receiver:</strong> ${receiverName} (${receiverPhone})</p>
                <p><strong>Address:</strong> ${receiverAddress}</p>
                <p><strong>Current Status:</strong> ${getStatusBadge(status)}</p>
            </div>
            <hr style="border:0; border-top:1px solid var(--border); margin:15px 0;">
            <div class="text-center">
                ${actionsHtml}
            </div>
        `;
        
        showModal('Delivery Action', content, null);
    } catch(err) {
        showToast(err.message, 'error');
    }
}


window.updateStatus = async function(id, status) {
    try {
        await apiCall(`/agent/deliveries/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, remarks: `Status updated to ${status} by agent` })
        });
        showToast('Status updated', 'success');
        closeModal();
        loadDashboard();
        if(!document.getElementById('deliveries-section').classList.contains('hidden')) {
            loadDeliveries();
        }
    } catch(err) {
        showToast(err.message, 'error');
    }
}

window.markDelivered = async function(id) {
    const sig = document.getElementById('receiver-sig').value;
    if(!sig) {
        showToast('Please enter receiver name', 'error');
        return;
    }
    
    try {
        await apiCall(`/agent/deliveries/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'DELIVERED', remarks: `Delivered to: ${sig}` })
        });
        showToast('Delivery marked as successful!', 'success');
        closeModal();
        loadDashboard();
        if(!document.getElementById('deliveries-section').classList.contains('hidden')) {
            loadDeliveries();
        }
    } catch(err) {
        showToast(err.message, 'error');
    }
}
