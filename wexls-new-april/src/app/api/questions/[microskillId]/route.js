import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';

/**
 * FETCH QUESTIONS FOR A SPECIFIC MICRO-SKILL
 */
export async function GET(request, { params }) {
  const { microskillId } = await params;
  
  try {
    const { db } = await connectToDatabase();
    
    // Find questions by UUID micro_skill_id
    // Remote database structure uses string UUIDs in 'micro_skill_id'
    let questions = await db.collection('questions')
      .find({ micro_skill_id: microskillId })
      .limit(15)
      .toArray();

    // Logic for mixed results (some might be linked by ObjectId if migration occurred)
    if (questions.length === 0 && ObjectId.isValid(microskillId)) {
        questions = await db.collection('questions')
            .find({ micro_skill_id: new ObjectId(microskillId) }) // Should be string though
            .limit(15)
            .toArray();
    }

    if (!questions || questions.length === 0) {
        return NextResponse.json({ 
            success: false, 
            message: "No questions found for this micro-skill.",
            questions: [] 
        }, { status: 404 });
    }

    // --- ADVANCED CLOUD-DRIVEN GENERATOR ---
    // First, check if there is a DYNAMIC TEMPLATE for this skill
    const template = await db.collection("templates").findOne({ 
        $or: [
            { micro_skill_ids: microskillId },
            { template_id: microskillId } // Support direct template calls
        ]
    });

    if (template) {
        // --- POLICY-AWARE DYNAMIC GENERATOR ---
        if (template.template_id.includes("addition")) {
            const config = template.config || {};
            const isHard = Math.random() > 0.7; // Lowered chance for hard multi-addend unless forced
            
            // 1. Determine Addend Count
            const numAddends = config.max_addends > 2 ? (isHard ? Math.floor(Math.random() * 2) + 3 : 2) : 2;
            
            // 2. Determine Digit Range
            let digitCount = 3; // Default
            if (config.digit_constraint === "fixed_2") digitCount = 2;
            if (config.digit_constraint === "variable_1_3") digitCount = Math.floor(Math.random() * 3) + 1;
            
            const offset = Math.pow(10, digitCount - 1);
            const range = Math.pow(10, digitCount) - offset;

            // 3. Generate Addends with Carry Constraints
            let addends = [];
            let iterations = 0;
            const preventCarry = config.prevent_carry_logic === "strictly_under_10_per_column";

            while (addends.length < numAddends && iterations < 100) {
                iterations++;
                const n = Math.floor(Math.random() * range) + offset;
                
                if (preventCarry && addends.length > 0) {
                    // Check if adding this number causes a carry at any place value
                    const sN = String(n).split('').reverse();
                    const sPrev = String(addends[0]).split('').reverse();
                    const maxLen = Math.max(sN.length, sPrev.length);
                    let hasCarry = false;
                    for (let i = 0; i < maxLen; i++) {
                        if ((parseInt(sN[i] || 0) + parseInt(sPrev[i] || 0)) >= 10) {
                            hasCarry = true;
                            break;
                        }
                    }
                    if (hasCarry) continue; // Try again
                }
                addends.push(n);
            }

            const sum = addends.reduce((a, b) => a + b, 0);
            const sSum = String(sum).split('');
            
            const cells = [];
            const correctAnswers = {};
            const getPlace = (num, place) => Math.floor((num / Math.pow(10, place)) % 10);
            let carries = [0, 0, 0, 0, 0];
            
            // 4. Calculate Carries
            if (!preventCarry) {
                for (let p = 0; p < sSum.length; p++) {
                    const columnSum = addends.reduce((acc, n) => acc + getPlace(n, p), 0) + (p > 0 ? carries[p-1] : 0);
                    carries[p] = Math.floor(columnSum / 10);
                    if (carries[p] > 0 && p < sSum.length - 1) {
                        const id = `c_${Math.pow(10, p + 1)}`;
                        cells.push({r: 0, c: sSum.length - 2 - p, type: "input", id, placeholder: "c"});
                        correctAnswers[id] = String(carries[p]);
                    }
                }
            }
            
            // 5. Build Grid Rows
            addends.forEach((n, rIdx) => {
                const sN = String(n).split('');
                sN.forEach((d, cIdx) => {
                    cells.push({
                        r: rIdx + 1, 
                        c: cIdx + (sSum.length - sN.length), 
                        type: "text", 
                        content: d,
                        prefix: (rIdx === addends.length - 1 && cIdx === 0) ? "+" : ""
                    });
                });
            });
            
            sSum.forEach((d, i) => {
                const id = `a_${Math.pow(10, sSum.length - 1 - i)}`;
                cells.push({r: addends.length + 1, c: i, type: "input", id});
                correctAnswers[id] = d;
            });

            // Pedagogical Steps
            const solutionSteps = [];
            const places = ["ones", "tens", "hundreds", "thousands", "ten thousands"];
            for (let p = 0; p < sSum.length; p++) {
                const placeName = places[p] || "higher place";
                const val1 = getPlace(addends[0], p);
                const val2 = getPlace(addends[1], p);
                const carryIn = p > 0 ? carries[p-1] : 0;
                const columnSum = val1 + val2 + carryIn;
                let instruction = `Add the ${placeName}. Add ${val1} + ${val2}${carryIn ? ` + ${carryIn} (carry)` : ""}.`;
                if (columnSum >= 10) instruction += " Remember to regroup.";
                const stepGrid = [];
                addends.forEach((n, r) => {
                    const sn = String(n).split('').reverse();
                    stepGrid.push({ r: r + 1, c: sSum.length - 1 - p, content: sn[p] || "0", highlight: true });
                    sn.forEach((d, i) => { if(i !== p) stepGrid.push({ r: r + 1, c: sSum.length - 1 - i, content: d, highlight: false }); });
                });
                if (p > 0 && carries[p-1] > 0) stepGrid.push({ r: 0, c: sSum.length - 1 - p, content: carries[p-1], isCarry: true, highlight: true });
                for (let i = 0; i < p; i++) { stepGrid.push({ r: addends.length + 1, c: sSum.length - 1 - i, content: sSum[sSum.length - 1 - i], highlight: i === p }); }
                solutionSteps.push({ instruction, grid_state: stepGrid });
            }

            const dynamicQuestion = {
                id: `dyn_${microskillId}_${Date.now()}`,
                micro_skill_id: microskillId,
                type: "fillInTheBlank",
                difficulty: isHard ? "hard" : "medium",
                question_text: `Calculate the sum of ${addends.join(", ")} using column addition.`,
                parts: [
                    {id: "instr", type: "text", content: isHard ? "Advanced Multi-Digit Challenge" : "Solve the following problem:", isVertical: true},
                    {
                        id: "addition_grid",
                        type: "smartTable",
                        config: {rows: addends.length + 2, cols: sSum.length, showBorders: false, alignment: "right"},
                        cells: cells
                    }
                ],
                gridCols: sSum.length,
                finalSum: sum,
                solution_steps: solutionSteps,
                correct_answer: correctAnswers
            };

            return NextResponse.json({ success: true, count: 1, questions: [dynamicQuestion] });
        }
    }

    // Process questions and apply LAZY HYDRATION for dynamic templates
    const processedQuestions = questions.map(q => {
        let parts = [];
        try {
            parts = typeof q.parts === 'string' ? JSON.parse(q.parts) : (q.parts || []);
        } catch (e) {
            parts = [];
        }

        let correctAnswer = q.correct_answer_text || q.correct_answer;
        try {
            if (typeof correctAnswer === 'string' && (correctAnswer.startsWith('{') || correctAnswer.startsWith('['))) {
                correctAnswer = JSON.parse(correctAnswer);
            }
        } catch (e) {}

        let hydratedQ = {
            ...q,
            _id: q._id.toString(),
            parts,
            correct_answer: correctAnswer
        };

        // --- LAZY DYNAMIC HYDRATION ---
        // If question uses a math template but has no parts, generate them!
        const dynamicTemplates = ["math_add_2digit_fixed", "math_add_3digit_fixed"];
        if (dynamicTemplates.includes(q.template_id) && hydratedQ.parts.length === 0) {
            const digitCount = q.template_id.includes("2digit") ? 2 : 3;
            const offset = Math.pow(10, digitCount - 1);
            const range = Math.pow(10, digitCount) - offset;
            
            const addends = [Math.floor(Math.random() * range) + offset, Math.floor(Math.random() * range) + offset];
            const sum = addends[0] + addends[1];
            const sSum = String(sum).split('');
            const getPlace = (num, place) => Math.floor((num / Math.pow(10, place)) % 10);
            
            const cells = [];
            const correctAnswers = {};
            let carries = [0, 0, 0, 0];
            
            for (let p = 0; p < sSum.length; p++) {
                const columnSum = addends.reduce((acc, n) => acc + getPlace(n, p), 0) + (p > 0 ? carries[p-1] : 0);
                carries[p] = Math.floor(columnSum / 10);
                if (carries[p] > 0 && p < sSum.length - 1) {
                    const id = `c_${Math.pow(10, p + 1)}`;
                    cells.push({r: 0, c: sSum.length - 2 - p, type: "input", id, placeholder: "c"});
                    correctAnswers[id] = String(carries[p]);
                }
            }
            
            addends.forEach((n, rIdx) => {
                const sN = String(n).split('');
                sN.forEach((d, cIdx) => {
                    cells.push({
                        r: rIdx + 1, c: cIdx + (sSum.length - sN.length), 
                        type: "text", content: d,
                        prefix: (rIdx === addends.length - 1 && cIdx === 0) ? "+" : ""
                    });
                });
            });
            
            sSum.forEach((d, i) => {
                const id = `a_${Math.pow(10, sSum.length - 1 - i)}`;
                cells.push({r: addends.length + 1, c: i, type: "input", id});
                correctAnswers[id] = d;
            });

            hydratedQ.parts = [
                { id: "instr", type: "text", content: `Add ${addends[0]} and ${addends[1]}.`, isVertical: true },
                {
                    id: "addition_grid", type: "smartTable",
                    config: { rows: 4, cols: sSum.length, showBorders: false, alignment: "right" },
                    cells: cells
                }
            ];
            hydratedQ.correct_answer = correctAnswers;
            hydratedQ.finalSum = sum;
            hydratedQ.gridCols = sSum.length;
            hydratedQ.solution_steps = []; // Add full steps generator here if needed
        }

        return hydratedQ;
    });

    return NextResponse.json({ 
        success: true, 
        count: processedQuestions.length,
        questions: processedQuestions 
    });
  } catch (err) {
    console.error("DB Fetch questions error:", err.message);
    return NextResponse.json({ 
        success: false, 
        message: "Failed to fetch questions.",
        error: err.message
    }, { status: 500 });
  }
}
