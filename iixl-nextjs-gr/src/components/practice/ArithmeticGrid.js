
'use client';
import React from 'react';

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

export default function ArithmeticGrid({ 
  operation = 'addition', 
  operands = [], 
  carries = {}, 
  regroups = {}, 
  result = [], 
  highlights = [],
  subRows = [],
  mode = 'static', // 'static' | 'interactive'
  inputs = {},
  onInputChange,
  isAnswered,
  isCorrect,
  showResult = true,
  isLastStep = false
}) {
  if (!operands || operands.length < 2) return null;

  const top = (operands[0] || "").split("");
  const bottom = (operands[1] || "").split("");
  
  const maxLength = Math.max(
    top.length,
    bottom.length,
    result?.length || 0,
    ...(subRows?.map(r => r.val?.length || 0) || [0])
  );

  const pad = (arr, len) => {
    const safeLen = Math.max(0, len - (arr?.length || 0));
    return [...Array(safeLen).fill(" "), ...(arr || [])];
  };

  const paddedTop = pad(top, maxLength);
  const paddedBottom = pad(bottom, maxLength);
  const paddedResult = pad(result || [], maxLength);
  const opChar = operation === 'addition' ? '+' : (operation === 'subtraction' ? '–' : '×');

  return (
    <div className="relative flex items-start p-4">
      {/* Operation Symbol */}
      <div className="flex flex-col items-center mr-6 pt-16">
         <div className="text-4xl h-10 flex items-center text-slate-300 font-light italic">
           {opChar}
         </div>
      </div>

      {/* Grid Columns */}
      <div className="flex">
        {paddedTop.map((_, colIdx) => {
          const isHighlighted = highlights?.includes(colIdx);
          const regroup = regroups?.[colIdx];
          const carry = carries?.[colIdx];
          const resultChar = paddedResult[colIdx];
          const isDigitSlot = /[0-9]/.test(resultChar);

          return (
            <div key={colIdx} className="flex flex-col items-center min-w-[2.25rem] transition-all duration-300">
              {/* Carry / Regroup Row */}
              <div className="h-6 flex items-end justify-center w-full">
                {carry && <Digit char={carry} isBlue={isHighlighted} isCarry />}
                {regroup && <Digit char={regroup.val} isBlue={isHighlighted} isCarry />}
              </div>

              {/* Main Number Rows */}
              <Digit char={paddedTop[colIdx]} isBlue={isHighlighted} hasSlash={regroup?.slash} />
              <Digit char={paddedBottom[colIdx]} isBlue={isHighlighted} />
              
              <div className="w-full h-[2.5px] bg-slate-900 my-2 rounded-full" />

              {/* Multiplication Sub-Rows (Partial Products) */}
              {operation === 'multiplication' && subRows?.map((row, rIdx) => {
                 const paddedRow = pad(row.val, maxLength);
                 return (
                   <Digit 
                      key={rIdx} 
                      char={paddedRow[colIdx]} 
                      isBlue={row.active} 
                      isGray={!row.active && subRows.some(sr => sr.active)}
                   />
                 );
              })}

              {operation === 'multiplication' && subRows?.length > 1 && (
                 <div className="w-full h-[2.5px] bg-slate-900 my-2 rounded-full" />
              )}

              {/* Result Row / Input Row */}
              {showResult && (
                mode === 'interactive' && isLastStep && isDigitSlot ? (
                  <DigitInput 
                    colIdx={colIdx} 
                    value={inputs[colIdx]} 
                    onChange={onInputChange} 
                    isAnswered={isAnswered} 
                    isCorrect={isCorrect} 
                  />
                ) : (
                  <Digit char={resultChar} isBlue={!highlights?.length || isHighlighted} />
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
