import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    orgId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    microSkillId: mongoose.Types.ObjectId;
    currentTokens: number;
    currentStage: number; // 1, 2, or 3
    isCompleted: boolean;
    history: Array<string>; // List of Question IDs attempted
    correctCount: number;
    incorrectCount: number;
    startTime: Date;
    lastUpdateTime: Date;
}

const SessionSchema: Schema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    microSkillId: { type: Schema.Types.ObjectId, ref: 'MicroSkill', required: true },
    currentTokens: { type: Number, default: 0 },
    currentStage: { type: Number, default: 1 },
    isCompleted: { type: Boolean, default: false },
    history: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    correctCount: { type: Number, default: 0 },
    incorrectCount: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    lastUpdateTime: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for quick lookup of active session
SessionSchema.index({ studentId: 1, microSkillId: 1, isCompleted: 1 });

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
