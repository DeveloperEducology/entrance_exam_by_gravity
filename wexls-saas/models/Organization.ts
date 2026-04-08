import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
    name: string;
    subdomain?: string;
    logoUrl?: string;
    brandColor?: string;
    adminId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema({
    name: { type: String, required: true },
    subdomain: { type: String, unique: true, sparse: true },
    logoUrl: { type: String },
    brandColor: { type: String, default: '#7C3AED' }, // Brand Violet
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);
