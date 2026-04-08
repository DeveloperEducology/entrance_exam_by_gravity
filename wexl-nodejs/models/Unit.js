const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UnitSchema = new Schema(
    {
        subject_id: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        name: { type: String, required: true },
        description: { type: String },
        sequence: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Unit', UnitSchema);
