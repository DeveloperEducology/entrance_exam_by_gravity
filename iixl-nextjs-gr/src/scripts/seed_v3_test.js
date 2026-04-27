const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wexls';

async function seedV3Question() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const microskillId = 'plant-parts-test';
    
    // 1. Create Microskill if not exists
    await mongoose.connection.db.collection('microskills').updateOne(
      { id: microskillId },
      { 
        $set: { 
          id: microskillId,
          name: 'Parts of a Plant',
          description: 'Identify the different parts of a flowering plant using an interactive diagram.',
          subject_id: 'science',
          grade_id: 'grade-3'
        } 
      },
      { upsert: true }
    );

    // 2. Create V3 Question
    const question = {
      id: 'v3_plant_parts_001',
      microskillId: microskillId,
      type: 'dragAndDropv3',
      parts: [
        { type: 'text', content: '### Interactive Diagram: Parts of a Plant' },
        { type: 'text', content: 'Drag each label to the correct arrow pointing to the plant part.' }
      ],
      mapUrl: '/images/plant-diagram.png',
      dragItems: [
        { id: 'flower', content: 'Flower', targetGroupId: 'zone-flower' },
        { id: 'leaf', content: 'Leaf', targetGroupId: 'zone-leaf' },
        { id: 'stem', content: 'Stem', targetGroupId: 'zone-stem' },
        { id: 'roots', content: 'Roots', targetGroupId: 'zone-roots' }
      ],
      dropGroups: [
        { id: 'zone-flower', x: 63, y: 14, label: 'Flower Area' },
        { id: 'zone-leaf', x: 75, y: 44, label: 'Leaf Area' },
        { id: 'zone-stem', x: 55, y: 63, label: 'Stem Area' },
        { id: 'zone-roots', x: 68, y: 88, label: 'Roots Area' }
      ],
      difficulty: 'easy',
      marks: 1,
      adaptiveConfig: {
        instantFeedback: true,
        showKeypad: false
      }
    };

    await mongoose.connection.db.collection('questions').updateOne(
      { id: question.id },
      { $set: question },
      { upsert: true }
    );

    console.log('Successfully seeded V3 test question');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding question:', error);
    process.exit(1);
  }
}

seedV3Question();
