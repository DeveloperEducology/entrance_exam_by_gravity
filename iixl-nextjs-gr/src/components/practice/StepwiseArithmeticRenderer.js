
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

const Digit = ({ char, isBlue, isRed, isGray, hasSlash, isCarry }) => (
  <div className={`relative flex items-center justify-center w-6 h-8 text-xl font-mono transition-all duration-300
    ${isBlue ? 'text-blue-600 font-bold scale-110' : isRed ? 'text-red-500' : isGray ? 'text-gray-300' : 'text-slate-800'}
    ${isCarry ? 'text-sm h-6 italic opacity-80' : ''}
  `}>
    {char || " "}
    {hasSlash && char && char !== " " && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[1.5px] h-6 bg-red-400 rotate-[25deg]"></div>
      </div>
    )}
  </div>
);

const DigitInput = ({ colIdx, value, onChange, isAnswered, isCorrect }) => (
  <input
    id={`digit-input-${colIdx}`}
    type="text"
    value={value || ""}
    onChange={(e) => onChange(colIdx, e.target.value)}
    disabled={isAnswered}
    className={`w-10 h-12 text-center text-2xl font-mono font-bold border-2 rounded-xl outline-none transition-all
      ${isAnswered 
        ? (isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-600')
        : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
      }
    `}
    placeholder="?"
    autoComplete="off"
  />
);

const ProblemView = ({ problem, stepIndex, inputs, onInputChange, isAnswered, isCorrect, mode, onShowSteps }) => {
  if (!problem || !problem.steps) return null;
  const isRemediation = mode === 'remediation';
  const step = problem.steps[stepIndex] || problem.steps[0];
  const top = (problem.operands[0] || "").split("");
  const bottom = (problem.operands[1] || "").split("");
  const isLastStep = stepIndex === problem.steps.length - 1;
  const operation = problem.operation || problem.type;
  const isMultiplication = operation === 'multiplication';
  
  const maxLength = Math.max(
    top.length,
    bottom.length,
    step.result?.length || 0,
    ...(step.subRows?.map(r => r.val.length) || [0])
  );

  const pad = (arr, len) => {
    const safeLen = Math.max(0, len - (arr?.length || 0));
    return [...Array(safeLen).fill(" "), ...(arr || [])];
  };

  const paddedTop = pad(top, maxLength);
  const paddedBottom = pad(bottom, maxLength);
  const paddedResult = pad(step.result || [], maxLength);

  return (
    <div className={`flex flex-col items-center p-6 transition-all duration-500 min-h-[300px] w-full rounded-2xl
      ${isRemediation ? 'bg-amber-50/30 border-2 border-amber-100/50' : 'bg-transparent'}
    `}>
      <div className="w-full flex justify-between items-center mb-10 pb-4 border-b border-slate-50">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">
            {isRemediation ? "Step-by-Step Solution" : problem.title}
          </h3>
          <div className="flex items-center gap-2">
            {!isRemediation ? (
              <button 
                onClick={onShowSteps}
                className="group flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-xs font-bold rounded-full uppercase tracking-wider"
              >
                <span>Show steps</span>
                <ChevronRightIcon />
              </button>
            ) : (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase">Reviewing</span>
            )}
          </div>
      </div>
      
      <div className="relative flex items-start mb-12">
        <div className="flex flex-col items-center mr-6 pt-16">
           <div className="text-4xl h-10 flex items-center text-slate-300 font-light italic">
             {operation === 'addition' ? '+' : operation === 'subtraction' ? '–' : '×'}
           </div>
        </div>

        <div className="flex p-4 rounded-xl">
          {paddedTop.map((_, colIdx) => {
            const isHighlighted = step.highlights?.includes(colIdx);
            const regroup = step.regroups?.[colIdx];
            const carry = step.carries?.[colIdx];
            const resultChar = paddedResult[colIdx];
            const isDigitSlot = /[0-9]/.test(resultChar);

            return (
              <div key={colIdx} className="flex flex-col items-center min-w-[2.25rem] transition-all duration-300">
                <div className="h-6 flex items-end justify-center w-full">
                  {carry && <Digit char={carry} isBlue={isHighlighted || isRemediation} isCarry />}
                  {regroup && <Digit char={regroup.val} isBlue={isHighlighted || isRemediation} isCarry />}
                </div>

                <Digit 
                  char={paddedTop[colIdx]} 
                  isBlue={isHighlighted} 
                  hasSlash={regroup?.slash}
                />
                <Digit char={paddedBottom[colIdx]} isBlue={isHighlighted} />
                <div className="w-full h-[2.5px] bg-slate-900 my-2 rounded-full" />

                {isMultiplication && step.subRows?.map((row, rIdx) => {
                   const paddedRow = pad(row.val, maxLength);
                   return (
                     <Digit 
                        key={rIdx} 
                        char={paddedRow[colIdx]} 
                        isBlue={row.active} 
                        isGray={!row.active && step.subRows.some(sr => sr.active)}
                     />
                   );
                })}

                {isMultiplication && step.subRows?.length > 1 && (
                   <div className="w-full h-[2.5px] bg-slate-900 my-2 rounded-full" />
                )}

                {isLastStep && !isRemediation && isDigitSlot ? (
                  <DigitInput 
                    colIdx={colIdx} 
                    value={inputs[colIdx]} 
                    onChange={onInputChange} 
                    isAnswered={isAnswered} 
                    isCorrect={isCorrect} 
                  />
                ) : (
                  <Digit char={resultChar} isBlue={(isRemediation && isHighlighted) || (!isRemediation && (!step.highlights?.length || isHighlighted))} />
                )}
              </div>
            );
          })}
        </div>
      </div>

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
                      className={`min-w-[180px] px-10 py-4 rounded-full text-white font-bold transition-all active:scale-95 flex items-center justify-center gap-2
                          ${mode === 'remediation' 
                            ? (isLastStep ? 'bg-slate-800' : 'bg-emerald-500 hover:bg-emerald-600')
                            : (isAnswered ? 'bg-slate-800' : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200/50')
                          }
                      `}
                  >
                      <span className="text-base font-bold">
                        {mode === 'remediation' 
                          ? (isLastStep ? (showHelp ? "Back to Problem" : "Got it") : "Next Step")
                          : (isAnswered ? "Retry" : "Submit Answer")
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
