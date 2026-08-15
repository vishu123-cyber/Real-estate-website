const http = require('http');

http.get('http://localhost:3000/api/properties', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const properties = JSON.parse(data);
            console.log(`Fetched ${properties.length} properties.`);

            let hasCoordinates = true;
            let hasImages = true;

            properties.forEach(p => {
                if (!p.coordinates || !p.coordinates.lat || !p.coordinates.lng) {
                    console.error(`Missing coordinates for property: ${p.title}`);
                    hasCoordinates = false;
                }
                if (!p.images || p.images.length === 0) {
                    console.error(`Missing images for property: ${p.title}`);
                    hasImages = false;
                }
            });

            if (hasCoordinates && hasImages) {
                console.log("All properties have valid coordinates and images.");
                console.log("Sample Coordinate:", properties[0].coordinates);
            } else {
                console.error("Data verification failed.");
            }

        } catch (e) {
            console.error(e.message);
        }
    });
}).on('error', (err) => {
    console.error("Error: " + err.message);
});
