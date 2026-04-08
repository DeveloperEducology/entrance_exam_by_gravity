import mongoose, { Schema, Document } from 'mongoose';

const BaseSchema = {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true },
    description: { type: String },
};

// --- GRADE ---
export interface IGrade extends Document { orgId: any; name: string; description?: string; index: number; }
const GradeSchema = new Schema({ ...BaseSchema, index: { type: Number, default: 0 } }, { timestamps: true });
export const Grade = mongoose.models.Grade || mongoose.model<IGrade>('Grade', GradeSchema);

// --- SUBJECT ---
export interface ISubject extends Document { orgId: any; gradeId: any; name: string; description?: string; color?: string; }
const SubjectSchema = new Schema({
    ...BaseSchema,
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    color: { type: String, default: '#7C3AED' }
}, { timestamps: true });
export const Subject = mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

// --- UNIT ---
export interface IUnit extends Document { orgId: any; subjectId: any; name: string; index: number; }
const UnitSchema = new Schema({
    ...BaseSchema,
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    index: { type: Number, default: 0 }
}, { timestamps: true });
export const Unit = mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema);

// --- MICROSKILL ---
export interface IMicroSkill extends Document { orgId: any; unitId: any; name: string; baseDifficulty: string; }
const MicroSkillSchema = new Schema({
    ...BaseSchema,
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    baseDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
}, { timestamps: true });
export const MicroSkill = mongoose.models.MicroSkill || mongoose.model<IMicroSkill>('MicroSkill', MicroSkillSchema);
