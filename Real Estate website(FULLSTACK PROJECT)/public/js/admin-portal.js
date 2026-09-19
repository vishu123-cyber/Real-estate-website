document.addEventListener('DOMContentLoaded', () => {
    const { escape: h } = Estate;
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async event => {
            event.preventDefault();
            const button = loginForm.querySelector('button');
            if (button.disabled) return;
            button.disabled = true;
            button.textContent = 'Signing in...';
            try {
                const data = await Estate.request('/api/admin/login', {
                    method: 'POST',
                    ...Estate.json({
                        username: document.getElementById('username').value.trim(),
                        password: document.getElementById('password').value
                    })
                });
                if (!data.token) throw new Error(data.message || 'Login failed.');
                localStorage.setItem('adminToken', data.token);
                location.assign('/admin-dashboard.html');
            } catch (error) {
                Estate.status(document.getElementById('error-msg'), error.message, true);
            } finally {
                button.disabled = false;
                button.textContent = 'Login';
            }
        });
        return;
    }

    if (!Estate.requireSession('admin')) return;
    const request = (url, options = {}) => Estate.request(url, options, 'admin');
    const views = {
        properties: { path: '/api/properties', list: 'property-list', loading: 'loading-props', count: 'prop-count', label: 'Properties' },
        agents: { path: '/api/admin/agents', list: 'agent-list', loading: 'loading-agents', count: 'agent-count', label: 'Agents' },
        pending: { path: '/api/admin/pending-agents', list: 'pending-list', loading: 'loading-pending', count: 'pending-count', label: 'Pending' },
        messages: { path: '/api/admin/messages', list: 'message-list', loading: 'loading-messages', count: 'message-count', label: 'Inquiries' }
    };
    let currentView = 'properties';

    function renderProperty(property) {
        return `<div class="message-card"><div class="card-content-wrapper" style="display:flex;flex-direction:column;gap:1rem;align-items:flex-start;">
            <img src="${h(Estate.imageURL(property.image || property.images?.[0]))}" class="admin-prop-img" alt="${h(property.title)}">
            <div class="message-info"><h4>${h(property.title)}</h4><div class="message-meta">${h(Estate.price(property.price))} \u00B7 ${h(property.location)}</div>
            <p>Agent: ${h(property.agentId?.name || property.agentId?.username || 'Admin/System')}</p></div></div>
            <button class="delete-btn" data-action="delete" data-id="${h(property._id)}"><i class="fas fa-trash"></i> Delete</button></div>`;
    }

    function renderAgent(agent, pending) {
        const details = `${h(agent.phone || 'No phone')} \u00B7 ${h(agent.licenseNumber || 'No license')}`;
        const status = h(agent.status || 'unknown');
        const actions = pending
            ? `<p>${status}</p><div style="display:flex;gap:1rem;margin-top:1rem;"><button class="btn" data-action="approve" data-id="${h(agent._id)}">Approve</button><button class="delete-btn" data-action="reject" data-id="${h(agent._id)}">Reject</button></div>`
            : `<p>Status: ${status} \u00B7 ${h(agent.propertyCount ?? 0)} properties listed</p>`;
        return `<div class="message-card" style="flex-direction:column;align-items:stretch;"><div class="message-info"><h4>${h(agent.name || agent.username || 'Agent')}</h4>
            <div class="message-meta">${h(agent.email)}</div><div class="message-meta">${details}</div>${actions}</div></div>`;
    }

    function renderMessage(message) {
        const timestamp = Number.isNaN(new Date(message.timestamp).getTime()) ? 'Date unavailable' : new Date(message.timestamp).toLocaleString();
        return `<div class="message-card"><div class="message-info"><h4>${h(message.name)}</h4><div class="message-meta">${h(timestamp)} \u00B7 ${h(message.propertyId?.title || 'General inquiry / unavailable property')}</div>
            <p class="message-body" style="white-space:pre-wrap;overflow-wrap:anywhere;">${h(message.message)}</p><a href="mailto:${encodeURIComponent(message.email)}">Reply to ${h(message.email)}</a></div>
            <button class="delete-btn" data-action="delete-message" data-id="${h(message._id)}"><i class="fas fa-trash"></i> Delete</button></div>`;
    }

    async function load(view) {
        const config = views[view];
        const list = document.getElementById(config.list);
        const loading = document.getElementById(config.loading);
        list.replaceChildren();
        Estate.status(loading, 'Loading...');
        try {
            const rows = await request(config.path);
            document.getElementById(config.count).textContent = `${rows.length} ${config.label}`;
            list.innerHTML = rows.length
                ? rows.map(row => view === 'properties' ? renderProperty(row) : view === 'messages' ? renderMessage(row) : renderAgent(row, view === 'pending')).join('')
                : '<p class="empty-state" style="grid-column:1/-1;">Nothing here yet.</p>';
            loading.style.display = 'none';
            Estate.fixImages(list);
        } catch (error) {
            Estate.status(loading, error.message, true);
        }
    }

    Object.keys(views).forEach(view => {
        document.getElementById(`tab-${view}`).addEventListener('click', () => {
            currentView = view;
            Object.keys(views).forEach(key => {
                document.getElementById(`${key}-view`).style.display = key === view ? 'block' : 'none';
                document.getElementById(`tab-${key}`).className = key === view ? 'btn btn-fill' : 'logout-btn';
            });
            void load(view);
        });
    });

    document.querySelector('main').addEventListener('click', async event => {
        const button = event.target.closest('button[data-action]');
        if (!button || button.disabled) return;
        const { action, id } = button.dataset;
        const targets = {
            delete: { url: `/api/properties/${encodeURIComponent(id)}`, method: 'DELETE', confirmation: 'Delete this property? This cannot be undone.' },
            'delete-message': { url: `/api/admin/messages/${encodeURIComponent(id)}`, method: 'DELETE', confirmation: 'Delete this inquiry? This cannot be undone.' },
            approve: { url: `/api/admin/approve-agent/${encodeURIComponent(id)}`, method: 'PUT' },
            reject: { url: `/api/admin/reject-agent/${encodeURIComponent(id)}`, method: 'PUT', confirmation: 'Reject this agent registration?' }
        };
        const target = targets[action];
        if (!target) return;
        if (target.confirmation && !confirm(target.confirmation)) return;
        const buttons = button.closest('.message-card').querySelectorAll('button');
        buttons.forEach(item => { item.disabled = true; });
        try {
            await request(target.url, { method: target.method });
            await load(currentView);
        } catch (error) {
            alert(error.message);
        } finally {
            buttons.forEach(item => { item.disabled = false; });
        }
    });

    document.getElementById('logout-btn').onclick = () => {
        Estate.clearSession('admin');
        location.assign('/admin-login.html');
    };
    void load(currentView);
});
