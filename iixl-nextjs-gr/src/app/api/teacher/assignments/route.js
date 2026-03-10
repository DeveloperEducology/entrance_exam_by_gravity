import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/db/mongo';

// GET all assignments for the teacher
export async function GET(req) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        await connectMongo();
        const db = mongoose.connection.db;

        // Fetch assignments
        const assignments = await db.collection('assignments')
            .find({ teacher_id: user.id })
            .sort({ created_at: -1 })
            .toArray();

        // Get unique skill IDs
        const skillIds = [...new Set(assignments.map(a => a.micro_skill_id))];

        // Fetch Microskills
        const ms1 = await db.collection('micro_skills').find({
            $or: [{ id: { $in: skillIds } }, { _id: { $in: skillIds } }]
        }).toArray();
        const ms2 = await db.collection('microskills').find({
            $or: [{ id: { $in: skillIds } }, { _id: { $in: skillIds } }]
        }).toArray();

        const allMs = [...ms1, ...ms2];
        const msMap = new Map();
        for (const m of allMs) {
            msMap.set(String(m.id || m._id), m.name || m.title || 'Unnamed Skill');
        }

        // Fetch students to map their names
        const students = await db.collection('users').find({ role: 'student', teacher_id: user.id }).toArray();
        const studentMap = new Map(students.map(s => [String(s.id || s._id), s.name]));

        // Fetch Skill States to determine completion
        const allAssociatedStudentIds = [...new Set(assignments.flatMap(a => a.student_ids))];
        const skillStates = await db.collection('student_skill_state').find({
            student_id: { $in: allAssociatedStudentIds },
            $or: [{ micro_skill_id: { $in: skillIds } }, { microskill_id: { $in: skillIds } }]
        }).toArray();

        // Create a fast lookup Set: `${studentId}_${skillId}`
        const masterySet = new Set();
        for (const st of skillStates) {
            if (st.status === 'mastered' || st.status === 'proficient' || st.mastery_score >= 80) {
                masterySet.add(`${st.student_id}_${st.micro_skill_id || st.microskill_id}`);
            }
        }

        const formatted = assignments.map(a => {
            const uniqueStudentIds = [...new Set(a.student_ids)];
            const assignedNames = uniqueStudentIds.map(id => studentMap.get(id) || 'Unknown Student');
            let completedCount = 0;
            uniqueStudentIds.forEach(sid => {
                if (masterySet.has(`${sid}_${a.micro_skill_id}`)) {
                    completedCount++;
                }
            });

            return {
                id: a._id.toString(),
                micro_skill_id: a.micro_skill_id,
                skill_name: msMap.get(String(a.micro_skill_id)) || 'Unknown Skill',
                due_date: a.due_date,
                created_at: a.created_at,
                students: assignedNames.join(', '),
                student_count: uniqueStudentIds.length,
                completed_count: completedCount
            };
        });

        return NextResponse.json({ assignments: formatted });
    } catch (e) {
        console.error('Fetch Assignments Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// POST create assignment
export async function POST(req) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { micro_skill_id, student_ids, due_date } = body;

        if (!micro_skill_id || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        await connectMongo();
        const db = mongoose.connection.db;

        const newAssignment = {
            teacher_id: user.id,
            micro_skill_id: String(micro_skill_id),
            student_ids: [...new Set(student_ids.map(String))],
            due_date: due_date || null,
            created_at: new Date().toISOString()
        };

        const result = await db.collection('assignments').insertOne(newAssignment);

        return NextResponse.json({ success: true, assignmentId: result.insertedId });
    } catch (e) {
        console.error('Create Assignment Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// DELETE cancel assignment
export async function DELETE(req) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.role !== 'teacher') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

        await connectMongo();
        const db = mongoose.connection.db;

        await db.collection('assignments').deleteOne({
            _id: new mongoose.Types.ObjectId(id),
            teacher_id: user.id
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Delete Assignment Error:', e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
