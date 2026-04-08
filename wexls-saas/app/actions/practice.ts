"use server";

import { processAnswer } from "@/lib/adaptive-engine";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db/mongodb";
import Question from "@/models/Question";
import Session from "@/models/Session";
import mongoose from "mongoose";

export async function submitAnswerAction(skillId: string, questionId: string, answer: any, latencyMs: number) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const userId = (session.user as any).id;
    const orgId = (session.user as any).orgId;

    return await processAnswer(orgId, userId, skillId, questionId, answer, latencyMs);
}

export async function getSessionAction(skillId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await dbConnect();
    const userId = (session.user as any).id;

    let userSession = await Session.findOne({
        studentId: userId,
        microSkillId: skillId,
        isCompleted: false
    });

    if (!userSession) {
        // Return initial state
        return {
            currentStage: 1,
            currentTokens: 0,
            history: []
        }
    }

    return {
        currentStage: userSession.currentStage,
        currentTokens: userSession.currentTokens,
        history: userSession.history.map((id: any) => id.toString())
    };
}

export async function getNextQuestionAction(skillId: string, stage: number, history: string[]) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    await dbConnect();
    const orgId = (session.user as any).orgId;

    const nextQuestion = await Question.findOne({
        orgId: new mongoose.Types.ObjectId(orgId),
        microSkillId: new mongoose.Types.ObjectId(skillId),
        stage: stage,
        _id: { $nin: history.map(id => new mongoose.Types.ObjectId(id)) }
    }).sort({ _id: 1 });

    if (!nextQuestion) {
        // If none left, just return any in that stage or return null
        return await Question.findOne({
            orgId: new mongoose.Types.ObjectId(orgId),
            microSkillId: new mongoose.Types.ObjectId(skillId),
            stage: stage
        });
    }

    return JSON.parse(JSON.stringify(nextQuestion)); // Plain object for client
}
