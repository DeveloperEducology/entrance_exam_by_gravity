"use client";

import React from 'react';
import { Star, Lock, CheckCircle2, Trophy, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Skill {
    id: string;
    name: string;
    status: 'locked' | 'available' | 'mastered' | 'in-progress';
    progress?: number;
}

export const SkillMap: React.FC<{ skills: Skill[] }> = ({ skills }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {skills.map((skill) => (
                <div
                    key={skill.id}
                    className={cn(
                        "glass-card p-6 flex flex-col gap-4 transition-all duration-300 relative overflow-hidden group hover:-translate-y-1",
                        skill.status === 'locked' ? "opacity-50 grayscale" : "hover:shadow-xl hover:shadow-primary-glow",
                        skill.status === 'mastered' ? "border-success border-opacity-30" : ""
                    )}
                >
                    <div className="flex justify-between items-start">
                        <div className={cn(
                            "p-3 rounded-2xl flex items-center justify-center",
                            skill.status === 'mastered' ? "bg-success bg-opacity-10 text-success" :
                                skill.status === 'in-progress' ? "bg-primary bg-opacity-10 text-primary" : "bg-slate-100 text-slate-400"
                        )}>
                            {skill.status === 'locked' ? <Lock size={20} /> :
                                skill.status === 'mastered' ? <Trophy size={20} /> :
                                    skill.status === 'in-progress' ? <Clock size={20} /> : <Star size={20} />}
                        </div>
                        {skill.status === 'mastered' && (
                            <div className="bg-yellow-400 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg rotate-12">Mastered</div>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-700 leading-tight pr-4">
                        {skill.name}
                    </h3>

                    {skill.status === 'available' && (
                        <button className="mt-2 text-sm font-bold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                            Start Practice
                        </button>
                    )}

                    {skill.status === 'in-progress' && (
                        <div className="mt-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                                <span>Progress</span>
                                <span>Level 2</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '45%' }}></div>
                            </div>
                        </div>
                    )}

                    {skill.status === 'mastered' && (
                        <div className="mt-2 flex items-center gap-2 text-sm font-bold text-success/80">
                            <CheckCircle2 size={16} /> 100% Accuracy
                        </div>
                    )}

                    {skill.status === 'locked' && (
                        <p className="mt-2 text-xs text-slate-400 font-medium">Unlocked after completing Unit 2</p>
                    )}
                </div>
            ))}
        </div>
    );
};
