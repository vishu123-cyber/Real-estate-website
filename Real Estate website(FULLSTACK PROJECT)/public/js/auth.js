document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    if (!form) return;
    const isAgent = form.id.startsWith('agent-');
    const isSignup = form.id.includes('signup');
    const password = document.getElementById('password');
    password.autocomplete = isSignup ? 'new-password' : 'current-password';
    if (isSignup) password.minLength = 8;
    form.querySelectorAll('label').forEach(label => {
        const input = label.parentElement.querySelector('input');
        if (input) label.htmlFor = input.id;
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        if (button.disabled) return;
        const label = button.textContent;
        const output = document.getElementById('error-msg');
        const value = id => document.getElementById(id)?.value.trim();
        const body = { email: value('email'), password: password.value };
        if (isSignup) body.username = value('username');
        if (isAgent && isSignup) Object.assign(body, {
            role: 'agent', name: value('name'), phone: value('phone'), licenseNumber: value('license')
        });
        button.disabled = true;
        button.textContent = isSignup ? 'Creating account...' : 'Signing in...';
        output.style.display = 'none';
        let pending = false;
        try {
            const data = await Estate.request(`/api/auth/${isSignup ? 'signup' : 'login'}`, { method: 'POST', ...Estate.json(body) });
            if (data.isPending) {
                pending = true;
                form.reset();
                button.textContent = 'Registration submitted';
                Estate.status(output, data.message || 'Your registration is awaiting administrator approval. Sign in after approval.');
                return;
            }
            if (!data.token) throw new Error('The server did not return a login session. Please try signing in.');
            if (isAgent && data.role !== 'agent') throw new Error('An approved agent account is required. Use the regular login for a buyer account.');
            if (data.role === 'agent') {
                localStorage.setItem('agentToken', data.token);
                localStorage.setItem('agentName', data.username || 'Agent');
                if (data.agentIdString) localStorage.setItem('agentIdString', data.agentIdString);
                else localStorage.removeItem('agentIdString');
                location.assign('/agent-dashboard.html');
            } else if (data.role === 'admin') {
                localStorage.setItem('adminToken', data.token);
                location.assign('/admin-dashboard.html');
            } else {
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('username', data.username || 'Member');
                location.assign(Estate.returnPath('/'));
            }
        } catch (error) {
            Estate.status(output, error.message, true);
        } finally {
            if (!pending) { button.disabled = false; button.textContent = label; }
        }
    });
});
