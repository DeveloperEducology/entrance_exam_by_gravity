
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

const DigitInput = ({ colIdx, value, onChange, isAnswered, isCorrect, isFirst, isLast }) => (
  <input
    id={`digit-input-${colIdx}`}
    type="text"
    value={value || ""}
    onChange={(e) => onChange(colIdx, e.target.value)}
    disabled={isAnswered}
    className={`w-full h-10 text-center text-2xl font-mono font-bold outline-none transition-all
      ${isFirst ? 'rounded-l-md border-l-2' : 'border-l-2 border-dashed'}
      ${isLast ? 'rounded-r-md border-r-2' : ''}
      border-y-2
      ${isAnswered 
        ? (isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-red-50 border-red-500 text-red-600')
        : 'bg-white border-blue-400 focus:bg-blue-50'
      }
    `}
    placeholder=""
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
  mode = 'static', 
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

  const inputIndices = paddedResult.map((char, i) => (/[0-9]/.test(char) || char === ',') ? i : -1).filter(i => i !== -1);
  const firstInputGroupIdx = inputIndices[0];
  const lastInputGroupIdx = inputIndices[inputIndices.length - 1];

  return (
    <div className="relative flex items-center justify-center p-4 select-none mr-8">
      {/* Grid Columns */}
      <div className="flex items-end">
        {paddedTop.map((_, colIdx) => {
          const isHighlighted = highlights?.includes(colIdx);
          const regroup = regroups?.[colIdx];
          const carry = carries?.[colIdx];
          const resultChar = paddedResult[colIdx];
          const isDigitSlot = /[0-9]/.test(resultChar);
          const isComma = resultChar === ',';
          const isWithinBox = colIdx >= firstInputGroupIdx && colIdx <= lastInputGroupIdx;

          return (
            <div key={colIdx} className={`flex flex-col items-center ${isComma ? 'min-w-[1.2rem]' : 'min-w-[2.5rem]'}`}>
              {/* Carry / Regroup Row */}
              <div className="h-6 flex items-end justify-center w-full">
                {carry && <Digit char={carry} isBlue={isHighlighted} isCarry />}
                {regroup && <Digit char={regroup.val} isBlue={isHighlighted} isCarry />}
              </div>

              {/* Main Number Row 1 */}
              <Digit char={paddedTop[colIdx]} isBlue={isHighlighted} hasSlash={regroup?.slash} />
              
              {/* Main Number Row 2 + Operator */}
              <div className="relative w-full">
                {colIdx === 0 && (
                   <div className="absolute -left-10 top-0 text-3xl font-light text-slate-800">
                     {opChar}
                   </div>
                )}
                <Digit char={paddedBottom[colIdx]} isBlue={isHighlighted} />
              </div>
              
              <div className="w-full h-[1.5px] bg-slate-800" />

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
                 <div className="w-full h-[1.5px] bg-slate-800" />
              )}

              {/* Result Row / Input Row */}
              <div className="w-full mt-2">
                {showResult && (
                  mode === 'interactive' && isLastStep && isWithinBox ? (
                    isDigitSlot ? (
                      <DigitInput 
                        colIdx={colIdx} 
                        value={inputs[colIdx]} 
                        onChange={onInputChange} 
                        isAnswered={isAnswered} 
                        isCorrect={isCorrect} 
                        isFirst={colIdx === firstInputGroupIdx}
                        isLast={colIdx === lastInputGroupIdx}
                      />
                    ) : (
                      <div className={`h-10 flex items-center justify-center text-xl font-mono border-y-2 border-blue-400 bg-white
                        ${colIdx === firstInputGroupIdx ? 'rounded-l-md border-l-2' : 'border-l-2 border-dashed'}
                        ${colIdx === lastInputGroupIdx ? 'rounded-r-md border-r-2' : ''}
                      `}>
                        {resultChar}
                      </div>
                    )
                  ) : (
                    <Digit char={resultChar} isBlue={!highlights?.length || isHighlighted} />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
