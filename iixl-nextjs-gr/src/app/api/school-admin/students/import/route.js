import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req) {
    try {
        const text = await req.text();
        if (!text) {
            return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
        }

        const supabase = createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || user.role !== 'school_admin' || !user.school_id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const schoolId = String(user.school_id);

        await connectMongo();
        const db = mongoose.connection.db;

        // Parse simple CSV: Name, Email, Password, ClassID(Optional)
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const headersLine = lines[0].toLowerCase();

        // Remove headers if present (naive check)
        const startIndex = (headersLine.includes('name') && headersLine.includes('email')) ? 1 : 0;

        const validStudents = [];
        for (let i = startIndex; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim());
            if (row.length >= 3) {
                // simple validation
                validStudents.push({
                    name: row[0],
                    email: row[1],
                    password: row[2],
                    classId: row[3] || null
                });
            }
        }

        if (validStudents.length === 0) {
            return NextResponse.json({ error: 'No valid students found in CSV' }, { status: 400 });
        }

        // We should check license limit here
        const schoolObj = await db.collection('schools').findOne({ _id: new mongoose.Types.ObjectId(schoolId) });
        const licenseLimit = schoolObj?.licenseLimit || 500;
        const currentStudentCount = await db.collection('users').countDocuments({ role: 'student', school_id: schoolId });

        if (currentStudentCount + validStudents.length > licenseLimit) {
            return NextResponse.json({
                error: `License limit exceeded. You have ${licenseLimit - currentStudentCount} seats left, but uploaded ${validStudents.length} students.`
            }, { status: 403 });
        }

        const salt = await bcrypt.genSalt(10);
        const ops = [];
        const emails = validStudents.map(s => s.email.toLowerCase());

        // Ensure no duplicates in DB
        const existing = await db.collection('users').find({ email: { $in: emails } }).project({ email: 1 }).toArray();
        const existingEmails = new Set(existing.map(e => e.email));

        const newlyInsertedStudents = [];

        for (const s of validStudents) {
            if (existingEmails.has(s.email.toLowerCase())) continue;

            const password_hash = await bcrypt.hash(s.password, salt);
            const studentId = new mongoose.Types.ObjectId().toString(); // unique string ID

            // Insert user
            ops.push({
                insertOne: {
                    document: {
                        id: studentId,
                        name: s.name,
                        email: s.email.toLowerCase(),
                        password_hash,
                        role: 'student',
                        status: 'active',
                        school_id: schoolId,
                        created_at: new Date()
                    }
                }
            });

            if (s.classId) {
                // Add to class if provided
                const classObj = await db.collection('classes').findOne({ _id: new mongoose.Types.ObjectId(s.classId), school_id: schoolId });
                if (classObj) {
                    await db.collection('classes').updateOne(
                        { _id: classObj._id },
                        { $addToSet: { student_ids: studentId } }
                    );
                }
            }

            newlyInsertedStudents.push(studentId);
        }

        if (ops.length > 0) {
            await db.collection('users').bulkWrite(ops);
            // Re-fetch count after inserting
            return NextResponse.json({
                success: true,
                message: `Successfully imported ${ops.length} students. Skipped ${validStudents.length - ops.length} duplicates.`
            });
        } else {
            return NextResponse.json({ error: 'All students in CSV already exist' }, { status: 400 });
        }
    } catch (e) {
        console.error('CSV Import Error:', e);
        return NextResponse.json({ error: 'Internal Server Error during CSV import' }, { status: 500 });
    }
}
