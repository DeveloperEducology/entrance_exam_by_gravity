const mongoose = require('mongoose');

const MONGO_URI = "mongodb://localhost:27017/ixl-questions"; // From server.js context

const gradeSchema = new mongoose.Schema({
    _id: String,
    id: String,
    name: String,
    is_active: { type: Boolean, default: true }
}, { strict: false });

const Grade = mongoose.model('Grade', gradeSchema, 'grades');

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');
        
        const allGrades = await Grade.find({}).lean();
        console.log(`Total grades: ${allGrades.length}`);
        
        const activeGrades = allGrades.filter(g => g.is_active === true);
        console.log(`Active grades (is_active === true): ${activeGrades.length}`);
        
        const inactiveGrades = allGrades.filter(g => g.is_active === false);
        console.log(`Inactive grades (is_active === false): ${inactiveGrades.length}`);
        
        const missingField = allGrades.filter(g => g.is_active === undefined);
        console.log(`Grades missing is_active field: ${missingField.length}`);

        if (allGrades.length > 0) {
            console.log('Sample grade:', allGrades[0]);
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
