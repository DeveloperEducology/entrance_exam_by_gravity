"use client";

import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity as ActivityIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PerformanceData {
    subject: string;
    A: number;
    fullMark: number;
}

const data: PerformanceData[] = [
    { subject: 'Persistence', A: 120, fullMark: 150 },
    { subject: 'Accuracy', A: 98, fullMark: 150 },
    { subject: 'Speed', A: 86, fullMark: 150 },
    { subject: 'Curiosity', A: 99, fullMark: 150 },
    { subject: 'Growth', A: 85, fullMark: 150 },
    { subject: 'Mastery', A: 65, fullMark: 150 },
];

export const SkillRadarCard = () => {
    return (
        <div className="glass-card p-6 h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mastery Dimensions</h3>
                    <p className="text-xl font-bold text-slate-800">Pedagogical Balance</p>
                </div>
                <div className="size-10 bg-primary bg-opacity-5 rounded-xl flex items-center justify-center text-primary">
                    <ActivityIcon size={20} />
                </div>
            </div>

            <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <Radar
                            name="Student"
                            dataKey="A"
                            stroke="var(--primary)"
                            fill="var(--primary)"
                            fillOpacity={0.4}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
