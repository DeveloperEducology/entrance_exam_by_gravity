import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/db/mongo';

export async function GET(req) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        await connectMongo();
        const db = mongoose.connection.db;

        // 1. Get Teacher Profile for specialties
        const teacherProfile = await db.collection('users').findOne({ $or: [{ id: user.id }, { _id: user.id }] });
        const teacherSpecialties = teacherProfile?.specialties || [];

        // 2. Fetch Subjects
        let subjectQuery = {};
        if (teacherSpecialties.length > 0) {
            subjectQuery = { $or: [{ id: { $in: teacherSpecialties } }, { _id: { $in: teacherSpecialties } }] };
        }
        const subjects = await db.collection('subjects').find(subjectQuery).toArray();
        const subjectIds = subjects.map(s => String(s.id || s._id));

        // 3. Fetch Units for those subjects
        const units = await db.collection('units').find({
            $or: [
                { subject_id: { $in: subjectIds } },
                { subjectId: { $in: subjectIds } }
            ]
        }).toArray();
        const unitIds = units.map(u => String(u.id || u._id));

        // 4. Fetch MicroSkills for those units
        const microSkillsRaw = await db.collection('micro_skills').find({
            $or: [
                { unit_id: { $in: unitIds } },
                { base_topic_id: { $in: unitIds } }
            ]
        }).toArray();
        const fallbackSkills = await db.collection('microskills').find({
            $or: [
                { unit_id: { $in: unitIds } },
                { base_topic_id: { $in: unitIds } }
            ]
        }).toArray();

        // Merge skills
        const allSkills = [...microSkillsRaw, ...fallbackSkills];
        const uniqueSkillsMap = new Map();
        for (const s of allSkills) {
            const id = String(s.id || s._id);
            if (!uniqueSkillsMap.has(id)) {
                uniqueSkillsMap.set(id, s);
            }
        }
        const microSkills = Array.from(uniqueSkillsMap.values());

        // 5. Build Tree
        const curriculumTree = subjects.map(sub => {
            const subId = String(sub.id || sub._id);
            const subUnits = units.filter(u => String(u.subject_id || u.subjectId) === subId).map(unit => {
                const uId = String(unit.id || unit._id);
                const uSkills = microSkills.filter(m => String(m.unit_id || m.base_topic_id) === uId).map(ms => {
                    return {
                        id: String(ms.id || ms._id),
                        name: ms.name || ms.title || 'Unnamed Skill',
                    };
                });
                return {
                    id: uId,
                    name: unit.name || unit.title || 'Unnamed Unit',
                    microskills: uSkills
                };
            }).filter(u => u.microskills.length > 0);

            return {
                id: subId,
                name: sub.name || sub.title || 'Unnamed Subject',
                units: subUnits
            };
        }).filter(sub => sub.units.length > 0);

        // Fetch user's students so the teacher can select "All" or specific students
        const students = await db.collection('users').find({ role: 'student', teacher_id: user.id }).toArray();
        const studentList = students.map(s => ({ id: String(s.id || s._id), name: s.name }));

        return NextResponse.json({
            curriculum: curriculumTree,
            students: studentList
        });

    } catch (error) {
        console.error('Teacher Curriculum API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
