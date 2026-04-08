const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const QuestionSchema = new Schema(
    {
        micro_skill_id: { type: Schema.Types.ObjectId, ref: 'MicroSkill', required: true },

        type: { type: String, required: true },
        question_text: { type: String },
        sub_topic: { type: String },

        // JSON mapped natively to Mixed or simply typed as Array/Object
        parts: { type: [Schema.Types.Mixed], default: [] },
        options: { type: [Schema.Types.Mixed], default: [] },
        solutionParts: { type: [Schema.Types.Mixed], default: [] },
        drag_groups: { type: [Schema.Types.Mixed], default: [] },
        drag_items: { type: [Schema.Types.Mixed], default: [] },
        adaptive_config: { type: Schema.Types.Mixed, default: {} },
        correct_answer_indices: { type: [Schema.Types.Mixed], default: [] },

        correct_answer_index: { type: String },
        correct_answer_text: { type: String },
        solution: { type: String },

        difficulty: { type: String },
        complexity: { type: Number },
        marks: { type: Number, default: 1 },

        is_multi_select: { type: Boolean, default: false },
        is_vertical: { type: Boolean, default: false },
        show_submit_button: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Question', QuestionSchema);
