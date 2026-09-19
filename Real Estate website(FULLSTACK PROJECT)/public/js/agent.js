document.addEventListener('DOMContentLoaded', () => {
    if (!Estate.requireSession('agent')) return;
    const { escape: h } = Estate;
    const form = document.getElementById('property-form');
    const modal = document.getElementById('property-modal');
    const files = document.getElementById('prop-file');
    const preview = document.getElementById('img-preview-container');
    const fileError = document.getElementById('img-error');
    const byId = id => document.getElementById(id);
    const name = localStorage.getItem('agentName') || 'Agent';
    const agentId = localStorage.getItem('agentIdString');
    byId('agent-name').textContent = agentId ? `${name} (${agentId})` : name;
    const request = (url, options = {}) => Estate.request(url, options, 'agent');
    form.querySelectorAll('label').forEach(label => {
        const input = label.parentElement.querySelector('input, select, textarea');
        if (input) label.htmlFor = input.id;
    });
    async function loadListings() {
        const container = byId('listings-list');
        Estate.status(container, 'Loading your listings...');
        try {
            const properties = await request('/api/agent/properties');
            container.innerHTML = properties.length ? properties.map(property => `<div class="listing-card">
                <img src="${h(Estate.imageURL(property.image || property.images?.[0]))}" class="listing-img" alt="${h(property.title)}">
                <div class="listing-info"><h4 style="margin-bottom:.5rem;font-size:1.1rem;">${h(property.title)}</h4>
                <p style="color:var(--secondary);margin-bottom:.5rem;">${h(Estate.price(property.price))}</p><p>${h(property.location)}</p></div>
                <div class="listing-actions"><button class="action-btn" data-edit="${h(property._id)}"><i class="fas fa-edit"></i> Edit</button>
                <button class="action-btn delete-btn" data-delete="${h(property._id)}"><i class="fas fa-trash"></i> Delete</button></div></div>`).join('') : '<p style="padding:2rem;text-align:center;">No properties found. Add your first listing!</p>';
            Estate.fixImages(container);
        } catch (error) { Estate.status(container, error.message, true); }
    }
    async function loadInquiries() {
        const container = byId('inquiries-list');
        Estate.status(container, 'Loading inquiries...');
        try {
            const messages = await request('/api/agent/messages');
            container.innerHTML = messages.length ? messages.map(message => `<div class="inquiry-card">
                <div style="display:flex;justify-content:space-between;margin-bottom:.5rem;"><h4>${h(message.name)}</h4><span>${h(new Date(message.timestamp).toLocaleDateString())}</span></div>
                <p style="color:var(--secondary);margin-bottom:.5rem;">Re: ${h(message.propertyId?.title || 'Deleted property')}</p>
                <p style="white-space:pre-wrap;overflow-wrap:anywhere;margin-bottom:.5rem;">${h(message.message)}</p>
                <a href="mailto:${encodeURIComponent(message.email)}" style="color:var(--secondary);">Reply to ${h(message.email)}</a></div>`).join('') : '<p style="padding:2rem;text-align:center;">No inquiries yet.</p>';
        } catch (error) { Estate.status(container, error.message, true); }
    }
    document.querySelectorAll('.menu-item[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.menu-item[data-tab]').forEach(item => item.classList.toggle('active', item === tab));
            const listings = tab.dataset.tab === 'listings';
            byId('listings-view').style.display = listings ? 'block' : 'none';
            byId('inquiries-view').style.display = listings ? 'none' : 'block';
            if (listings) loadListings(); else loadInquiries();
        });
    });
    byId('logout-btn').onclick = () => { Estate.clearSession('agent'); location.assign('/agent-login.html'); };
    function showPreview(sources) {
        preview.replaceChildren();
        preview.style.display = sources.length ? 'grid' : 'none';
        sources.forEach(source => {
            const image = document.createElement('img');
            image.src = source; image.alt = 'Property image preview';
            image.style.cssText = 'width:100%;height:100px;object-fit:cover;border-radius:var(--radius-sm);';
            preview.append(image);
        });
    }
    function resetForm() {
        form.reset(); byId('edit-id').value = ''; files.value = '';
        files.setCustomValidity(''); fileError.style.display = 'none';
        showPreview([]);
    }
    byId('add-property-btn').onclick = () => {
        resetForm(); byId('modal-title').textContent = 'Add New Property';
        files.required = true; modal.style.display = 'flex'; byId('prop-title').focus();
    };
    const closeModal = () => { modal.style.display = 'none'; };
    byId('cancel-modal').onclick = closeModal;
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
    function validFiles() {
        const selected = Array.from(files.files);
        let message = '';
        if (selected.length > 10) message = 'Choose no more than 10 images.';
        else if (selected.some(file => !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type))) message = 'Choose JPEG, PNG, WebP, or GIF images.';
        else if (selected.some(file => file.size > 5 * 1024 * 1024)) message = 'Each image must be 5 MB or smaller.';
        files.setCustomValidity(message);
        if (message) Estate.status(fileError, message, true); else fileError.style.display = 'none';
        return !message;
    }
    files.addEventListener('change', async () => {
        preview.replaceChildren();
        if (!validFiles()) return;
        const chosen = Array.from(files.files);
        const urls = await Promise.all(chosen.map(file => new Promise(resolve => {
            const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => resolve('/logo.png'); reader.readAsDataURL(file);
        })));
        showPreview(urls);
    });
    byId('listings-list').addEventListener('click', async event => {
        const button = event.target.closest('[data-edit], [data-delete]');
        if (!button || button.disabled) return;
        const id = button.dataset.edit || button.dataset.delete;
        if (button.dataset.delete && !confirm('Delete this property? This cannot be undone.')) return;
        button.disabled = true;
        try {
            if (button.dataset.delete) {
                await request(`/api/properties/${encodeURIComponent(id)}`, { method: 'DELETE' });
                await loadListings();
            } else {
                const property = await request(`/api/properties/${encodeURIComponent(id)}`);
                resetForm(); byId('modal-title').textContent = 'Edit Property';
                byId('edit-id').value = property._id;
                for (const [input, field] of Object.entries({ 'prop-title': 'title', 'prop-type': 'type', 'prop-price': 'price', 'prop-location': 'location', 'prop-desc': 'description', 'prop-beds': 'beds', 'prop-baths': 'baths' })) {
                    byId(input).value = property[field] ?? '';
                }
                files.required = false;
                showPreview((property.images?.length ? property.images : [property.image]).filter(Boolean).map(Estate.imageURL));
                modal.style.display = 'flex'; byId('prop-title').focus();
            }
        } catch (error) { alert(error.message); }
        finally { button.disabled = false; }
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        if (button.disabled || !validFiles()) return;
        const id = byId('edit-id').value;
        const body = new FormData();
        for (const [input, field] of Object.entries({ 'prop-title': 'title', 'prop-type': 'type', 'prop-price': 'price', 'prop-location': 'location', 'prop-desc': 'description', 'prop-beds': 'beds', 'prop-baths': 'baths' })) {
            const value = byId(input).value.trim();
            if (['beds', 'baths'].includes(field)) body.append(field, value || '0'); else body.append(field, value);
        }
        Array.from(files.files).forEach(file => body.append('images', file));
        button.disabled = true; button.textContent = 'Saving...';
        try {
            await request(id ? `/api/properties/${encodeURIComponent(id)}` : '/api/properties', { method: id ? 'PUT' : 'POST', body });
            closeModal(); await loadListings();
        } catch (error) { alert(error.message); }
        finally { button.disabled = false; button.textContent = 'Save Property'; }
    });
    loadListings();
});
