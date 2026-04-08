import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ORG_ADMIN = 'ORG_ADMIN',
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT'
}

export interface IUser extends Document {
    name: string;
    email: string;
    image?: string;
    role: UserRole;
    orgId?: mongoose.Types.ObjectId;
    password?: string; // Hashed password if session based auth is used
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.STUDENT
    },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization' },
    password: { type: String, select: false },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
