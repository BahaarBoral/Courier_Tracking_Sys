// js/tracking.js

document.addEventListener('DOMContentLoaded', () => {
    // Check login state for nav button
    if (isLoggedIn()) {
        const user = getUser();
        const btn = document.getElementById('nav-btn');
        btn.innerText = 'Dashboard';
        btn.href = user.role === 'ADMIN' ? 'admin-dashboard.html' : 
                   user.role === 'CUSTOMER' ? 'customer-dashboard.html' : 
                   user.role === 'DELIVERY_AGENT' ? 'agent-dashboard.html' : 'warehouse-dashboard.html';
    }

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const trackingId = params.get('id');
    if (trackingId) {
        document.getElementById('tracking-id').value = trackingId;
        trackShipment(trackingId);
    }

    // Form submit
    document.getElementById('track-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('tracking-id').value.trim();
        if (id) {
            // Update URL without refresh
            window.history.pushState({}, '', `?id=${id}`);
            trackShipment(id);
        }
    });
});

async function trackShipment(trackingId) {
    const btn = document.querySelector('#track-form button');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tracking...';
    
    try {
        // Since we might not be logged in, we use a public endpoint if available, 
        // or just the generic apiCall (assuming backend allows public tracking)
        // If backend requires auth, we need to handle that, but typically tracking is public.
        
        // Fetch shipment details
        let trackingData = await apiCall(`/tracking/${trackingId}`);
        let history = Array.isArray(trackingData) ? trackingData : (trackingData.data || []);
        
        let shipment = null;
        try {
            const shipResp = await apiCall(`/shipments/${trackingId}`);
            shipment = shipResp.data || shipResp;
        } catch(e) {
            shipment = history[0] || {};
        }

        renderTrackingResult(shipment, history);
        document.getElementById('tracking-result').classList.remove('hidden');
        
    } catch (err) {
        showToast('Shipment not found or error tracking: ' + err.message, 'error');
        document.getElementById('tracking-result').classList.add('hidden');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> Track';
    }
}

function renderTrackingResult(shipment, history = []) {
    const trackingId = shipment.SHIPMENT_ID || shipment.Shipment_ID || shipment.trackingNumber || shipment.id || '-';
    const status = shipment.CURRENT_STATUS || shipment.Current_Status || shipment.STATUS || shipment.status || 'BOOKED';
    const bookingDate = shipment.BOOKING_DATE || shipment.Booking_Date || shipment.createdAt || new Date();
    const estDelivery = shipment.ESTIMATED_DELIVERY || shipment.Estimated_Delivery;
    const deliveryType = shipment.DELIVERY_TYPE || shipment.Delivery_Type || shipment.deliveryType || 'STANDARD';
    const weight = shipment.WEIGHT || shipment.Weight || shipment.weight;

    document.getElementById('det-tracking').innerText = '#' + trackingId;
    document.getElementById('det-from').innerText = shipment.SOURCE || shipment.Source || 'Origin Warehouse';
    document.getElementById('det-to').innerText = shipment.DESTINATION || shipment.Destination || 'Destination Address';
    document.getElementById('status-badge-container').innerHTML = getStatusBadge(status);
    
    document.getElementById('det-eta').innerText = estDelivery ? formatDate(estDelivery) : formatDate(new Date(Date.now() + 3*86400000));
    document.getElementById('det-type').innerText = shipment.PARCEL_TYPE || shipment.Parcel_Type || shipment.parcelType || 'PACKAGE';
    document.getElementById('det-weight').innerText = weight ? `${weight} kg` : '-';
    document.getElementById('det-service').innerText = deliveryType;

    // Render Timeline
    const timelineContainer = document.getElementById('timeline-container');
    
    if (!history || history.length === 0) {
        history = [
            { STATUS: status, UPDATE_TIME: bookingDate, CURRENT_LOCATION: 'Hub', REMARKS: 'Shipment recorded' }
        ];
    }

    // Sort by timestamp descending
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let html = '';
    history.forEach((event, index) => {
        // First item is current/active
        let statusClass = index === 0 ? 'active' : 'completed';
        
        const evStatus = event.STATUS || event.status || 'BOOKED';
        const evTime = event.UPDATE_TIME || event.Update_Time || event.timestamp || new Date();
        const evLoc = event.CURRENT_LOCATION || event.Current_Location || event.location || 'Hub';
        const evRemarks = event.REMARKS || event.Remarks || event.remarks || '';

        let icon = 'circle';
        if(evStatus === 'BOOKED') icon = 'clipboard-check';
        if(evStatus === 'WAREHOUSE_RECEIVED') icon = 'warehouse';
        if(evStatus === 'IN_TRANSIT') icon = 'truck';
        if(evStatus === 'OUT_FOR_DELIVERY') icon = 'motorcycle';
        if(evStatus === 'DELIVERED') icon = 'check-circle';
        if(evStatus === 'CANCELLED') icon = 'times-circle';

        html += `
            <div class="timeline-item ${statusClass}">
                <div class="timeline-icon"><i class="fas fa-${icon}"></i></div>
                <div class="timeline-content">
                    <div class="timeline-title">${evStatus.replace(/_/g, ' ')}</div>
                    <div class="timeline-time">${formatDateTime(evTime)} • ${evLoc}</div>
                    ${evRemarks ? `<div class="timeline-remarks">${evRemarks}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    timelineContainer.innerHTML = html;
}
