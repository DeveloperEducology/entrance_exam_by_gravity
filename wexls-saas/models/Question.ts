import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
    orgId: mongoose.Types.ObjectId;
    microSkillId: mongoose.Types.ObjectId;
    type: string;
    parts: Array<any>;
    options?: Array<any>;
    solution?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    stage: number; // For the 1 -> 2 -> 3 adaptive progression
    correctAnswer?: any;
    createdAt: Date;
}

const QuestionSchema: Schema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    microSkillId: { type: Schema.Types.ObjectId, ref: 'MicroSkill', required: true },
    type: { type: String, required: true },
    parts: { type: [Schema.Types.Mixed], default: [] },
    options: { type: [Schema.Types.Mixed], default: [] },
    solution: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
    stage: { type: Number, default: 1 },
    correctAnswer: { type: Schema.Types.Mixed },
}, { timestamps: true });

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
