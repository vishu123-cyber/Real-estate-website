const { port } = require('./config');
const http = require('http');

http.get(`http://localhost:${port}/api/properties`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const properties = JSON.parse(data);
            if (res.statusCode !== 200 || !Array.isArray(properties)) {
                throw new Error(properties.error || 'Server did not return a property list.');
            }
            console.log(`Fetched ${properties.length} properties.`);

            let hasCoordinates = true;
            let hasImages = true;

            properties.forEach(p => {
                if (p.coordinates && (!Number.isFinite(p.coordinates.lat) || !Number.isFinite(p.coordinates.lng))) {
                    console.error(`Invalid coordinates for property: ${p.title}`);
                    hasCoordinates = false;
                }
                if (!p.image && (!p.images || p.images.length === 0)) {
                    console.error(`Missing images for property: ${p.title}`);
                    hasImages = false;
                }
            });

            if (hasCoordinates && hasImages) {
                console.log("Listing data verified. Maps are optional.");
            } else {
                console.warn("Some listings need optional image or coordinate details completed.");
            }

        } catch (e) {
            console.error(e.message);
            process.exitCode = 1;
        }
    });
}).on('error', (err) => {
    console.error("Error: " + err.message);
    process.exitCode = 1;
});
