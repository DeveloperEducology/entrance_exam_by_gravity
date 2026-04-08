import dbConnect from "@/lib/db/mongodb";
import Session from "@/models/Session";
import Attempt from "@/models/Attempt";
import Question from "@/models/Question";
import mongoose from "mongoose";

export type SubmitResult = {
    isCorrect: boolean;
    isStageUp: boolean;
    isCompleted: boolean;
    currentTokens: number;
    currentStage: number;
    nextQuestionId?: string;
};

export async function processAnswer(
    orgId: string,
    studentId: string,
    microSkillId: string,
    questionId: string,
    userAnswer: any,
    latencyMs: number
): Promise<SubmitResult> {
    await dbConnect();

    // 1. Fetch Question data for validation
    const question = await Question.findById(questionId);
    if (!question) throw new Error("Question not found");

    // Simple validation logic (can be expanded based on question type)
    const isCorrect = JSON.stringify(userAnswer) === JSON.stringify(question.correctAnswer);

    // 2. Fetch or Create Session
    let session = await Session.findOne({
        studentId,
        microSkillId,
        isCompleted: false
    });

    if (!session) {
        session = await Session.create({
            orgId: new mongoose.Types.ObjectId(orgId),
            studentId: new mongoose.Types.ObjectId(studentId),
            microSkillId: new mongoose.Types.ObjectId(microSkillId),
            currentTokens: 0,
            currentStage: 1,
            history: []
        });
    }

    // 3. Update Session State
    let isStageUp = false;
    let isCompleted = false;

    if (isCorrect) {
        session.currentTokens += 1;
        session.correctCount += 1;

        // Graduation Logic: 5 tokens -> Next Stage
        if (session.currentTokens >= 5) {
            if (session.currentStage < 3) {
                session.currentStage += 1;
                session.currentTokens = 0;
                isStageUp = true;
            } else {
                // Mastered all 3 stages
                session.isCompleted = true;
                isCompleted = true;
            }
        }
    } else {
        session.incorrectCount += 1;
        // Potentially pause progression or reset tokens in current stage?
        // "Incorrect Answer -> Pause progression, flag for review"
    }

    session.history.push(new mongoose.Types.ObjectId(questionId));
    session.lastUpdateTime = new Date();
    await session.save();

    // 4. Log Attempt
    await Attempt.create({
        orgId: new mongoose.Types.ObjectId(orgId),
        studentId: new mongoose.Types.ObjectId(studentId),
        sessionId: session._id,
        questionId: new mongoose.Types.ObjectId(questionId),
        microSkillId: new mongoose.Types.ObjectId(microSkillId),
        isCorrect,
        userAnswer,
        correctAnswer: question.correctAnswer,
        latencyMs,
        timestamp: new Date(),
    });

    // 5. Fetch Next Question
    let nextQuestion = null;
    if (!isCompleted) {
        // Find questions in the current stage that haven't been attempted yet
        nextQuestion = await Question.findOne({
            microSkillId,
            stage: session.currentStage,
            _id: { $nin: session.history }
        }).sort({ _id: 1 });

        // Fallback if we run out of questions in the current stage?
        if (!nextQuestion) {
            nextQuestion = await Question.findOne({
                microSkillId,
                stage: session.currentStage
            });
        }
    }

    return {
        isCorrect,
        isStageUp,
        isCompleted,
        currentTokens: session.currentTokens,
        currentStage: session.currentStage,
        nextQuestionId: nextQuestion?._id.toString(),
    };
}
