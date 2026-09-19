(() => {
    'use strict';
    const sessions = {
        user: ['userToken', 'username'],
        agent: ['agentToken', 'agentName', 'agentIdString'],
        admin: ['adminToken']
    };
    const loginPages = { user: '/login.html', agent: '/agent-login.html', admin: '/admin-login.html' };
    const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    function clearSession(role) {
        sessions[role].forEach(key => localStorage.removeItem(key));
    }
    function login(role) {
        const next = location.pathname + location.search;
        location.assign(`${loginPages[role]}?next=${encodeURIComponent(next)}`);
    }
    function token(role) {
        const value = localStorage.getItem(sessions[role][0]);
        if (!value || value === 'undefined' || value === 'null') return null;
        try {
            const payload = JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (!payload.exp || payload.exp * 1000 <= Date.now()) {
                clearSession(role);
                return null;
            }
        } catch {
            clearSession(role);
            return null;
        }
        return value;
    }
    function requireSession(role) {
        const value = token(role);
        if (!value) login(role);
        return value;
    }
    async function request(url, options = {}, role) {
        const headers = new Headers(options.headers);
        if (role) {
            const value = requireSession(role);
            if (!value) throw new Error('Please sign in to continue.');
            headers.set('Authorization', `Bearer ${value}`);
        }
        let response;
        try {
            response = await fetch(url, { ...options, headers });
        } catch {
            throw new Error('Unable to connect. Please check your connection and try again.');
        }
        const data = await response.json().catch(() => null);
        const revokedAgent = role === 'agent' && response.status === 403 && /not approved/i.test(data?.error || data?.message || '');
        if ((response.status === 401 || revokedAgent) && role) {
            clearSession(role);
            login(role);
            throw new Error(revokedAgent ? 'Your agent account is no longer approved. Please sign in again after contacting an administrator.' : 'Your session has expired. Please sign in again.');
        }
        if (!response.ok) {
            const message = data?.error || data?.message;
            throw new Error(typeof message === 'string' ? message : `Request failed (${response.status}). Please try again.`);
        }
        return data;
    }
    const json = body => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const price = value => Number.isFinite(Number(value)) ? `\u20B9${Number(value).toLocaleString('en-IN')}` : 'Price on request';
    const fallbackImage = '/logo.png';
    function imageURL(value) {
        try {
            const url = new URL(value || fallbackImage, location.origin);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : fallbackImage;
        } catch { return fallbackImage; }
    }
    function fixImages(root = document) {
        root.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', () => { img.src = fallbackImage; }, { once: true });
        });
    }
    function status(element, message, error = false) {
        element.textContent = message;
        element.style.display = 'block';
        element.style.color = error ? '#ff6b6b' : 'var(--text)';
        element.setAttribute('role', error ? 'alert' : 'status');
    }
    function returnPath(fallback = '/') {
        const next = new URLSearchParams(location.search).get('next');
        if (!next) return fallback;
        try {
            const target = new URL(next, location.origin);
            if (target.origin === location.origin && !/\/(?:agent-|admin-)?(?:login|signup)\.html$/.test(target.pathname)) {
                return target.pathname + target.search + target.hash;
            }
        } catch { /* Use the default destination for malformed links. */ }
        return fallback;
    }
    function bindContact(form, propertyId) {
        form.addEventListener('submit', async event => {
            event.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            if (button.disabled) return;
            const output = form.querySelector('[data-contact-status]');
            const name = form.elements.name.value.trim();
            const email = form.elements.email.value.trim();
            const message = form.elements.message.value.trim();
            if (!name || !email || !message) return status(output, 'Please fill in all fields.', true);
            button.disabled = true;
            status(output, 'Sending your message...');
            try {
                await request('/api/properties/messages', { method: 'POST', ...json({ name, email, message, ...(propertyId ? { propertyId } : {}) }) });
                form.reset();
                status(output, 'Message sent successfully. We will get back to you using your email.');
            } catch (error) {
                status(output, error.message, true);
            } finally { button.disabled = false; }
        });
    }
    function bindMobileNavigation() {
        const hamburger = document.querySelector('.hamburger');
        const navigation = document.querySelector('.nav-links');
        if (!hamburger || !navigation || hamburger.dataset.mobileNavBound) return;

        hamburger.dataset.mobileNavBound = 'true';
        if (!navigation.id) navigation.id = 'main-navigation';
        hamburger.setAttribute('aria-controls', navigation.id);

        const setOpen = open => {
            hamburger.classList.toggle('active', open);
            navigation.classList.toggle('active', open);
            hamburger.setAttribute('aria-expanded', String(open));
            hamburger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        };

        hamburger.addEventListener('click', () => setOpen(!navigation.classList.contains('active')));
        navigation.addEventListener('click', event => {
            if (event.target.closest('a')) setOpen(false);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && navigation.classList.contains('active')) {
                setOpen(false);
                hamburger.focus();
            }
        });
        window.addEventListener('resize', () => {
            if (window.matchMedia('(min-width: 64rem)').matches) setOpen(false);
        });
    }
    window.Estate = { escape, clearSession, login, token, requireSession, request, json, price, imageURL, fixImages, status, returnPath, bindContact, bindMobileNavigation };
    bindMobileNavigation();
})();
