'use client';

import React, { useState } from 'react';
import styles from './InteractiveLessonBlock.module.css';
import { renderLatexToHtml } from '@/components/practice/latexUtils';

function parseHtmlWithLatex(html) {
  if (!html) return '';
  return html.replace(/\\\((.*?)\\\)|\\\[(.*?)\\\]/gs, (match, inlineTex, displayTex) => {
    if (inlineTex) return renderLatexToHtml(inlineTex, false);
    if (displayTex) return renderLatexToHtml(displayTex, true);
    return match;
  });
}

export default function InteractiveLessonBlock({ block, idx, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState({}); // 'correct', 'incorrect', null

  const handleInputChange = (id, val) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
    setStatus(prev => ({ ...prev, [id]: null }));
  };

  const checkAnswer = (id) => {
    const interaction = block.interactions?.[id];
    if (!interaction) return;

    const isCorrect = answers[id]?.trim() === interaction.correct;
    setStatus(prev => ({ ...prev, [id]: isCorrect ? 'correct' : 'incorrect' }));
    
    if (isCorrect && onComplete) {
      onComplete(id);
    }
  };

  const renderContent = () => {
    const html = block.html || "";
    // Replace [[id]] with input components
    const parts = html.split(/(\[\[.*?\]\])/g);

    return parts.map((part, i) => {
      const match = part.match(/\[\[(.*?)\]\]/);
      if (match) {
        const id = match[1];
        const interaction = block.interactions?.[id];
        if (!interaction) return part;

        return (
          <span key={i} className={styles.inputWrapper}>
            <input
              type="text"
              className={`${styles.inlineInput} ${status[id] === 'correct' ? styles.correct : ''} ${status[id] === 'incorrect' ? styles.incorrect : ''}`}
              value={answers[id] || ''}
              onChange={(e) => handleInputChange(id, e.target.value)}
              onBlur={() => checkAnswer(id)}
              onKeyDown={(e) => e.key === 'Enter' && checkAnswer(id)}
              placeholder={interaction.placeholder || '...'}
            />
            {status[id] === 'correct' && <span className={styles.checkMark}>✓</span>}
          </span>
        );
      }
      return <span key={i} dangerouslySetInnerHTML={{ __html: parseHtmlWithLatex(part) }} />;
    });
  };

  const blockClass = block.type === 'mathSentence' || block.type === 'mathBlock' 
    ? styles.mathBlock 
    : styles.textBlock;

  return (
    <div className={blockClass}>
      {renderContent()}
    </div>
  );
}
