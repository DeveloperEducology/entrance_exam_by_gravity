
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
  const operation = problem.operation || problem.type;
  
  const command = operation === 'addition' ? 'Add.' : operation === 'subtraction' ? 'Subtract.' : 'Multiply.';

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
        operation={operation}
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
  if (!problem.steps || problem.steps.length === 0) return <div className="p-8 text-center text-red-500">Invalid problem structure.</div>;

  const isLastStep = step === problem.steps.length - 1;

  const handleNext = () => {
    if (step < problem.steps.length - 1) {
        setStep(step + 1);
    } else if (onSubmit && mode === 'challenge') {
        onSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
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
                       className={`min-w-[140px] px-8 py-3 rounded-xl text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-2
                           ${mode === 'remediation' 
                             ? (isLastStep ? 'bg-slate-800' : 'bg-[#50b500] hover:bg-[#469d00]')
                             : (isAnswered ? 'bg-slate-800' : 'bg-[#50b500] hover:bg-[#469d00] shadow-sm')
                           }
                       `}
                   >
                       <span className="text-xl font-bold">
                         {mode === 'remediation' 
                           ? (isLastStep ? (showHelp ? "Back to Problem" : "Got it") : "Next Step")
                           : (isAnswered ? "Retry" : "Submit")
                         }
                       </span>
                      {mode === 'remediation' && !isLastStep && <ChevronRightIcon />}
                  </button>

                  <div className="flex items-center gap-2">
                      {mode === 'remediation' && (
                            <button
                                disabled={step === 0}
                                onClick={handleBack}
                                className="px-6 py-3 rounded-full bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2"
                            >
                                <ChevronLeftIcon />
                                <span className="text-sm font-bold">Back</span>
                            </button>
                      )}

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
    </div>
  );
}
