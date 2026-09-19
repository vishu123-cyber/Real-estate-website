document.addEventListener('DOMContentLoaded', async () => {
    const id = new URLSearchParams(location.search).get('id');
    const loading = document.getElementById('loading');
    if (!id) { Estate.status(loading, 'No property selected. Browse the properties from the home page.', true); return; }
    try {
        const property = await Estate.request(`/api/properties/${encodeURIComponent(id)}`);
        document.title = `${property.title} - LuxeEstate`;
        const set = (id, value) => { document.getElementById(id).textContent = value; };
        set('prop-title', property.title); set('prop-location', property.location);
        set('prop-type', property.type); set('prop-price', Estate.price(property.price));
        set('prop-desc', property.description || 'Contact the agent for more information.');
        for (const [id, value, label] of [['prop-beds', property.beds, 'Beds'], ['prop-baths', property.baths, 'Baths']]) {
            const feature = document.getElementById(id).closest('.feature');
            const numericValue = Number(value);
            const available = Number.isInteger(numericValue);
            feature.hidden = !available;
            if (available) set(id, `${numericValue} ${label}`);
        }
        const agent = property.agentId && typeof property.agentId === 'object' ? property.agentId : {};
        const agentName = typeof agent.name === 'string' ? agent.name.trim() : '';
        if (agentName) {
            set('agent-name', agentName);
            document.getElementById('agent-name-line').hidden = false;
        }
        set('agent-contact', property.agentContact || agent.phone || agent.email || 'Send an inquiry using the form above.');
        const locationLink = document.createElement('a');
        const coordinates = property.coordinates;
        const hasCoordinates = coordinates && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng);
        const destination = hasCoordinates ? `${coordinates.lat},${coordinates.lng}` : property.location;
        locationLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
        locationLink.target = '_blank'; locationLink.rel = 'noopener noreferrer';
        locationLink.className = 'map-location-link';
        locationLink.setAttribute('aria-label', `Open ${property.location} in Google Maps`);
        locationLink.textContent = property.location;
        document.getElementById('map-location-text').replaceChildren(locationLink);
        document.getElementById('property-map-fact').hidden = !hasCoordinates;
        document.getElementById('get-directions-btn').addEventListener('click', () => {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank', 'noopener,noreferrer');
        });

        const shareButton = document.getElementById('share-property-btn');
        const shareStatus = document.getElementById('share-status');
        const shareData = {
            title: `${property.title} | LuxeEstate`,
            text: `Take a look at ${property.title} in ${property.location}.`,
            url: window.location.href
        };
        const announceShare = message => {
            shareStatus.textContent = message;
            shareStatus.hidden = !message;
        };
        const copyPropertyLink = async () => {
            if (!navigator.clipboard?.writeText) {
                announceShare('Copy this page URL from your address bar to share this home.');
                return;
            }
            try {
                await navigator.clipboard.writeText(shareData.url);
                announceShare('Property link copied.');
            } catch {
                announceShare('Copy this page URL from your address bar to share this home.');
            }
        };
        shareButton.addEventListener('click', async () => {
            if (!navigator.share) {
                await copyPropertyLink();
                return;
            }
            try {
                await navigator.share(shareData);
                announceShare('Property link is ready to share.');
            } catch (error) {
                if (error?.name !== 'AbortError') await copyPropertyLink();
            }
        });

        const track = document.getElementById('carousel-track');
        const indicators = document.getElementById('carousel-indicators');
        const gallery = document.getElementById('property-gallery');
        const galleryPosition = document.getElementById('gallery-position');
        const images = Array.isArray(property.images) ? property.images.filter(Boolean) : [];
        if (!images.length && property.image) images.push(property.image);
        if (!images.length) images.push('');
        set('property-photo-count', `${images.length} ${images.length === 1 ? 'photo' : 'photos'}`);
        let current = 0;
        const update = () => {
            track.style.transform = `translateX(-${current * 100}%)`;
            galleryPosition.textContent = `${current + 1} of ${images.length}`;
            gallery.setAttribute('aria-label', `Property image gallery. Image ${current + 1} of ${images.length}.`);
            Array.from(indicators.querySelectorAll('.indicator')).forEach((button, index) => {
                button.classList.toggle('active', index === current);
                button.setAttribute('aria-current', String(index === current));
            });
        };
        images.forEach((source, index) => {
            const slide = document.createElement('div'); slide.className = 'carousel-slide';
            const image = document.createElement('img'); image.src = Estate.imageURL(source);
            image.alt = `${property.title} - image ${index + 1} of ${images.length}`;
            image.loading = index === 0 ? 'eager' : 'lazy';
            image.decoding = 'async';
            if (index === 0) image.fetchPriority = 'high';
            slide.append(image); track.append(slide);
            const button = document.createElement('button'); button.type = 'button'; button.className = 'indicator';
            button.setAttribute('aria-label', `Show image ${index + 1} of ${images.length}`);
            button.onclick = () => { current = index; update(); }; indicators.append(button);
        });
        const hasMultipleImages = images.length > 1;
        const move = increment => {
            current = (current + increment + images.length) % images.length;
            update();
        };
        [['nextBtn', 1], ['prevBtn', -1]].forEach(([id, increment]) => {
            const button = document.getElementById(id);
            button.disabled = !hasMultipleImages;
            button.hidden = !hasMultipleImages;
            button.setAttribute('aria-label', increment === 1 ? 'Next image' : 'Previous image');
            button.onclick = () => move(increment);
        });
        gallery.addEventListener('keydown', event => {
            if (event.target !== gallery || !hasMultipleImages) return;
            if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
            if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
        });
        update(); Estate.fixImages(track);
        Estate.bindContact(document.getElementById('property-contact-form'), id);
        loading.style.display = 'none';
        document.getElementById('property-content').style.display = 'block';
    } catch (error) { Estate.status(loading, error.message, true); }
});
