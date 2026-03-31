'use client';

import { useState } from 'react';
import FillInTheBlankRenderer from '@/components/practice/FillInTheBlankRenderer';
import { generateMultiplicationExplanation } from '@/components/practice/multiplicationUtils';
import QuestionParts from '@/components/practice/QuestionParts';

const MOCK_QUESTION = {
  id: 'mult_123',
  type: 'fillInTheBlank',
  questionText: 'Multiply.',
  parts: [
    {
      id: 'v_mult_1',
      type: 'verticalMultiply',
      layout: {
        v1: "123",
        v2: "4",
        ans: "492"
      }
    }
  ],
  correctAnswerText: JSON.stringify({
    v_mult_1: "492"
  })
};

export default function MultiplicationDemo() {
  const [userAnswer, setUserAnswer] = useState({});
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);

  const handleSubmit = () => {
    const isOk = userAnswer['v_mult_1'] === "900";
    setIsCorrect(isOk);
    setIsAnswered(true);
  };

  return (
    <div className="max-w-3xl mx-auto p-12">
      <FillInTheBlankRenderer
        question={MOCK_QUESTION}
        userAnswer={userAnswer}
        onAnswer={setUserAnswer}
        onSubmit={handleSubmit}
        isAnswered={isAnswered}
        isCorrect={isCorrect}
      />
      
      {isAnswered && (
         <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Explanation (Dynamically Generated)</h2>
            <div className="space-y-6">
               {generateMultiplicationExplanation(MOCK_QUESTION.parts[0].layout.v1, MOCK_QUESTION.parts[0].layout.v2).map((section, idx) => (
                  <div key={idx} className="bg-white p-4 border rounded shadow-sm relative overflow-hidden">
                     {/* Simulating the ribbon styles from the page */}
                     <div className={`absolute top-0 left-0 bottom-0 w-8 flex items-center justify-center text-[10px] uppercase font-bold text-white ${section.label === 'review' ? 'bg-[#94c11e]' : 'bg-[#f1a41e]'} [writing-mode:vertical-lr]`}>
                        {section.label}
                     </div>
                     <div className="ml-10">
                        <h4 className="text-sm font-bold text-slate-500 mb-2">{section.title}</h4>
                        <QuestionParts parts={section.parts} />
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
}
