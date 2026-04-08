const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Load models
const Grade = require('./models/Grade');
const Subject = require('./models/Subject');
const Unit = require('./models/Unit');
const MicroSkill = require('./models/MicroSkill');
const Question = require('./models/Question');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB Connected for Seeding'))
    .catch(err => console.log(err));

const seedData = async () => {
    try {
        // Clear existing data
        await Grade.deleteMany({});
        await Subject.deleteMany({});
        await Unit.deleteMany({});
        await MicroSkill.deleteMany({});
        await Question.deleteMany({});

        console.log('Existing DB Structure Cleared.');

        // 1. Create Grade
        const grade = await Grade.create({
            name: 'Grade 10',
            description: 'High School - Grade 10',
            sequence: 10
        });

        // 2. Create Subject
        const subject = await Subject.create({
            grade_id: grade._id,
            name: 'Mathematics',
            description: 'Advanced Math Concepts',
            sequence: 1
        });

        // 3. Create Unit
        const unit = await Unit.create({
            subject_id: subject._id,
            name: 'Algebra II',
            description: 'Quadratics and Polynomials',
            sequence: 1
        });

        // 4. Create MicroSkill
        const microSkill = await MicroSkill.create({
            unit_id: unit._id,
            name: 'Solving Quadratic Equations',
            code: 'ALG-10-1',
            description: 'Using the quadratic formula',
            sequence: 1
        });

        // 5. Create Question
        const question = await Question.create({
            micro_skill_id: microSkill._id,
            type: 'multiple_choice',
            question_text: 'Solve for x: x^2 - 4 = 0',
            sub_topic: 'Equations',
            options: [
                { text: 'x = 2', isCorrect: false },
                { text: 'x = -2', isCorrect: false },
                { text: 'x = 2 or x = -2', isCorrect: true },
                { text: 'x = 4', isCorrect: false }
            ],
            correct_answer_index: '2',
            difficulty: 'medium',
            complexity: 5,
            marks: 2
        });

        console.log('Models Seeded Successfully!');
        console.log(`Grade -> Subject -> Unit -> MicroSkill -> Question hierarchy established.`);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedData();
