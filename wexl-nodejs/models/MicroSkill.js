const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MicroSkillSchema = new Schema(
    {
        unit_id: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
        name: { type: String, required: true },
        code: { type: String },
        description: { type: String },
        sequence: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('MicroSkill', MicroSkillSchema);
