const mongoose = require("mongoose");
const Property = require("./models/Property");
//connects database
mongoose.connect("mongodb://127.0.0.1:27017/realestate")
    .then(async () => {
        console.log("MongoDB Connected");

        // Clear existing data
        await Property.deleteMany({});

        const sampleProperties = [
            {
                title: "Luxury Sea Facing Apartment",
                location: "Marine Drive, Mumbai",
                price: 150000000,
                type: "Apartment",
                description: "Experience the height of luxury in this stunning sea-facing apartment on Marine Drive. Featuring panoramic ocean views, floor-to-ceiling windows, and top-of-the-line Italian marble flooring. This 4-bedroom, 5-bath residence offers an open concept living area, perfect for entertaining.",
                agentContact: "Rajesh Sharma: +91 98765 43210",
                image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
                images: [
                    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
                    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
                    "https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?w=800"
                ],
                coordinates: { lat: 18.9438, lng: 72.8234 } // Mumbai
            },
            {
                title: "Modern Villa with Private Pool",
                location: "Whitefield, Bangalore",
                price: 85000000,
                type: "Villa",
                description: "Wake up to the sound of birds in this exquisite villa in a gated community. With a private swimming pool, landscaped garden, and modern architectural design, this is the ultimate luxury home. Features 5 bedrooms, 6 baths, and a spacious outdoor terrace.",
                agentContact: "Priya Venkatesh: +91 99887 76655",
                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
                images: [
                    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
                    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
                    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"
                ],
                coordinates: { lat: 12.9698, lng: 77.7499 } // Bangalore
            },
            {
                title: "Cozy Hill Station Cottage",
                location: "Ooty, Tamil Nadu",
                price: 35000000,
                type: "House",
                description: "This charming cottage offers a perfect retreat in the Nilgiris. Surrounded by tea gardens, it features a stone fireplace, wood beams, and a large deck. Ideal for summer vacations. 3 bedrooms, 2 baths.",
                agentContact: "Anand Kumar: +91 91234 56789",
                image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
                images: [
                    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
                    "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=800",
                    "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800"
                ],
                coordinates: { lat: 11.4100, lng: 76.6918 } // Ooty
            },
            {
                title: "High-Rise Apartment in Cyber City",
                location: "Gurgaon, Haryana",
                price: 55000000,
                type: "Apartment",
                description: "A stylish high-rise apartment in the heart of Cyber City. High ceilings, smart home automation, and club amenities define this premium space. Steps away from offices, malls, and metro. 3 bedrooms, 3 baths.",
                agentContact: "Vikram Singh: +91 98111 22233",
                image: "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800",
                images: [
                    "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800",
                    "https://images.unsplash.com/photo-1502005097973-f5424579c3d4?w=800",
                    "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"
                ],
                coordinates: { lat: 28.4908, lng: 77.0915 } // Gurgaon
            },
            {
                title: "Spacious Family Home",
                location: "Banjara Hills, Hyderabad",
                price: 120000000,
                type: "House",
                description: "A beautiful independent house in the prestigious Banjara Hills. This 5-bedroom home features a large backyard, a modern kitchen, home theater, and servant quarters. Close to top international schools.",
                agentContact: "Sania Mirza: +91 98444 55566",
                image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
                images: [
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
                    "https://images.unsplash.com/photo-1600607688969-95fb1e9fa6ca?w=800",
                    "https://images.unsplash.com/photo-1600566752355-d3e91122ab65?w=800"
                ],
                coordinates: { lat: 17.4126, lng: 78.4390 } // Hyderabad
            },
            {
                title: "Premium Sea View Condo",
                location: "Besant Nagar, Chennai",
                price: 45000000,
                type: "Condo",
                description: "Enjoy breathtaking sea views from this modern condo near Elliot's Beach. It offers secure living with amenities including a gym, party hall, and 24/7 power backup. 3 bedrooms, 3 baths.",
                agentContact: "Karthik Raja: +91 99444 33322",
                image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
                images: [
                    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800",
                    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800",
                    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800"
                ],
                coordinates: { lat: 12.9996, lng: 80.2693 } // Chennai
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

        await Property.insertMany(updatedProperties);
        console.log("Data Seeded");
        process.exit();
    })
    .catch(err => {
        console.log(err);
        process.exit(1);
    });
