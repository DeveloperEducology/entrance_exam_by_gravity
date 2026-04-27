const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wexls';

async function updateMapUrl() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.db.collection('questions').updateOne(
      { id: 'v3_plant_parts_001' },
      { 
        $set: { 
          mapUrl: 'https://pub-6d655d3564544704a2d99beb0760355e.r2.dev/1777269081129-q58e5t82j.png' 
        } 
      }
    );

    if (result.matchedCount > 0) {
      console.log('Successfully updated mapUrl for v3_plant_parts_001');
    } else {
      console.log('No question found with id: v3_plant_parts_001');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating mapUrl:', error);
    process.exit(1);
  }
}

updateMapUrl();
