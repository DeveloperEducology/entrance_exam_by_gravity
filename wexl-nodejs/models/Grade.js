const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const GradeSchema = new Schema(
    {
        name: { type: String, required: true },
        description: { type: String },
        sequence: { type: Number, default: 0 },
    },
    { timestamps: true } // Auto-manages createdAt and updatedAt
);

module.exports = mongoose.model('Grade', GradeSchema);
