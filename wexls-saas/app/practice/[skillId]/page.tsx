"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuestionRenderer } from '@/components/practice/QuestionRenderer';
import { submitAnswerAction, getNextQuestionAction, getSessionAction } from '@/app/actions/practice';
import { Loader2, ArrowLeft, MoreHorizontal, X } from 'lucide-react';

export default function PracticePage() {
    const router = useRouter();
    const { skillId } = useParams();
    const [question, setQuestion] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [session, setSession] = useState<{ currentTokens: number; currentStage: number; history: string[] }>({
        currentTokens: 0,
        currentStage: 1,
        history: []
    });
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const sess = await getSessionAction(skillId as string);
                setSession(sess as any);
                const q = await getNextQuestionAction(skillId as string, sess.currentStage, sess.history as string[]);
                setQuestion(q);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [skillId]);

    const handleAnswerSubmit = async (answer: any) => {
        setIsProcessing(true);
        try {
            const start = Date.now();
            const res = await submitAnswerAction(skillId as string, question._id, answer, Date.now() - start);
            setResult(res);
            setSession({
                currentTokens: res.currentTokens,
                currentStage: res.currentStage,
                history: [...session.history, question._id]
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNextQuestion = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const q = await getNextQuestionAction(skillId as string, session.currentStage, session.history);
            setQuestion(q);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !question) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-4">
                <Loader2 className="animate-spin text-primary size-12" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading Focus Mode...</p>
            </div>
        );
    }

    return (
        <div className="practice-portal min-h-screen bg-white">
            {/* Practice HUD */}
            <header className="py-6 px-10 flex justify-between items-center bg-white border-b border-slate-50 sticky top-0 z-30">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push('/dashboard/student')}
                        className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all border border-slate-100"
                    >
                        <X size={20} />
                    </button>
                    <div className="h-4 w-[1px] bg-slate-200"></div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800">Mastering Multi-digit Comparison</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit 2: Algebraic Thinking</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={cn("size-2 rounded-full", session.currentTokens >= i ? "bg-success" : "bg-slate-100")}></div>
                            ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage {session.currentStage} Progress</span>
                    </div>
                    <button className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-100 transition-all"><MoreHorizontal size={20} /></button>
                </div>
            </header>

            <main className="flex-grow py-20 bg-slate-50 bg-opacity-[0.2]">
                <div className="section-container">
                    <QuestionRenderer
                        question={question}
                        onAnswer={handleAnswerSubmit}
                        isProcessing={isProcessing}
                        result={result}
                    />
                </div>
            </main>

            <style jsx>{`
          .practice-portal {
            display: flex;
            flex-direction: column;
          }
       `}</style>
        </div>
    );
}
