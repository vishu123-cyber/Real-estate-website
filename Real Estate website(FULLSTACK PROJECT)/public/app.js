document.addEventListener('DOMContentLoaded', async () => {
    const propertyGrid = document.getElementById('property-grid');
    const searchForm = document.getElementById('search-form');

    // Auth & Favorites UI
    const authContainer = document.getElementById('auth-buttons');
    const navLinks = document.querySelector('.nav-links');

    let userFavorites = [];

    // Check Auth State
    function updateAuthUI() {
        const token = localStorage.getItem('userToken');
        const username = localStorage.getItem('username');

        if (!authContainer) return;

        if (token) {
            authContainer.innerHTML = `
                <span style="color: var(--text); margin-right: 1rem;">Hello, ${username}</span>
                <button onclick="logout()" class="btn" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Logout</button>
            `;

            // Add Favorites Link if not present
            if (navLinks && !document.getElementById('nav-fav')) {
                const favLink = document.createElement('a');
                favLink.id = 'nav-fav';
                favLink.href = 'favorites.html';
                favLink.textContent = 'Favorites';
                navLinks.appendChild(favLink);
            }
        } else {
            authContainer.innerHTML = `
                <a href="login.html" style="margin-right: 1rem; color: var(--text); font-weight: 500;">Log In</a>
                <a href="signup.html" class="btn">Sign Up</a>
            `;
        }
    }

    // Global Logout function
    window.logout = function () {
        localStorage.removeItem('userToken');
        localStorage.removeItem('username');
        window.location.href = '/';
    };

    // Global Toggle Favorite function
    window.toggleFavorite = async function (id, btn) {
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const isFav = userFavorites.includes(id);
        const method = isFav ? 'DELETE' : 'POST';
        const originalContent = btn.innerHTML; // Store icon state

        // Optimistic UI update
        const icon = btn.querySelector('i');
        if (isFav) {
            icon.classList.replace('fas', 'far'); // empty heart
            userFavorites = userFavorites.filter(favId => favId !== id);
        } else {
            icon.classList.replace('far', 'fas'); // full heart
            userFavorites.push(id);
        }

        try {
            const res = await fetch(`/api/favorites/${id}`, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to update favorite');

            // If on favorites page and removing, remove card
            if (window.location.pathname.includes('favorites.html') && isFav) {
                const card = btn.closest('.property-card');
                if (card) card.remove();
                if (document.querySelectorAll('.property-card').length === 0) {
                    location.reload();
                }
            }

        } catch (err) {
            console.error(err);
            btn.innerHTML = originalContent; // Revert
            alert('Error updating favorite');
        }
    };

    // Fetch User Favorites
    async function fetchUserFavorites() {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        try {
            const res = await fetch('/api/favorites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const favorites = await res.json();
                userFavorites = favorites.map(fav => typeof fav === 'object' ? fav._id : fav);
            }
        } catch (err) {
            console.error('Error fetching favorites:', err);
        }
    }

    // Fetch and Display Properties
    async function fetchProperties(filters = {}) {
        if (!propertyGrid) return;

        propertyGrid.innerHTML = '<div class="loading" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text);">Loading properties...</div>';

        try {
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`/api/properties?${queryParams}`);
            const properties = await response.json();

            propertyGrid.innerHTML = '';

            if (properties.length === 0) {
                propertyGrid.innerHTML = '<div class="no-results" style="grid-column: 1 / -1; color: var(--text); text-align: center; padding: 4rem 2rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">No properties found matching your criteria.</div>';
                return;
            }

            properties.forEach(property => {
                const isFav = userFavorites.includes(property._id);
                const heartClass = isFav ? 'fas' : 'far';

                const card = document.createElement('div');
                card.className = 'property-card';
                card.innerHTML = `
                    <div style="position: relative;">
                        <img src="${property.image}" alt="${property.title}" class="card-image" onerror="this.onerror=null; console.error('Image failed to load:', this.src); this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';">
                        <button onclick="event.stopPropagation(); window.toggleFavorite('${property._id}', this)" class="btn" style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem; min-width: auto; border:none; background: rgba(0,0,0,0.5); color: white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center;">
                            <i class="${heartClass} fa-heart"></i>
                        </button>
                    </div>
                    <div class="card-content" onclick="location.href='property.html?id=${property._id}'" style="cursor: pointer;">
                        <div class="card-price">₹${property.price.toLocaleString('en-IN')}</div>
                        <h3 class="card-title">${property.title}</h3>
                        <div class="card-location">
                            <i class="fas fa-map-marker-alt"></i> ${property.location}
                        </div>
                        <div class="card-features">
                            <span class="feature"><i class="fas fa-bed"></i> 4 Beds</span>
                            <span class="feature"><i class="fas fa-bath"></i> 3 Baths</span>
                            <span class="badge" style="margin-left:auto;">${property.type}</span>
                        </div>
                    </div>
                `;
                propertyGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Error fetching properties:', error);
            propertyGrid.innerHTML = '<div class="error" style="grid-column: 1 / -1; color: #ff6b6b; text-align: center; padding: 3rem; background: rgba(255, 107, 107, 0.05); border: 1px solid rgba(255, 107, 107, 0.2); border-radius: var(--radius-md);">Failed to load properties. Please try again later.</div>';
        }
    }

    // Initialize Scroll Observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Initial Load
    updateAuthUI();

    // Animate static elements
    const staticElements = document.querySelectorAll('.hero h1, .hero p, .search-container, .section-header');
    if (staticElements.length) {
        staticElements.forEach((el, index) => {
            el.classList.add('reveal');
            el.style.transitionDelay = `${index * 100}ms`;
            observer.observe(el);
        });
    }

    // Parallax Effect
    window.addEventListener('scroll', () => {
        const hero = document.querySelector('.hero');
        if (hero) {
            const scrolled = window.pageYOffset;
            hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
        }
    });

    await fetchUserFavorites();

    if (propertyGrid) {
        fetchProperties();
    }

    // Event Listeners
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            filterProperties();
        });
    }

    const searchInput = document.getElementById('location');
    const filterType = document.getElementById('type');
    const filterPrice = document.getElementById('price');

    if (searchInput) searchInput.addEventListener('input', () => setTimeout(filterProperties, 300));
    if (filterType) filterType.addEventListener('change', filterProperties);
    if (filterPrice) filterPrice.addEventListener('change', filterProperties);

    async function filterProperties() {
        const locationVal = searchInput?.value || '';
        const typeVal = filterType?.value || '';
        const priceVal = filterPrice?.value || '';
        
        let filters = {};
        if (locationVal) filters.location = locationVal;
        if (typeVal && typeVal !== 'all') filters.type = typeVal;
        if (priceVal) filters.maxPrice = priceVal;
        
        await fetchProperties(filters);
    }
    // Mobile Menu Logic
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-links');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
});
