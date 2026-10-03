(() => {
    let map, marker;
    const lat = document.getElementById('prop-lat');
    const lng = document.getElementById('prop-lng');
    function sync() {
        const paired = Boolean(lat.value) === Boolean(lng.value);
        lat.setCustomValidity(paired ? '' : 'Choose a map pin or enter both latitude and longitude.');
        lng.setCustomValidity(paired ? '' : 'Choose a map pin or enter both latitude and longitude.');
        if (!map) return;
        if (marker) { marker.remove(); marker = null; }
        if (lat.value !== '' && lng.value !== '' && lat.validity.valid && lng.validity.valid) {
            const point = [Number(lat.value), Number(lng.value)];
            marker = L.marker(point).addTo(map);
            map.setView(point, 16);
        }
    }
    lat.addEventListener('input', sync);
    lng.addEventListener('input', sync);
    window.showPropertyMapPicker = () => {
        const element = document.getElementById('property-location-picker');
        if (!window.L) {
            element.textContent = 'Map could not load. Enter latitude and longitude above to set the property pin.';
            return;
        }
        if (!map) {
            map = L.map(element).setView([18.5204, 73.8567], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
            map.on('click', event => {
                lat.value = event.latlng.lat.toFixed(6);
                lng.value = event.latlng.lng.toFixed(6);
                sync();
            });
        }
        sync();
        requestAnimationFrame(() => map.invalidateSize());
    };
})();
