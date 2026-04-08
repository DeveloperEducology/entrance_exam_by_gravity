const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubjectSchema = new Schema(
    {
        grade_id: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
        name: { type: String, required: true },
        description: { type: String },
        sequence: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Subject', SubjectSchema);
