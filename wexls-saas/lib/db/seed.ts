import dbConnect from "./mongodb";
import Organization from "../../models/Organization";
import User, { UserRole } from "../../models/User";
import { Grade, Subject, Unit, MicroSkill } from "../../models/Curriculum";
import Question from "../../models/Question";
import mongoose from "mongoose";

async function seed() {
    await dbConnect();

    console.log("Checking if data already exists...");
    const existingOrg = await Organization.findOne({ subdomain: "greenvalley" });
    if (existingOrg) {
        console.log("Data already exists. Skipping seed.");
        process.exit(0);
    }

    // 1. Create Organization
    const org = await Organization.create({
        name: "Green Valley High School",
        subdomain: "greenvalley",
        brandColor: "#7C3AED"
    });

    // 2. Create Users
    await User.create({
        name: "Admin Alice",
        email: "admin@greenvalley.com",
        role: UserRole.ORG_ADMIN,
        orgId: org._id,
        password: "admin"
    });

    await User.create({
        name: "Mrs. Robinson",
        email: "robinson@greenvalley.com",
        role: UserRole.TEACHER,
        orgId: org._id,
        password: "admin"
    });

    await User.create({
        name: "John Doe",
        email: "john@greenvalley.com",
        role: UserRole.STUDENT,
        orgId: org._id,
        password: "admin"
    });

    // 3. Create Curriculum
    const grade3 = await Grade.create({ orgId: org._id, name: "Grade 3", index: 3 });

    const math = await Subject.create({
        orgId: org._id,
        gradeId: grade3._id,
        name: "Mathematics",
        color: "#7C3AED"
    });

    const unitNumeracy = await Unit.create({
        orgId: org._id,
        subjectId: math._id,
        name: "Number sense and operations",
        index: 1
    });

    const skillEvenOdd = await MicroSkill.create({
        orgId: org._id,
        unitId: unitNumeracy._id,
        name: "Identify even and odd numbers",
        baseDifficulty: "easy"
    });

    // 4. Create Questions for 3 stages
    // Stage 1 (Easy)
    await Question.create({
        orgId: org._id,
        microSkillId: skillEvenOdd._id,
        type: "mcq",
        parts: [{ type: "text", content: "Is 4 an even or an odd number?" }],
        options: [{ value: "even", text: "Even" }, { value: "odd", text: "Odd" }],
        correctAnswer: "even",
        stage: 1,
        difficulty: "easy"
    });

    // Stage 2 (Medium)
    await Question.create({
        orgId: org._id,
        microSkillId: skillEvenOdd._id,
        type: "mcq",
        parts: [
            { type: "text", content: "Which of these numbers is even?" },
            { type: "svg", metadata: { type: "number-line", min: 0, max: 10, points: [{ value: 7 }, { value: 8 }] } }
        ],
        options: [{ value: "7", text: "7" }, { value: "8", text: "8" }],
        correctAnswer: "8",
        stage: 2,
        difficulty: "medium"
    });

    // Stage 3 (Hard)
    await Question.create({
        orgId: org._id,
        microSkillId: skillEvenOdd._id,
        type: "mcq",
        parts: [{ type: "text", content: "Which set contains only odd numbers?" }],
        options: [
            { value: "a", text: "1, 3, 5, 8" },
            { value: "b", text: "1, 3, 5, 7" },
            { value: "c", text: "2, 4, 6, 8" }
        ],
        correctAnswer: "b",
        stage: 3,
        difficulty: "hard"
    });

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
