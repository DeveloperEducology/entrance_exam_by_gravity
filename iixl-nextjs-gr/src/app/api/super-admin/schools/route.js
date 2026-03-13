import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        await connectMongo();
        const db = mongoose.connection.db;

        // Fetch all schools
        const schools = await db.collection('schools').find().toArray();

        // Fetch all the school admins to map them to the schools
        const schoolAdmins = await db.collection('users').find({ role: 'school_admin' }).toArray();

        const formattedSchools = schools.map(school => {
            const admin = schoolAdmins.find(a => String(a._id) === String(school.admin_id));
            return {
                id: String(school._id),
                name: school.name,
                domain: school.domain,
                status: school.status || 'active',
                adminName: admin ? admin.name : 'Unknown',
                adminEmail: admin ? admin.email : 'Unknown',
                created_at: school.created_at
            };
        });

        return NextResponse.json({ schools: formattedSchools });
    } catch (e) {
        console.error('Fetch Schools Error:', e);
        return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { schoolName, schoolDomain, adminName, adminEmail, adminPassword } = await req.json();

        if (!schoolName || !adminName || !adminEmail || !adminPassword) {
            return NextResponse.json({ error: 'Missing required onboarding fields' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        // 1. Check if admin email already exists globally
        const existingUser = await db.collection('users').findOne({ email: adminEmail.trim().toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(adminPassword, salt);

        // 3. Create the School Document logic first (we need its ID)
        // Note: we'll create the user first actually, so the school can reference the admin,
        // and the admin can reference the school. Mutual ref.

        // Create a unique ObjectID for the school upfront
        const newSchoolId = new mongoose.Types.ObjectId();

        // 4. Create the School Admin User
        const userResult = await db.collection('users').insertOne({
            id: new mongoose.Types.ObjectId().toString(),
            name: adminName.trim(),
            email: adminEmail.trim().toLowerCase(),
            password_hash,
            role: 'school_admin',
            status: 'active',
            school_id: newSchoolId, // Stamp the user with the isolated school ID
            created_at: new Date()
        });

        // 5. Create the School Document
        const schoolResult = await db.collection('schools').insertOne({
            _id: newSchoolId,
            name: schoolName.trim(),
            domain: schoolDomain ? schoolDomain.trim().toLowerCase() : null,
            admin_id: userResult.insertedId,
            status: 'active',
            created_at: new Date()
        });

        return NextResponse.json({
            id: String(newSchoolId),
            name: schoolName,
            domain: schoolDomain,
            adminName,
            adminEmail,
            status: 'active'
        });

    } catch (e) {
        console.error('Create School Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
