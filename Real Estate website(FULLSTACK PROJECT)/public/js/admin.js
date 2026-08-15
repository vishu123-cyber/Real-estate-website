document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const propertyList = document.getElementById('property-list');
    const logoutBtn = document.getElementById('logout-btn');

    // Login Logic
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-msg');

            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();

                if (data.success && data.token) {
                    localStorage.setItem('adminToken', data.token);
                    window.location.href = '/admin-dashboard.html';
                } else {
                    errorMsg.textContent = data.message || 'Login failed';
                    errorMsg.style.display = 'block';
                }
            } catch (err) {
                console.error(err);
                errorMsg.textContent = 'An error occurred. Please try again.';
                errorMsg.style.display = 'block';
            }
        });
    }



    // Dashboard Logic
    if (propertyList || document.getElementById('properties-view')) {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/admin-login.html';
            return;
        }

        // Tab Switching Logic
        const tabProps = document.getElementById('tab-properties');
        const tabAgents = document.getElementById('tab-agents');
        const tabPending = document.getElementById('tab-pending');
        const viewProps = document.getElementById('properties-view');
        const viewAgents = document.getElementById('agents-view');
        const viewPending = document.getElementById('pending-view');

        if (tabProps && tabAgents && tabPending) {
            tabProps.addEventListener('click', () => { 
                tabProps.className = 'btn btn-fill';
                tabAgents.className = 'logout-btn';
                tabPending.className = 'logout-btn';
                viewProps.style.display = 'block';
                viewAgents.style.display = 'none';
                viewPending.style.display = 'none';
                fetchProperties(token);
            });

            tabAgents.addEventListener('click', () => {
                tabAgents.className = 'btn btn-fill';
                tabProps.className = 'logout-btn';
                tabPending.className = 'logout-btn';
                viewAgents.style.display = 'block';
                viewProps.style.display = 'none';
                viewPending.style.display = 'none';
                fetchAgents(token);
            });

            tabPending.addEventListener('click', () => {
                tabPending.className = 'btn btn-fill';
                tabProps.className = 'logout-btn';
                tabAgents.className = 'logout-btn';
                viewPending.style.display = 'block';
                viewProps.style.display = 'none';
                viewAgents.style.display = 'none';
                fetchPendingAgents(token);
            });
        }

        fetchProperties(token);

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/admin-login.html';
        });
    }
});

async function fetchProperties(token) {
    const list = document.getElementById('property-list'); // Matches HTML ID
    const loading = document.getElementById('loading-props');
    const countBadge = document.getElementById('prop-count');

    try {
        const res = await fetch('/api/properties');
        const properties = await res.json();

        if (loading) loading.style.display = 'none';
        if (countBadge) countBadge.textContent = `${properties.length} Properties`;

        if (properties.length === 0) {
            list.innerHTML = '<div class="empty-state">No properties found.</div>';
            return;
        }

        list.innerHTML = properties.map(p => `
            <div class="message-card" id="prop-${p._id}">
                <div class="card-content-wrapper" style="display:flex; flex-direction:column; gap:1rem; align-items:flex-start;">
                    <img src="${p.image || 'https://via.placeholder.com/150'}" class="admin-prop-img">
                    <div class="message-info">
                        <h4 style="margin-bottom:0.2rem;">${p.title}</h4>
                        <div class="message-meta">
                            <span>₹${p.price?.toLocaleString('en-IN')}</span> &bull; 
                            <span>${p.location}</span>
                        </div>
                        <p style="color: #666; font-size: 0.8rem; margin-top: 0.2rem;">
                            Agent: ${p.agentId ? p.agentId.name || 'Unknown' : 'Admin/System'}
                        </p>
                    </div>
                </div>
                <button onclick="deleteProperty('${p._id}')" class="delete-btn" title="Delete Property">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        if (loading) loading.textContent = 'Error loading properties.';
    }
}

async function deleteProperty(id) {
    if (!confirm('Are you sure you want to remove this property? This cannot be undone.')) return;

    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`/api/properties/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const el = document.getElementById(`prop-${id}`);
            if (el) el.remove();

            // Update count
            const countBadge = document.getElementById('prop-count');
            if (countBadge && countBadge.textContent) {
                const currentCount = parseInt(countBadge.textContent.split(' ')[0]);
                countBadge.textContent = `${Math.max(0, currentCount - 1)} Properties`;
            }
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete property');
        }
    } catch (err) {
        console.error(err);
        alert('Error deleting property');
    }
}

async function fetchAgents(token) {
    const list = document.getElementById('agent-list');
    const loading = document.getElementById('loading-agents');
    const countBadge = document.getElementById('agent-count');

    try {
        if (loading) loading.style.display = 'block';
        list.innerHTML = '';
        
        const res = await fetch('/api/admin/agents', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const agents = await res.json();

        if (loading) loading.style.display = 'none';
        if (countBadge) countBadge.textContent = `${agents.length} Agents`;

        if (agents.length === 0) {
            list.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">No agents registered yet.</div>';
            return;
        }

        list.innerHTML = agents.map(agent => `
            <div class="message-card" style="flex-direction: column; align-items: flex-start; justify-content: flex-start;">
                <div class="message-info" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0;">${agent.name || 'No Name'}</h4>
                        
                    </div>
                    <div class="message-meta" style="color:var(--text); margin-bottom: 0.25rem;">
                        <i class="fas fa-envelope"></i> ${agent.email}
                    </div>
                    <div class="message-meta" style="color:var(--text); margin-bottom: 1rem;">
                        <i class="fas fa-phone"></i> ${agent.phone || ''} &bull; <i class="fas fa-id-card"></i> ${agent.licenseNumber || agent.license || 'No License'}
                    </div>
                    
                    <div style="padding-top: 1rem; border-top: 1px solid var(--glass-border); width: 100%;">
                        <span style="font-weight: 600; color: var(--text-heading);">${agent.propertyCount}</span> Properties Listed
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        if (loading) loading.textContent = 'Error loading agents.';
    }
}

async function fetchPendingAgents(token) {
    const list = document.getElementById('pending-list');
    const loading = document.getElementById('loading-pending');
    const countBadge = document.getElementById('pending-count');

    try {
        if (loading) loading.style.display = 'block';
        list.innerHTML = '';
        
        const res = await fetch('/api/admin/pending-agents', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const agents = await res.json();

        if (loading) loading.style.display = 'none';
        if (countBadge) countBadge.textContent = `${agents.length} Pending`;

        if (agents.length === 0) {
            list.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">No pending verifications.</div>';
            return;
        }

        list.innerHTML = agents.map(agent => `
            <div class="message-card" style="flex-direction: column; align-items: flex-start; justify-content: flex-start;" id="pending-${agent._id}">
                <div class="message-info" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h4 style="margin: 0;">${agent.name || 'No Name'}</h4>
                        <span class="badge">${agent.status}</span>
                    </div>
                    <div class="message-meta" style="color:var(--text); margin-bottom: 0.25rem;">
                        <i class="fas fa-envelope"></i> ${agent.email}
                    </div>
                    <div class="message-meta" style="color:var(--text); margin-bottom: 1rem;">
                        <i class="fas fa-phone"></i> ${agent.phone || ''} &bull; <i class="fas fa-id-card"></i> ${agent.licenseNumber || 'No License'}
                    </div>
                    
                    <div style="display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border); width: 100%;">
                        <button onclick="window.approveAgent('${agent._id}')" class="btn btn-fill" style="background: #2ecc71; flex: 1; border: none; padding: 0.5rem; justify-content: center; cursor: pointer; color: white; border-radius: 4px;">Approve</button>
                        <button onclick="window.rejectAgent('${agent._id}')" class="btn btn-fill" style="background: #e74c3c; flex: 1; border: none; padding: 0.5rem; justify-content: center; cursor: pointer; color: white; border-radius: 4px;">Reject</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        if (loading) loading.textContent = 'Error loading pending agents.';
    }
}

window.approveAgent = async function approveAgent(id) {
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`/api/admin/approve-agent/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchPendingAgents(token);
        } else {
            const data = await res.json();
            alert(data.error || data.message || 'Error approving agent');
        }
    } catch (err) {
        alert('Request failed');
    }
}

window.rejectAgent = async function rejectAgent(id) {
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`/api/admin/reject-agent/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            fetchPendingAgents(token);
        } else {
            const data = await res.json();
            alert(data.error || data.message || 'Error rejecting agent');
        }
    } catch (err) {
        alert('Request failed');
    }
}
