"use client";

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Info, ChevronRight, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface QuestionPart {
    type: 'text' | 'image' | 'svg' | 'math' | 'instruction';
    content: any;
    metadata?: any;
}

interface QuestionProps {
    question: {
        id: string;
        type: string;
        parts: QuestionPart[];
        options?: any[];
        solution?: string;
        correctAnswer?: any;
    };
    onAnswer: (answer: any) => void;
    isProcessing?: boolean;
    result?: { isCorrect: boolean; isStageUp: boolean; isCompleted: boolean; currentTokens: number; currentStage: number };
}

export const QuestionRenderer: React.FC<QuestionProps> = ({ question, onAnswer, isProcessing, result }) => {
    const [selectedOption, setSelectedOption] = useState<any>(null);

    const handleSubmit = () => {
        if (selectedOption === null || isProcessing) return;
        onAnswer(selectedOption);
    };

    return (
        <div className="question-container glass-card p-10 max-w-3xl mx-auto w-full min-h-[500px] flex flex-col">
            {/* Breadcrumbs / Stage HUD */}
            <div className="flex justify-between items-center mb-8">
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-2 w-12 rounded-full transition-all duration-500",
                                (result?.currentTokens ?? 0) >= i ? "bg-success shadow-[0_0_10px_var(--success)]" : "bg-slate-200"
                            )}
                        />
                    ))}
                </div>
                <div className="stage-badge px-3 py-1 bg-primary bg-opacity-10 text-primary text-xs font-bold rounded-full uppercase">
                    Stage {result?.currentStage ?? 1} / 3
                </div>
            </div>

            {/* Question Content */}
            <div className="question-content flex-grow">
                {question.parts.map((part, idx) => (
                    <div key={idx} className="mb-6">
                        {part.type === 'text' && (
                            <p className="text-2xl font-medium leading-relaxed font-content text-slate-700">
                                {part.content}
                            </p>
                        )}
                        {part.type === 'instruction' && (
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Info size={14} /> {part.content}
                            </p>
                        )}
                        {part.type === 'svg' && (
                            <div className="svg-container flex justify-center my-10">
                                {/* Render Dynamic SVG based on part.metadata (e.g. number line) */}
                                {part.metadata?.type === 'number-line' && (
                                    <NumberLine min={part.metadata.min} max={part.metadata.max} points={part.metadata.points} />
                                )}
                                {part.metadata?.type === 'fraction' && (
                                    <FractionDiagram numerator={part.metadata.numerator} denominator={part.metadata.denominator} />
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Interactive Area */}
                <div className="options-grid grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    {question.options?.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => !result && setSelectedOption(option.id || option.value)}
                            disabled={!!result}
                            className={cn(
                                "option-btn p-6 rounded-2xl border-2 text-lg font-bold transition-all text-left flex items-center justify-between",
                                selectedOption === (option.id || option.value)
                                    ? "border-primary bg-primary bg-opacity-5 text-primary"
                                    : "border-slate-100 bg-white hover:border-slate-300",
                                result?.isCorrect && selectedOption === (option.id || option.value) && "border-success bg-success bg-opacity-5 text-success",
                                !result?.isCorrect && result && selectedOption === (option.id || option.value) && "border-error bg-error bg-opacity-5 text-error"
                            )}
                        >
                            <span>{option.text || option.value}</span>
                            {result?.isCorrect && selectedOption === (option.id || option.value) && <CheckCircle2 className="text-success" />}
                            {!result?.isCorrect && result && selectedOption === (option.id || option.value) && <XCircle className="text-error" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Area */}
            <div className="action-footer mt-10 pt-8 border-t border-slate-100 flex justify-end items-center gap-4">
                {!result ? (
                    <button
                        className="btn-primary py-4 px-12 text-lg disabled:opacity-50"
                        disabled={selectedOption === null || isProcessing}
                        onClick={handleSubmit}
                    >
                        {isProcessing ? <Loader2 className="animate-spin" /> : "Check Answer"}
                    </button>
                ) : (
                    <div className="flex items-center gap-4">
                        <p className={cn("font-bold text-lg", result.isCorrect ? "text-success" : "text-error")}>
                            {result.isCorrect ? "Brilliant! Keep it up." : "Don't worry, try again!"}
                        </p>
                        <button className="btn-primary py-4 px-12 text-lg flex items-center gap-2">
                            Next Question <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
         .question-container {
            font-family: var(--font-ui);
         }
         .font-content {
            font-family: var(--font-content);
         }
       `}</style>
        </div>
    );
};

// --- Sub-components for specialized rendering ---

const NumberLine = ({ min = 0, max = 10, points = [] }: { min: number, max: number, points: any[] }) => {
    return (
        <svg width="100%" height="80" viewBox="0 0 600 80" className="overflow-visible">
            <line x1="50" y1="40" x2="550" y2="40" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
            {/* Ticks */}
            {Array.from({ length: max - min + 1 }).map((_, i) => (
                <g key={i} transform={`translate(${50 + (i * 500 / (max - min))}, 0)`}>
                    <line x1="0" y1="35" x2="0" y2="45" stroke="#94a3b8" strokeWidth="2" />
                    <text x="0" y="65" textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="bold">{min + i}</text>
                </g>
            ))}
            {/* Points */}
            {points.map((p, idx) => (
                <circle key={idx} cx={50 + ((p.value - min) * 500 / (max - min))} cy="40" r="6" fill="var(--primary)" fillOpacity="0.8" />
            ))}
        </svg>
    );
};

const FractionDiagram = ({ numerator, denominator }: { numerator: number, denominator: number }) => {
    return (
        <div className="flex gap-2">
            {Array.from({ length: denominator }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold",
                        i < numerator ? "bg-primary text-white border-primary" : "bg-slate-50 text-slate-300 border-slate-200"
                    )}
                />
            ))}
        </div>
    );
}
