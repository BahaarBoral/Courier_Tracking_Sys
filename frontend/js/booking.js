// js/booking.js

document.addEventListener('DOMContentLoaded', async () => {
    const user = requireAuth(['CUSTOMER']);
    if (!user) return;

    // Load routes from Oracle backend
    try {
        const resp = await apiCall('/routes');
        const routes = resp.data || resp;
        const routeSelect = document.getElementById('route');
        routeSelect.innerHTML = '<option value="">Select a route</option>';
        if (Array.isArray(routes)) {
            routes.forEach(r => {
                const id = r.ROUTE_ID || r.id;
                const source = r.SOURCE || r.source;
                const dest = r.DESTINATION || r.destination;
                const distance = r.DISTANCE || r.distance || 500;
                routeSelect.innerHTML += `<option value="${id}" data-distance="${distance}">${source} → ${dest} (${distance} km)</option>`;
            });
        }
    } catch (err) {
        showToast('Failed to load routes: ' + err.message, 'error');
    }

    // Cost estimation
    const formInputs = ['type', 'weight', 'route', 'delivery-type'];
    formInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', calculateCost);
            el.addEventListener('input', calculateCost);
        }
    });

    // Form submission
    const form = document.getElementById('booking-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const routeVal = document.getElementById('route').value;
        if (!routeVal) {
            showToast('Please select a route first', 'error');
            return;
        }

        const btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Processing Mock Payment & Booking...';
        
        const payload = {
            parcelType: document.getElementById('type').value,
            weight: parseFloat(document.getElementById('weight').value) || 1.0,
            length: parseFloat(document.getElementById('dim-l').value) || 10,
            width: parseFloat(document.getElementById('dim-w').value) || 10,
            height: parseFloat(document.getElementById('dim-h').value) || 10,
            fragile: document.getElementById('is-fragile').checked ? 'Y' : 'N',
            routeId: parseInt(routeVal),
            deliveryType: document.getElementById('delivery-type').value,
            paymentMethod: document.getElementById('payment-method').value
        };
        
        try {
            const result = await apiCall('/shipments', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            const shipmentId = result.data ? result.data.shipmentId : (result.shipmentId || result.id);
            const trackingId = result.data ? result.data.trackingId : (result.trackingId || shipmentId);
            const paymentId = result.data ? result.data.paymentId : null;
            
            // Auto-confirm mock/demo payment in Oracle database
            if (paymentId) {
                try {
                    await apiCall(`/payments/${paymentId}/process`, {
                        method: 'PUT',
                        body: JSON.stringify({ transactionId: `MOCK_TXN_${Date.now()}` })
                    });
                } catch(pe) {
                    console.log('Mock payment recorded or pending:', pe);
                }
            }

            showModal('Shipment Booked & Paid! (Mock Simulation)', 
                `<div>
                    <p class="text-success mb-20 text-center"><i class="fas fa-check-circle" style="font-size: 3.5rem; color: var(--success);"></i></p>
                    <p class="text-center" style="font-weight: 600; font-size: 1.1rem;">Your shipment was recorded in Oracle Database!</p>
                    <div style="background: var(--bg); padding: 15px; border-radius: var(--radius); margin: 20px 0; font-size: 0.95rem;">
                        <p><strong>Shipment ID:</strong> #${shipmentId}</p>
                        <p><strong>Tracking ID:</strong> #${trackingId}</p>
                        <p><strong>Payment Status:</strong> <span class="badge green">PAID (Demo Verified)</span></p>
                        <p><strong>Transaction Ref:</strong> MOCK_TXN_${Date.now().toString().slice(-6)}</p>
                    </div>
                    <p class="text-muted" style="font-size: 0.85rem; text-align: center;">Transaction recorded via Oracle PL/SQL stored procedures.</p>
                </div>`, 
                () => {
                    window.location.href = `tracking.html?id=${shipmentId}`;
                },
                'Track Package Now'
            );
        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-shield-alt"></i> Confirm & Mock Pay';
        }
    });
});

function calculateCost() {
    const weight = parseFloat(document.getElementById('weight').value) || 1.0;
    const routeSelect = document.getElementById('route');
    const routeOpt = routeSelect.options[routeSelect.selectedIndex];
    const distance = routeOpt && routeOpt.dataset.distance ? parseFloat(routeOpt.dataset.distance) : 500;
    
    const deliveryType = document.getElementById('delivery-type').value;
    let multiplier = 1.0;
    if (deliveryType === 'EXPRESS') multiplier = 1.5;
    if (deliveryType === 'OVERNIGHT') multiplier = 2.0;
    
    // Exact Oracle formula: (base_rate:50 + (weight * 10) + (distance * 2)) * multiplier
    if (routeSelect.value) {
        const cost = (50 + (weight * 10) + (distance * 2)) * multiplier;
        document.getElementById('cost-estimate').innerText = formatCurrency(cost);
    } else {
        document.getElementById('cost-estimate').innerText = '₹ 0.00';
    }
}
