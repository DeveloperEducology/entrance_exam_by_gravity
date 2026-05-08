
"use client"

import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useGeometryStore } from '@/store/geometryStore';
import { FormulaEngine } from '@/engine/geometry/coordinate';
import { LucideRotateCcw, LucideCopy, LucideThumbsUp, LucideInfo } from 'lucide-react';

export const FormulaPanel = () => {
  const { points, resetPoints } = useGeometryStore();
  const results = FormulaEngine.calculateDistance(points.A, points.B);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 overflow-y-auto">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Distance Formula</h2>
        <div className="flex gap-2">
            <button onClick={resetPoints} className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <LucideRotateCcw size={18} />
            </button>
            <button className="p-2 hover:bg-slate-50 rounded-full text-slate-500 transition-colors">
                <LucideCopy size={18} />
            </button>
        </div>
      </div>

      <div className="p-8 flex flex-col gap-10">
        <div className="flex flex-col items-center gap-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">General Formula</span>
            <div className="text-2xl text-blue-600">
                <BlockMath math="d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}" />
            </div>
        </div>

        <div className="flex flex-col gap-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Substitution</span>
            <div className="flex flex-col gap-3 font-mono text-slate-600 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
               {results.steps.map((step, idx) => (
                   <div key={idx} className="flex items-center gap-3">
                       <span className="text-slate-300 text-sm">{idx + 1}.</span>
                       <InlineMath math={step} />
                   </div>
               ))}
            </div>
        </div>

        <div className="mt-auto pt-10 border-t border-slate-50 flex items-center justify-between">
            <div className="flex gap-4">
                <LucideThumbsUp size={20} className="text-slate-300 hover:text-blue-500 cursor-pointer" />
                <LucideInfo size={20} className="text-slate-300 hover:text-blue-500 cursor-pointer" />
            </div>
            <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">Final Result</p>
                <p className="text-3xl font-black text-slate-800">{results.d.toFixed(2)} units</p>
            </div>
        </div>
      </div>
    </div>
  );
};
