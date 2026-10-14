// js/customer.js

document.addEventListener('DOMContentLoaded', () => {
    const user = requireAuth(['CUSTOMER']);
    if (!user) return;

    // Navigation logic
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
            if (target === 'shipments-section') loadAllShipments();
            if (target === 'payments-section') loadPayments();
            if (target === 'profile-section') loadProfile();
        });
    });

    // Initial Load
    loadDashboard();

    // Setup filter
    document.getElementById('shipment-filter')?.addEventListener('change', loadAllShipments);
});

async function loadDashboard() {
    try {
        const stats = await apiCall('/customers/me/stats');
        document.getElementById('stat-total').innerText = stats.totalShipments || 0;
        document.getElementById('stat-active').innerText = stats.activeShipments || 0;
        document.getElementById('stat-delivered').innerText = stats.deliveredShipments || 0;
        document.getElementById('stat-payments').innerText = stats.pendingPayments || 0;

        const shipments = await apiCall('/customers/me/shipments?limit=5');
        
        const html = renderTable(
            ['Tracking ID', 'Status', 'Date', 'Type', 'Weight', 'Action'],
            shipments,
            (s) => {
                const id = s.SHIPMENT_ID || s.id || s.trackingNumber;
                const status = s.CURRENT_STATUS || s.status || 'BOOKED';
                const date = s.BOOKING_DATE || s.createdAt;
                const type = s.DELIVERY_TYPE || s.deliveryType || 'STANDARD';
                const weight = (s.WEIGHT !== undefined ? s.WEIGHT : s.weight) ? `${s.WEIGHT || s.weight} kg` : '-';
                return `
                <tr>
                    <td><strong>#${id}</strong></td>
                    <td>${getStatusBadge(status)}</td>
                    <td>${formatDate(date)}</td>
                    <td>${type}</td>
                    <td>${weight}</td>
                    <td>
                        <a href="tracking.html?id=${id}" class="btn btn-sm btn-outline">Track</a>
                    </td>
                </tr>
            `;
            }
        );
        document.getElementById('recent-shipments-container').innerHTML = html;
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('recent-shipments-container').innerHTML = '<p class="text-danger">Failed to load shipments.</p>';
    }
}

async function loadAllShipments() {
    showLoading('all-shipments-container');
    const filter = document.getElementById('shipment-filter').value;
    let url = '/customers/me/shipments';
    if(filter) url += `?status=${filter}`;
    
    try {
        const shipments = await apiCall(url);
        const html = renderTable(
            ['Tracking ID', 'Status', 'Date', 'Delivery Type', 'Weight', 'Action'],
            shipments,
            (s) => {
                const id = s.SHIPMENT_ID || s.id || s.trackingNumber;
                const status = s.CURRENT_STATUS || s.status || 'BOOKED';
                const date = s.BOOKING_DATE || s.createdAt;
                const type = s.DELIVERY_TYPE || s.deliveryType || 'STANDARD';
                const weight = (s.WEIGHT !== undefined ? s.WEIGHT : s.weight) ? `${s.WEIGHT || s.weight} kg` : '-';
                return `
                <tr>
                    <td><strong>#${id}</strong></td>
                    <td>${getStatusBadge(status)}</td>
                    <td>${formatDate(date)}</td>
                    <td>${type}</td>
                    <td>${weight}</td>
                    <td>
                        <a href="tracking.html?id=${id}" class="btn btn-sm btn-outline">Track</a>
                    </td>
                </tr>
            `;
            }
        );
        document.getElementById('all-shipments-container').innerHTML = html;
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('all-shipments-container').innerHTML = '<p class="text-danger">Failed to load shipments.</p>';
    }
}

async function loadPayments() {
    showLoading('payments-container');
    try {
        const payments = await apiCall('/customers/me/payments');
        const html = renderTable(
            ['Payment ID', 'Shipment Ref', 'Amount', 'Method', 'Date', 'Status'],
            payments,
            (p) => {
                const id = p.PAYMENT_ID || p.id;
                const shipmentId = p.SHIPMENT_ID || p.shipmentId;
                const amount = p.AMOUNT !== undefined ? p.AMOUNT : p.amount;
                const method = p.PAYMENT_METHOD || p.paymentMethod || 'N/A';
                const date = p.PAYMENT_DATE || p.createdAt;
                const status = p.PAYMENT_STATUS || p.status || 'PENDING';
                return `
                <tr>
                    <td>#${id}</td>
                    <td><strong>#${shipmentId}</strong></td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${method}</td>
                    <td>${formatDate(date)}</td>
                    <td>${getPaymentBadge(status)}</td>
                </tr>
            `;
            }
        );
        document.getElementById('payments-container').innerHTML = html;
    } catch (err) {
        showToast(err.message, 'error');
        document.getElementById('payments-container').innerHTML = '<p class="text-danger">Failed to load payments.</p>';
    }
}

async function loadProfile() {
    try {
        const res = await apiCall('/customers/me/profile');
        // API returns { success, data: { NAME, EMAIL, PHONE, ADDRESS } }
        const profile = (res && res.data) ? res.data : res;
        document.getElementById('prof-name').value = profile.NAME || profile.name || '';
        document.getElementById('prof-email').value = profile.EMAIL || profile.email || '';
        document.getElementById('prof-phone').value = profile.PHONE || profile.phone || '';
        document.getElementById('prof-address').value = profile.ADDRESS || profile.address || '';
        
        const form = document.getElementById('profile-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Updating...';
            
            try {
                await apiCall('/customers/me/profile', {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: document.getElementById('prof-name').value,
                        phone: document.getElementById('prof-phone').value,
                        address: document.getElementById('prof-address').value
                    })
                });
                showToast('Profile updated successfully', 'success');
                // Update local user info
                const u = getUser();
                u.name = document.getElementById('prof-name').value;
                localStorage.setItem('user', JSON.stringify(u));
                document.querySelectorAll('.user-name').forEach(el => el.innerText = u.name);
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerText = 'Update Profile';
            }
        };
    } catch (err) {
        showToast(err.message, 'error');
    }
}


function confirmDeleteAccount() {
    showModal('Delete Account', 
        '<p class="text-danger">Are you sure you want to delete your account? All your personal data will be permanently removed. This action cannot be undone.</p>',
        async () => {
            try {
                await apiCall('/customers/me/account', { method: 'DELETE' });
                showToast('Account deleted successfully', 'success');
                setTimeout(() => logout(), 1500);
            } catch (err) {
                showToast(err.message, 'error');
                throw err; // keep modal open on error
            }
        }, 
        'Yes, Delete My Account'
    );
}
