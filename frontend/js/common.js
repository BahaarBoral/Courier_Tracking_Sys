// js/common.js
// Dynamically route to backend port 3000 if page is opened via VS Code Live Server (port 5500), file://, etc.
const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '3000')
  ? '/api'
  : 'http://localhost:3000/api';

// Create Toast Container
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
});

async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...options
  };
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = { message: text || (response.statusText || 'API Error') };
    }
    
    if (!response.ok) {
      // Only auto-redirect to login for 401 on protected pages, NOT on login/register themselves
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }
      const errMsg = (data && data.message) ? data.message : (response.status === 401 ? 'Invalid email or password' : 'API Error');
      throw new Error(errMsg);
    }
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to backend server. Make sure server is running on port 3000.');
    }
    throw error;
  }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info-circle';
    if(type === 'success') icon = 'check-circle';
    if(type === 'error') icon = 'exclamation-circle';
    if(type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        if(toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

function showModal(title, content, onConfirm, confirmText = 'Confirm') {
    let overlay = document.getElementById('common-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'common-modal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 id="modal-title"></h3>
                    <button class="modal-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" id="modal-body"></div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" id="modal-confirm"></button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    document.getElementById('modal-title').innerText = title;
    
    const bodyObj = document.getElementById('modal-body');
    if (typeof content === 'string') {
        bodyObj.innerHTML = content;
    } else {
        bodyObj.innerHTML = '';
        bodyObj.appendChild(content);
    }
    
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.innerText = confirmText;
    
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    if (onConfirm) {
        newConfirmBtn.style.display = 'inline-block';
        newConfirmBtn.addEventListener('click', async () => {
            const btn = newConfirmBtn;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Wait...';
            try {
                await onConfirm();
                closeModal();
            } catch(err) {
                btn.disabled = false;
                btn.innerText = confirmText;
            }
        });
    } else {
        newConfirmBtn.style.display = 'none';
    }
    
    overlay.classList.add('active');
}

function closeModal() {
    const overlay = document.getElementById('common-modal');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if(el) {
        el.dataset.original = el.innerHTML;
        el.innerHTML = '<div class="loading-overlay"><span class="spinner"></span></div>';
    }
}

function hideLoading(elementId) {
    const el = document.getElementById(elementId);
    if(el && el.dataset.original) {
        el.innerHTML = el.dataset.original;
    }
}

function formatDate(dateStr) {
    if(!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN');
}

function formatDateTime(dateStr) {
    if(!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN');
}

function getStatusBadge(status) {
    const map = {
        'BOOKED': 'blue',
        'WAREHOUSE_RECEIVED': 'purple',
        'IN_TRANSIT': 'amber',
        'OUT_FOR_DELIVERY': 'orange',
        'DELIVERED': 'green',
        'CANCELLED': 'red'
    };
    const color = map[status] || 'blue';
    const text = status.replace(/_/g, ' ');
    return `<span class="badge ${color}">${text}</span>`;
}

function getPaymentBadge(status) {
    const map = {
        'PENDING': 'amber',
        'PAID': 'green',
        'FAILED': 'red',
        'REFUNDED': 'blue'
    };
    const color = map[status] || 'amber';
    return `<span class="badge ${color}">${status}</span>`;
}

function getUser() {
    return JSON.parse(localStorage.getItem('user') || 'null');
}

function isLoggedIn() {
    return !!localStorage.getItem('token');
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function requireAuth(allowedRoles = []) {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return null;
    }
    const user = getUser();
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        window.location.href = 'login.html';
        return null;
    }
    
    // Update UI elements if present
    document.addEventListener('DOMContentLoaded', () => {
        const userNameEls = document.querySelectorAll('.user-name');
        userNameEls.forEach(el => el.innerText = user.name);
    });
    
    return user;
}

function renderTable(headers, rows, renderRow) {
    if (rows && !Array.isArray(rows)) {
        if (Array.isArray(rows.data)) {
            rows = rows.data;
        } else if (Array.isArray(rows.rows)) {
            rows = rows.rows;
        } else {
            rows = [];
        }
    }

    if (!rows || rows.length === 0) {
        return `<div class="text-center" style="padding: 20px; color: var(--text-muted);">No data available</div>`;
    }
    
    let html = `<div class="table-responsive"><table><thead><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;
    
    rows.forEach(row => {
        html += renderRow(row);
    });
    
    html += `</tbody></table></div>`;
    return html;
}

function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
