// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Toggle password visibility
        const toggleBtn = document.getElementById('toggle-password');
        const passInput = document.getElementById('password');
        if (toggleBtn && passInput) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passInput.setAttribute('type', type);
                toggleBtn.classList.toggle('fa-eye');
                toggleBtn.classList.toggle('fa-eye-slash');
            });
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Logging in...';
            
            const email = document.getElementById('email').value;
            const password = passInput.value;
            
            try {
                const data = await apiCall('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                if (!data || !data.token) {
                    throw new Error(data && data.message ? data.message : 'Invalid email or password');
                }
                
                // Store token and user
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                showToast('Login successful! Redirecting...', 'success');
                
                // Redirect based on role
                setTimeout(() => {
                    const role = data.user.role;
                    if (role === 'ADMIN') window.location.href = 'admin-dashboard.html';
                    else if (role === 'CUSTOMER') window.location.href = 'customer-dashboard.html';
                    else if (role === 'DELIVERY_AGENT') window.location.href = 'agent-dashboard.html';
                    else if (role === 'WAREHOUSE_STAFF') window.location.href = 'warehouse-dashboard.html';
                    else window.location.href = 'index.html';
                }, 800);
                
            } catch (error) {
                showToast(error.message || 'Login failed. Please check your email and password.', 'error');
                btn.disabled = false;
                btn.innerText = 'Login';
            }
        });
    }

    // Global helper for demo credentials
    window.fillDemo = function(email) {
        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        if (emailInput && passInput) {
            emailInput.value = email;
            passInput.value = 'Demo@123';
            showToast(`Loaded ${email}`, 'info');
        }
    };

    // Register Form Handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        // Setup toggle buttons for registration
        const regToggle = document.getElementById('toggle-password');
        const regPass = document.getElementById('password');
        if (regToggle && regPass) {
            regToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const type = regPass.getAttribute('type') === 'password' ? 'text' : 'password';
                regPass.setAttribute('type', type);
                regToggle.classList.toggle('fa-eye');
                regToggle.classList.toggle('fa-eye-slash');
            });
        }

        const regConfirmToggle = document.getElementById('toggle-confirm-password');
        const regConfirmPass = document.getElementById('confirm-password');
        if (regConfirmToggle && regConfirmPass) {
            regConfirmToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const type = regConfirmPass.getAttribute('type') === 'password' ? 'text' : 'password';
                regConfirmPass.setAttribute('type', type);
                regConfirmToggle.classList.toggle('fa-eye');
                regConfirmToggle.classList.toggle('fa-eye-slash');
            });
        }
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const address = document.getElementById('address').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            if (password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            const btn = document.getElementById('register-btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span> Creating Account...';
            
            try {
                // Clear any prior stale session
                localStorage.clear();

                await apiCall('/auth/register', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, phone, address, password })
                });
                
                showToast('Registration successful! Redirecting to login...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1200);
                
            } catch (error) {
                let msg = error.message;
                if (msg.includes('Email already exists') || msg.includes('ORA-20001')) {
                    msg = 'Email already exists. Please login or use a different email.';
                }
                showToast(msg, 'error');
                btn.disabled = false;
                btn.innerText = 'Create Account';
            }
        });
    }
    
    // Redirect if already logged in (ONLY on login.html, allow registering freely)
    if (window.location.pathname.endsWith('login.html') && isLoggedIn()) {
        const user = getUser();
        if (user && user.role) {
            const role = user.role;
            if (role === 'ADMIN') window.location.href = 'admin-dashboard.html';
            else if (role === 'CUSTOMER') window.location.href = 'customer-dashboard.html';
            else if (role === 'DELIVERY_AGENT') window.location.href = 'agent-dashboard.html';
            else if (role === 'WAREHOUSE_STAFF') window.location.href = 'warehouse-dashboard.html';
        }
    }
});
