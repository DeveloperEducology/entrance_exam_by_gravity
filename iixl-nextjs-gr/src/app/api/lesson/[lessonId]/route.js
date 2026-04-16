import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';

const dummyLessonDoc = {
    slug: "expanded-form",
    title: "Writing numbers in expanded form",
    microskillId: "demo-skill",
    backLink: "/skills/demo-skill",
    contentBlocks: [
        {
            type: "paragraph",
            html: "You can write numbers in many different ways. <strong class='highlight'>Expanded form</strong>, or expanded notation, shows the value of each digit in a number."
        },
        {
            type: "paragraph",
            html: "Let's try it with 487. First, look at the <a href='#' class='linkText'>value</a> of each digit in 487."
        },
        {
            type: "placeValueTable",
            headers: ["hundreds", "tens", "ones"],
            rows: [
                [ { val: "4", color: "cPink" }, { val: "8", color: "cGreen" }, { val: "7", color: "cBlue" } ]
            ]
        },
        {
            type: "paragraph",
            html: "The value of the <span class='cPink'>4</span> is 4 hundreds, which is <span class='cPink'>400</span>."
        },
        {
            type: "paragraph",
            html: "The value of the <span class='cGreen'>8</span> is 8 tens, which is <span class='cGreen'>80</span>."
        },
        {
            type: "paragraph",
            html: "The value of the <span class='cBlue'>7</span> is 7 ones, which is <span class='cBlue'>7</span>."
        },
        {
            type: "paragraph",
            html: "Write those values as a sum to get the expanded form."
        },
        {
            type: "mathBlock",
            html: "<span class='cPink'>400</span> + <span class='cGreen'>80</span> + <span class='cBlue'>7</span>"
        },
        {
            type: "paragraph",
            html: "You might also see expanded form written with multiplication:"
        },
        {
            type: "mathBlock",
            html: "<span class='cPink'>4</span> &times; 100 + <span class='cGreen'>8</span> &times; 10 + <span class='cBlue'>7</span> &times; 1"
        },
        { type: "space" },
        {
            type: "paragraph",
            html: "Now let's try it with a bigger number, 317,024. First, look at the value of each digit in 317,024."
        },
        {
            type: "placeValueTable",
            headers: ["hundred<br/>thousands", "ten<br/>thousands", "thousands", "", "hundreds", "tens", "ones"],
            rows: [
                [
                    { val: "3", color: "cPurple" },
                    { val: "1", color: "cPink" },
                    { val: "7", color: "cGreen" },
                    { val: ",", color: "" },
                    { val: "0", color: "cPink" },
                    { val: "2", color: "cTeal" },
                    { val: "4", color: "cBlue" }
                ]
            ]
        },
        {
            type: "paragraph",
            html: "The value of the <span class='cPurple'>3</span> is 3 hundred thousands, which is <span class='cPurple'>300,000</span>."
        },
        {
            type: "paragraph",
            html: "The value of the <span class='cPink'>1</span> is 1 ten thousand, which is <span class='cPink'>10,000</span>."
        },
        {
            type: "paragraph",
            html: "The value of the <span class='cGreen'>7</span> is 7 thousands, which is <span class='cGreen'>7,000</span>."
        },
        {
            type: "paragraph",
            html: "There are <span class='cPink'>0</span> hundreds, so move on to the next digit."
        },
        {
            type: "paragraph",
            html: "The value of the <span class='cTeal'>2</span> is 2 tens, which is <span class='cTeal'>20</span>."
        },
        {
            type: "paragraph",
            html: "The value of the <span class='cBlue'>4</span> is 4 ones, which is <span class='cBlue'>4</span>."
        },
        {
            type: "paragraph",
            html: "Write those values as a sum to get the expanded form."
        },
        {
            type: "mathBlock",
            html: "<span class='cPurple'>300,000</span> + <span class='cPink'>10,000</span> + <span class='cGreen'>7,000</span> + <span class='cTeal'>20</span> + <span class='cBlue'>4</span>"
        },
        {
            type: "paragraph",
            html: "Here is expanded form written with multiplication:"
        },
        {
            type: "mathBlock",
            html: "<span class='cPurple'>3</span> &times; 100,000 + <span class='cPink'>1</span> &times; 10,000 + <span class='cGreen'>7</span> &times; 1,000 + <span class='cTeal'>2</span> &times; 10 + <span class='cBlue'>4</span> &times; 1"
        },
        {
            type: "practiceBlock",
            questionHtml: "What is <span class='cPink'>63,543</span> in expanded form?",
            practiceLabel: "Convert between standard and expanded form",
            practiceLink: "#"
        }
    ],
    relatedItems: {
        skills: [
            { label: "Convert between standard and expanded form", skillId: "demo-skill-1" },
            { label: "Convert from expanded form", skillId: "demo-skill-2" }
        ],
        videos: [
            { label: "Convert Between Standard and Expanded Form", url: "#", color: "linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)" },
            { label: "Convert from expanded form", url: "#", color: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)" }
        ],
        lessons: [
            { label: "Place value", slug: "place-value" },
            { label: "Writing numbers in word form", slug: "word-form" }
        ]
    }
};

export async function GET(req, { params }) {
    try {
        await connectMongo();
        const resolvedParams = await params;
        const { lessonId } = resolvedParams;
        const db = mongoose.connection.db;

        let lesson = await db.collection("lessons").findOne({ slug: lessonId });
        
        // Auto-seed for development testing if "expanded-form" is requested but doesn't exist
        if (!lesson && lessonId === 'expanded-form') {
            await db.collection("lessons").insertOne(dummyLessonDoc);
            lesson = dummyLessonDoc;
        }

        if (!lesson && lessonId === 'long-multiplication-demo') {
            const longMultiplicationDoc = {
                slug: "long-multiplication-demo",
                title: "Long Multiplication Step-by-Step",
                microskillId: "demo-skill",
                contentBlocks: [
                    {
                        type: "paragraph",
                        html: "First, write the problem. Put the larger number on top."
                    },
                    {
                        type: "multiplicationStep",
                        topNumber: [{val:"1"}, {val:"6"}, {val:"2"}],
                        bottomNumber: [{val:"3"}, {val:"4"}],
                        regroups: [],
                        results: []
                    },
                    {
                        type: "paragraph",
                        html: "Then, multiply the top number by the ones digit of the bottom number. In this example, multiply <strong class='cBlack'>162 &times; 4</strong>."
                    },
                    {
                        type: "multiplicationStep",
                        topNumber: [{val:"1"}, {val:"6"}, {val:"2", color:"cBlue"}],
                        bottomNumber: [{val:"3"}, {val:"4", color:"cBlue"}],
                        regroups: [],
                        results: [
                            [ {val:""}, {val:""}, {val:"8", color:"cBlue", bold:true} ]
                        ],
                        explanations: [
                            "<span class='cBlue fwBold'>2 &times; 4 = 8</span>"
                        ]
                    },
                    {
                        type: "multiplicationStep",
                        topNumber: [{val:"1"}, {val:"6", color:"cGreen"}, {val:"2"}],
                        bottomNumber: [{val:"3"}, {val:"4", color:"cGreen"}],
                        regroups: [{val:""}, {val:"2", color:"cGreen", bold:true}, {val:""}],
                        results: [
                            [ {val:""}, {val:"4", color:"cGreen", bold:true}, {val:"8", bold:true} ]
                        ],
                        explanations: [
                            "<span class='cGreen fwBold'>6 &times; 4 = 24</span>",
                            "Regroup 24 tens into 2 hundreds and 4 tens."
                        ]
                    },
                    {
                        type: "multiplicationStep",
                        topNumber: [{val:"1", color:"cOrange"}, {val:"6"}, {val:"2"}],
                        bottomNumber: [{val:"3"}, {val:"4", color:"cOrange"}],
                        regroups: [{val:""}, {val:"2", color:"cOrange", bold:true}, {val:""}],
                        results: [
                            [ {val:"6", color:"cOrange", bold:true}, {val:"4", bold:true}, {val:"8", bold:true} ]
                        ],
                        explanations: [
                            "<span class='cOrange fwBold'>1 &times; 4 = 4</span>",
                            "Add the 2 hundreds you regrouped.",
                            "<br/><span class='cOrange fwBold'>4 + 2 = 6</span>"
                        ]
                    }
                ]
            };
            await db.collection("lessons").insertOne(longMultiplicationDoc);
            lesson = longMultiplicationDoc;
        }

        if (!lesson) {
            return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
        }

        return NextResponse.json(lesson);
    } catch (error) {
        console.error("Failed to fetch lesson:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
