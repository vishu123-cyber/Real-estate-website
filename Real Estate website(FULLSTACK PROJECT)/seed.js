const { connectDatabase, disconnectDatabase } = require('./config/database');
const Property = require("./models/Property");
connectDatabase()
    .then(async () => {
        console.log("MongoDB Connected");

        const sampleProperties = [
            {
                title: "Bright Apartment in Koregaon Park",
                beds: 4, baths: 5,
                location: "Koregaon Park, Pune",
                price: 150000000,
                type: "Apartment",
                description: "Sample four-bedroom apartment with an open living area and room for a home office. Ask the listing agent for current availability and exact address.",
                agentContact: "Send an enquiry for contact details",
                image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
                images: [
                    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
                    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
                    "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?w=800"
                ],
                coordinates: { lat: 18.5362, lng: 73.8939 } // Approximate Koregaon Park area
            },
            {
                title: "Contemporary Villa in Baner",
                beds: 5, baths: 6,
                location: "Baner, Pune",
                price: 85000000,
                type: "Villa",
                description: "Sample family villa with generous indoor space, a garden and a terrace. Ask the listing agent for current availability and exact address.",
                agentContact: "Send an enquiry for contact details",
                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
                images: [
                    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
                    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
                    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"
                ],
                coordinates: { lat: 18.5590, lng: 73.7868 } // Approximate Baner area
            },
            {
                title: "Quiet Family Home in Kothrud",
                beds: 3, baths: 2,
                location: "Kothrud, Pune",
                price: 35000000,
                type: "House",
                description: "Sample three-bedroom home with a practical layout and a separate study. Ask the listing agent for current availability and exact address.",
                agentContact: "Send an enquiry for contact details",
                image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
                images: [
                    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
                    "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800",
                    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800"
                ],
                coordinates: { lat: 18.5074, lng: 73.8077 } // Approximate Kothrud area
            },
            {
                title: "City Apartment in Hinjawadi",
                beds: 3, baths: 3,
                location: "Hinjawadi, Pune",
                price: 55000000,
                type: "Apartment",
                description: "Sample apartment with three bedrooms and flexible living space. Ask the listing agent for current availability and exact address.",
                agentContact: "Send an enquiry for contact details",
                image: "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800",
                images: [
                    "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800",
                    "https://images.unsplash.com/photo-1502005097973-f5424579c3d4?w=800",
                    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"
                ],
                coordinates: { lat: 18.5913, lng: 73.7389 } // Approximate Hinjawadi area
            },
            {
                title: "Spacious Home in Hadapsar",
                beds: 5, baths: 4,
                location: "Hadapsar, Pune",
                price: 120000000,
                type: "House",
                description: "Sample five-bedroom home with space for a growing family and guests. Ask the listing agent for current availability and exact address.",
                agentContact: "Send an enquiry for contact details",
                image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
                images: [
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
                    "https://images.unsplash.com/photo-1600607688969-95fb1e9fa6ca?w=800",
                    "https://images.unsplash.com/photo-1600566752355-d3e91122ab65?w=800"
                ],
                coordinates: { lat: 18.5089, lng: 73.9260 } // Approximate Hadapsar area
            },
            {
                title: "Modern Condo in Viman Nagar",
                beds: 3, baths: 3,
                location: "Viman Nagar, Pune",
                price: 45000000,
                type: "Condo",
                description: "Sample three-bedroom condo with a modern floor plan. Ask the listing agent for current availability and exact address.",
                agentContact: "Send an enquiry for contact details",
                image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
                images: [
                    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
                    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800",
                    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800"
                ],
                coordinates: { lat: 18.5679, lng: 73.9143 } // Approximate Viman Nagar area
            }
        ];

        // Ensure all properties have valid images
        const updatedProperties = sampleProperties.map(prop => ({
            ...prop,
            image: prop.images[0] || prop.image || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
            images: prop.images.length > 0 ? prop.images : [
                prop.image || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
                "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"
            ]
        }));

        // Add missing samples only: never delete or overwrite existing listings.
        const result = await Property.bulkWrite(updatedProperties.map(property => ({
            updateOne: {
                filter: { title: property.title, location: property.location },
                update: { $setOnInsert: property },
                upsert: true
            }
        })));
        console.log(`Added ${result.upsertedCount} sample properties. Existing listings were preserved.`);
    })
    .catch(err => {
        console.error('Could not seed sample properties:', err.name);
        process.exitCode = 1;
    })
    .finally(disconnectDatabase);
