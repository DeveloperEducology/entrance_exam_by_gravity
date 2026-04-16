'use client';
import React, { useState, useEffect } from 'react';

// --- ICONS (SVG replacements for lucide-react) ---
const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const RotateCcwIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);

import ArithmeticGrid from './ArithmeticGrid';

const ProblemView = ({ problem, stepIndex, inputs, onInputChange, isAnswered, isCorrect, mode, onShowSteps }) => {
  if (!problem || !problem.steps) return null;
  const isRemediation = mode === 'remediation';
  const step = problem.steps[stepIndex] || problem.steps[0];
  const isLastStep = stepIndex === problem.steps.length - 1;
  const opType = (problem.operation || problem.data_source?.type || problem.type || "").toLowerCase();
  const isAdd = opType.includes('addition') || opType === 'add';
  const isSub = opType.includes('subtraction') || opType === 'subtract' || opType === 'sub';
  const isMul = opType.includes('multiplication') || opType === 'multiply' || opType === 'mul';
  const command = isAdd ? 'Add.' : (isSub ? 'Subtract.' : (isMul ? 'Multiply.' : 'Add.'));

  return (
    <div className={`flex flex-col items-start p-6 transition-all duration-500 min-h-[300px] w-full rounded-2xl
      ${isRemediation ? 'bg-amber-50/30 border-2 border-amber-100/50' : 'bg-transparent'}
    `}>
      <div className="w-full flex justify-between items-center mb-6">
          <h3 className="text-3xl font-medium text-slate-900 tracking-tight">
            {isRemediation ? "Step-by-Step Solution" : command}
          </h3>
          <div className="flex items-center gap-2">
            {!isRemediation && (
              <button 
                onClick={onShowSteps}
                className="group flex items-center gap-1 text-blue-600 hover:underline transition-all text-sm font-medium"
              >
                <span>Show steps</span>
                <ChevronRightIcon />
              </button>
            )}
          </div>
      </div>
      
      <ArithmeticGrid 
        operation={isAdd ? 'addition' : (isSub ? 'subtraction' : (isMul ? 'multiplication' : 'addition'))}
        operands={problem.operands}
        carries={step.carries}
        regroups={step.regroups}
        result={step.result}
        highlights={step.highlights}
        subRows={step.subRows}
        mode={isRemediation ? 'static' : 'interactive'}
        inputs={inputs}
        onInputChange={onInputChange}
        isAnswered={isAnswered}
        isCorrect={isCorrect}
        isLastStep={isLastStep}
      />
    </div>
  );
};

export default function StepwiseArithmeticRenderer({ question: problem, onAnswer, onSubmit, userAnswer, isAnswered, isCorrect }) {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState({});
  const [showHelp, setShowHelp] = useState(false);
  const mode = (isAnswered && !isCorrect) || showHelp ? 'remediation' : 'challenge';
  const opType = (problem.operation || problem.data_source?.type || problem.type || "").toLowerCase();

  useEffect(() => {
    if (problem?.steps) {
        if (mode === 'challenge') {
            setStep(problem.steps.length - 1);
        } else if (mode === 'remediation' && !showHelp) {
            setStep(0); 
        }
    }
  }, [mode, problem, showHelp]);

  const handleShowSteps = () => {
      setShowHelp(true);
      setStep(0);
  };

  if (!problem || !problem.steps || !problem.operands || problem.operands.length < 2) return <div className="p-8 text-center text-slate-500">Generating problem...</div>;

  const handleNext = () => {
    if (step < problem.steps.length - 1) {
        setStep(step + 1);
    } else if (onSubmit && mode === 'challenge') {
        onSubmit();
    }
  };

  const reset = () => {
      setStep(mode === 'challenge' ? problem.steps.length - 1 : 0);
      setInputs({});
      setShowHelp(false);
  };

  const handleInputChange = (colIdx, val) => {
    const newVal = val.slice(-1).replace(/[^0-9]/g, '');
    const newInputs = { ...inputs, [colIdx]: newVal };
    setInputs(newInputs);
    
    if (newVal) {
        let nextIdx = -1;
        for (let i = colIdx - 1; i >= 0; i--) {
            if (document.getElementById(`digit-input-${i}`)) {
                nextIdx = i;
                break;
            }
        }
        if (nextIdx !== -1) {
            setTimeout(() => {
                document.getElementById(`digit-input-${nextIdx}`)?.focus();
            }, 10);
        }
    }

    const lastStep = problem.steps[problem.steps.length-1];
    const topLen = problem.operands[0].length;
    const botLen = problem.operands[1].length;
    const resLen = lastStep.result?.length || 0;
    const maxLengthTotal = Math.max(topLen, botLen, resLen);
    
    let fullAnswer = "";
    const resultTemplate = lastStep.result || [];
    const finalPadded = [...Array(Math.max(0, maxLengthTotal - resultTemplate.length)).fill(" "), ...resultTemplate];
    
    finalPadded.forEach((char, i) => {
        if (/[0-9]/.test(char)) {
            fullAnswer += (newInputs[i] || "");
        }
    });
    if (onAnswer) onAnswer(fullAnswer);
  };

  if (mode === 'remediation') {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-start gap-12 bg-white rounded-2xl overflow-hidden p-6 mb-12 border-2 border-slate-50 shadow-sm transition-all duration-700">
        <div className="flex flex-col gap-2 px-2">
            <h3 className="text-3xl font-medium text-slate-900">Correct Solution</h3>
            <p className="text-slate-400 text-sm italic">Detailed walkthrough of the calculation</p>
        </div>
        <div className="w-full h-px bg-slate-100" />
        
        {problem.steps.map((currentStep, idx) => {
          const isAdd = opType.includes('addition') || opType === 'add';
          const isSub = opType.includes('subtraction') || opType === 'subtract' || opType === 'sub';
          const isMul = opType.includes('multiplication') || opType === 'multiply' || opType === 'mul';
          
          return (
            <div key={idx} className="w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <p className="text-[19px] text-slate-800 mb-8 font-sans antialiased leading-relaxed px-2">
                {currentStep.description || currentStep.instruction}
              </p>
              
              <div className="flex justify-start px-2">
                <ArithmeticGrid 
                  operation={isAdd ? 'addition' : (isSub ? 'subtraction' : (isMul ? 'multiplication' : 'addition'))}
                  operands={problem.operands}
                  carries={currentStep.carries}
                  regroups={currentStep.regroups}
                  result={currentStep.result}
                  highlights={currentStep.highlights}
                  subRows={currentStep.subRows}
                  mode="static"
                  showResult={true}
                />
              </div>

              {idx < problem.steps.length - 1 && (
                <div className="w-full h-px bg-slate-100 mt-12 mb-4" />
              )}
            </div>
          );
        })}

        {problem.footer && (
          <div className="mt-8 pt-8 border-t border-slate-200 w-full mb-8">
            <p className="text-xl font-medium text-slate-800 italic px-2">
              {problem.footer}
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-start pb-12 px-2">
             <button
                 onClick={reset}
                 className="px-8 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
             >
                 <RotateCcwIcon />
                 <span>Reset Practice</span>
             </button>
        </div>
      </div>
    );
  }

  // If answered and we are NOT in remediation (the showHelp case), 
  // we show a more compact "Success" or "Review" view for the Question Slot.
  if (isAnswered) {
    return (
      <div className="w-full max-w-4xl mx-auto p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center">
         <div className="text-slate-400 mb-6 font-medium italic">
            You have completed this challenge! See the detailed solution below.
         </div>
         <ArithmeticGrid 
            operation={isAdd ? 'addition' : (isSub ? 'subtraction' : (isMul ? 'multiplication' : 'addition'))}
            operands={problem.operands}
            result={problem.steps[problem.steps.length-1].result}
            mode="static"
            showResult={true}
          />
          <button 
           onClick={reset}
           className="mt-8 text-blue-600 hover:text-blue-800 flex items-center gap-2 font-medium"
          >
            <RotateCcwIcon />
            <span>Try Again</span>
          </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
        <div className="overflow-hidden">
          <ProblemView 
              problem={problem} 
              stepIndex={step} 
              inputs={inputs} 
              onInputChange={handleInputChange}
              isAnswered={isAnswered}
              isCorrect={isCorrect}
              mode={mode}
              onShowSteps={handleShowSteps}
          />
          
          <div className="mt-8 flex items-center justify-start gap-4">
                   <button
                       onClick={handleNext}
                       className="min-w-[140px] px-8 py-3 rounded-xl text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-2 bg-[#50b500] hover:bg-[#469d00] shadow-sm"
                   >
                       <span className="text-xl font-bold">
                         Submit
                       </span>
                   </button>

                   <button
                       onClick={reset}
                       className="flex items-center justify-center w-12 h-12 rounded-full text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all group ml-4"
                       title="Reset problem"
                   >
                       <div className="group-hover:rotate-180 transition-transform duration-500">
                           <RotateCcwIcon />
                       </div>
                   </button>
          </div>
        </div>
    </div>
  );
}
