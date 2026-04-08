import mongoose, { Schema, Document } from 'mongoose';

export interface IAttempt extends Document {
    orgId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    sessionId: mongoose.Types.ObjectId;
    questionId: mongoose.Types.ObjectId;
    microSkillId: mongoose.Types.ObjectId;
    isCorrect: boolean;
    userAnswer: any;
    correctAnswer: any;
    latencyMs: number; // Time spent on the question
    timestamp: Date;
}

const AttemptSchema: Schema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    microSkillId: { type: Schema.Types.ObjectId, ref: 'MicroSkill', required: true },
    isCorrect: { type: Boolean, required: true },
    userAnswer: { type: Schema.Types.Mixed },
    correctAnswer: { type: Schema.Types.Mixed },
    latencyMs: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for teacher dashboard historical analytics
AttemptSchema.index({ studentId: 1, microSkillId: 1, timestamp: -1 });
AttemptSchema.index({ orgId: 1, timestamp: -1 });

export default mongoose.models.Attempt || mongoose.model<IAttempt>('Attempt', AttemptSchema);
