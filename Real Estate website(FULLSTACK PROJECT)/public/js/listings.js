document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    const homeGrid = document.getElementById('property-grid');
    const favoritesGrid = document.getElementById('favorites-grid');
    const grid = homeGrid || favoritesGrid;
    const auth = document.getElementById('auth-buttons');
    const navigation = document.querySelector('.nav-links');
    const { escape: h } = Estate;
    const controls = {
        location: document.getElementById('location'),
        type: document.getElementById('type'),
        price: document.getElementById('price'),
        sort: document.getElementById('listing-sort'),
        resultCount: document.getElementById('listing-result-count'),
        clear: document.getElementById('clear-listing-filters'),
        quickFilters: Array.from(document.querySelectorAll('[data-quick-filter]'))
    };

    let favorites = new Set();
    let latestRequest = 0;
    let latestProperties = [];
    let activeQuickFilter = '';

    function updateAuth() {
        if (!auth) return;

        if (Estate.token('user')) {
            auth.innerHTML = `<span class="auth-greeting">Hello, ${h(localStorage.getItem('username') || 'Member')}</span><button class="btn auth-logout" id="user-logout" type="button">Logout</button>`;
            document.getElementById('user-logout').onclick = () => {
                Estate.clearSession('user');
                location.assign('/');
            };

            if (navigation && !document.getElementById('nav-fav')) {
                const link = document.createElement('a');
                link.id = 'nav-fav';
                link.href = '/favorites.html';
                link.textContent = 'Favorites';
                navigation.append(link);
            }
            return;
        }

        auth.innerHTML = '<a class="auth-login" href="/login.html">Log in</a><a href="/signup.html" class="btn auth-signup">Get started</a>';
    }

    function sortLabel() {
        switch (controls.sort?.value) {
            case 'price-low': return 'price: low to high';
            case 'price-high': return 'price: high to low';
            case 'newest': return 'newest first';
            default: return '';
        }
    }

    function updateResultCount(count, { loading = false, error = false } = {}) {
        if (!controls.resultCount) return;

        if (loading) {
            controls.resultCount.textContent = 'Loading homes…';
            return;
        }
        if (error) {
            controls.resultCount.textContent = 'Unable to load homes';
            return;
        }

        const noun = count === 1 ? 'home' : 'homes';
        const context = favoritesGrid ? ' saved' : ' available';
        const sorting = sortLabel();
        controls.resultCount.textContent = `${count} ${noun}${context}${sorting ? ` · ${sorting}` : ''}`;
    }

    function selectedType() {
        return controls.type?.value || activeQuickFilter;
    }

    function normaliseQuickFilter(value) {
        const filter = String(value || '').trim();
        return /^all$/i.test(filter) ? '' : filter;
    }

    function updateQuickFilterState() {
        const currentType = selectedType();
        controls.quickFilters.forEach(button => {
            const isActive = normaliseQuickFilter(button.dataset.quickFilter) === currentType;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    function filtersAreActive() {
        return Boolean(
            controls.location?.value.trim() ||
            selectedType() ||
            controls.price?.value ||
            (controls.sort && controls.sort.value !== 'recommended')
        );
    }

    function updateClearControl() {
        if (!controls.clear) return;
        const enabled = filtersAreActive();
        controls.clear.disabled = !enabled;
        controls.clear.setAttribute('aria-disabled', String(!enabled));
    }

    function propertyTimestamp(property) {
        const datedValue = Date.parse(property?.createdAt || property?.updatedAt || '');
        if (Number.isFinite(datedValue)) return datedValue;

        // Mongo ObjectIds embed their creation time in their first eight hexadecimal characters.
        const idPrefix = String(property?._id || '').slice(0, 8);
        const objectIdTime = Number.parseInt(idPrefix, 16);
        return Number.isFinite(objectIdTime) ? objectIdTime * 1000 : 0;
    }

    function listingPrice(property, fallback) {
        const value = Number(property?.price);
        return Number.isFinite(value) ? value : fallback;
    }

    function sortProperties(properties) {
        const sorted = [...properties];
        const title = property => String(property?.title || '');
        const alphabetically = (first, second) => title(first).localeCompare(title(second));

        switch (controls.sort?.value) {
            case 'price-low':
                return sorted.sort((first, second) => (
                    listingPrice(first, Number.MAX_SAFE_INTEGER) - listingPrice(second, Number.MAX_SAFE_INTEGER)
                ) || alphabetically(first, second));
            case 'price-high':
                return sorted.sort((first, second) => (
                    listingPrice(second, -1) - listingPrice(first, -1)
                ) || alphabetically(first, second));
            case 'newest':
                return sorted.sort((first, second) => (
                    propertyTimestamp(second) - propertyTimestamp(first)
                ) || alphabetically(first, second));
            default:
                // The API already supplies recommended listings in its preferred order.
                return sorted;
        }
    }

    function propertyFeature(value, icon, label) {
        const numericValue = Number(value);
        if (value === '' || value === null || value === undefined || !Number.isInteger(numericValue)) return '';
        return `<span class="feature property-card__feature" role="listitem"><i class="fas ${icon}" aria-hidden="true"></i><span>${h(numericValue)} ${label}</span></span>`;
    }

    function emptyFavorites() {
        latestProperties = [];
        updateResultCount(0);
        grid.innerHTML = `<section class="empty-state listing-state listing-state--empty" aria-labelledby="favorites-empty-title">
            <i class="far fa-heart" aria-hidden="true"></i>
            <div>
                <h3 id="favorites-empty-title">No favorites yet</h3>
                <p>Explore properties and save the ones you love.</p>
            </div>
            <a href="/" class="btn">Browse properties</a>
        </section>`;
    }

    function emptyListings() {
        updateResultCount(0);
        grid.innerHTML = `<section class="empty-state listing-state listing-state--empty" role="status">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <div>
                <h3>No homes found</h3>
                <p>Try broadening your location, home type, or budget.</p>
            </div>
        </section>`;
    }

    function render(properties) {
        const listings = sortProperties(properties.filter(Boolean));
        latestProperties = properties.filter(Boolean);
        grid.replaceChildren();
        updateResultCount(listings.length);

        if (!listings.length) {
            if (favoritesGrid) emptyFavorites();
            else emptyListings();
            return;
        }

        listings.forEach((property, index) => {
            const card = document.createElement('article');
            const id = String(property._id);
            const propertyUrl = `/property.html?id=${encodeURIComponent(id)}`;
            const isFavorite = favorites.has(id);
            const title = h(property.title || 'Untitled property');
            const location = h(property.location || 'Location available on request');
            const type = h(property.type || 'Home');
            const bedrooms = propertyFeature(property.beds, 'fa-bed', 'beds');
            const bathrooms = propertyFeature(property.baths, 'fa-bath', 'baths');
            const detailLabel = `View details for ${property.title || 'this property'}`;

            card.className = 'property-card property-listing-card';
            card.dataset.propertyId = id;
            card.dataset.propertyType = property.type || '';
            card.dataset.listingPosition = String(index + 1);
            card.classList.toggle('is-favorited', isFavorite);
            card.innerHTML = `<div class="property-card__media">
                <a class="property-card__image-link" href="${propertyUrl}" aria-label="${h(detailLabel)}">
                    <img src="${h(Estate.imageURL(property.image || property.images?.[0]))}" alt="${title}" class="card-image property-card__image" loading="lazy">
                </a>
                <button class="btn favorite-button property-card__favorite" type="button" aria-label="${isFavorite ? 'Remove from' : 'Add to'} favorites" aria-pressed="${isFavorite}" data-favorite-state="${isFavorite ? 'saved' : 'unsaved'}">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i><span class="sr-only">${isFavorite ? 'Remove from' : 'Add to'} favorites</span>
                </button>
            </div>
            <a class="card-content property-card__content" href="${propertyUrl}" aria-label="${h(detailLabel)}">
                <div class="property-card__price-row">
                    <p class="card-price property-card__price">${h(Estate.price(property.price))}</p>
                    <span class="badge property-card__badge">${type}</span>
                </div>
                <h3 class="card-title property-card__title">${title}</h3>
                <p class="card-location property-card__location"><i class="fas fa-map-marker-alt" aria-hidden="true"></i><span>${location}</span></p>
                <div class="card-features property-card__features" role="list" aria-label="Property features">${bedrooms}${bathrooms}</div>
                <span class="property-card__cta" aria-hidden="true">View home <i class="fas fa-arrow-up-right-from-square"></i></span>
            </a>`;

            card.querySelector('.favorite-button').addEventListener('click', async event => {
                const button = event.currentTarget;
                if (!Estate.token('user')) {
                    Estate.login('user');
                    return;
                }

                const remove = favorites.has(id);
                button.disabled = true;
                try {
                    await Estate.request(`/api/favorites/${encodeURIComponent(id)}`, { method: remove ? 'DELETE' : 'POST' }, 'user');
                    if (remove) favorites.delete(id); else favorites.add(id);

                    const nowFavorite = !remove;
                    card.classList.toggle('is-favorited', nowFavorite);
                    button.setAttribute('aria-pressed', String(nowFavorite));
                    button.setAttribute('aria-label', `${nowFavorite ? 'Remove from' : 'Add to'} favorites`);
                    button.dataset.favoriteState = nowFavorite ? 'saved' : 'unsaved';
                    button.querySelector('i').className = `${nowFavorite ? 'fas' : 'far'} fa-heart`;
                    button.querySelector('.sr-only').textContent = `${nowFavorite ? 'Remove from' : 'Add to'} favorites`;

                    if (favoritesGrid && remove) {
                        latestProperties = latestProperties.filter(item => String(item._id) !== id);
                        card.remove();
                        if (!grid.querySelector('.property-card')) emptyFavorites();
                        else updateResultCount(grid.querySelectorAll('.property-card').length);
                    }
                } catch (error) {
                    alert(error.message);
                } finally {
                    button.disabled = false;
                }
            });

            grid.append(card);
        });

        Estate.fixImages(grid);
    }

    async function loadProperties() {
        const requestId = ++latestRequest;
        const parameters = new URLSearchParams();
        const city = controls.location?.value.trim();
        const type = selectedType();
        const price = controls.price?.value;

        if (city) parameters.set('location', city);
        if (type) parameters.set('type', type);
        if (price) parameters.set('maxPrice', price);

        updateQuickFilterState();
        updateClearControl();
        updateResultCount(0, { loading: true });
        grid.innerHTML = '<section class="loading listing-state listing-state--loading" role="status"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>Loading homes…</span></section>';

        try {
            const properties = await Estate.request(`/api/properties?${parameters}`);
            if (requestId === latestRequest) render(properties);
        } catch (error) {
            if (requestId === latestRequest) {
                updateResultCount(0, { error: true });
                grid.innerHTML = `<section class="error listing-state listing-state--error" role="alert"><p>${h(error.message)}</p><button class="btn" id="retry-properties" type="button">Retry</button></section>`;
                document.getElementById('retry-properties').onclick = loadProperties;
            }
        }
    }

    function resetListingFilters() {
        if (controls.location) controls.location.value = '';
        if (controls.type) controls.type.value = '';
        if (controls.price) controls.price.value = '';
        if (controls.sort) controls.sort.value = 'recommended';
        activeQuickFilter = '';
        updateQuickFilterState();
        updateClearControl();
        loadProperties();
    }

    updateAuth();

    const contact = document.getElementById('contact-form');
    if (contact) Estate.bindContact(contact);
    if (!grid) return;

    if (favoritesGrid && !Estate.requireSession('user')) return;
    try {
        if (Estate.token('user')) {
            const properties = await Estate.request('/api/favorites', {}, 'user');
            favorites = new Set(properties.filter(Boolean).map(property => String(property._id)));
            if (favoritesGrid) render(properties.filter(Boolean));
        }
    } catch (error) {
        if (favoritesGrid) Estate.status(grid, error.message, true);
    } finally {
        if (favoritesGrid) document.getElementById('loading').style.display = 'none';
    }

    if (!homeGrid) return;

    let timer;
    document.getElementById('search-form')?.addEventListener('submit', event => {
        event.preventDefault();
        clearTimeout(timer);
        loadProperties();
    });
    controls.location?.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(loadProperties, 300);
    });
    controls.type?.addEventListener('change', () => {
        activeQuickFilter = controls.type.value;
        updateQuickFilterState();
        loadProperties();
    });
    controls.price?.addEventListener('change', loadProperties);
    controls.sort?.addEventListener('change', () => {
        updateClearControl();
        if (latestProperties.length) render(latestProperties);
        else updateResultCount(0);
    });
    controls.clear?.addEventListener('click', event => {
        event.preventDefault();
        resetListingFilters();
    });
    controls.quickFilters.forEach(button => {
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', event => {
            event.preventDefault();
            const filter = normaliseQuickFilter(button.dataset.quickFilter);
            activeQuickFilter = filter;

            if (controls.type) {
                const matchingOption = Array.from(controls.type.options).find(option => option.value === filter);
                controls.type.value = matchingOption ? matchingOption.value : '';
                activeQuickFilter = controls.type.value || filter;
            }

            updateQuickFilterState();
            loadProperties();
        });
    });

    updateQuickFilterState();
    updateClearControl();
    await loadProperties();
});
