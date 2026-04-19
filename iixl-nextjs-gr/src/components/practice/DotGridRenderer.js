'use client';

import React, { useState, useEffect } from 'react';
import SpeakerButton from './SpeakerButton';
import styles from './DotGridRenderer.module.css';

export default function DotGridRenderer({
    question,
    userAnswer,
    onAnswer,
    isAnswered,
    isCorrect,
    renderTextWithBlanks // We'll pass this or use a similar helper
}) {
    // Access the shared Markdown helper from FillInTheBlank if possible, 
    // or we'll define a local version for the instruction.
    const renderMarkdown = (text) => {
        if (!text) return null;
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const config = question.adaptiveConfig || {};
    const rows = config.rows || 10;
    const cols = config.cols || 20;
    const dotSpacing = config.spacing || 30;
    
    const [selectedDot, setSelectedDot] = useState(null);
    const [lines, setLines] = useState(userAnswer?.lines || []);
    
    useEffect(() => {
        if (userAnswer?.lines) {
            setLines(userAnswer.lines);
        }
    }, [userAnswer]);

    const handleDotClick = (r, c) => {
        if (isAnswered) return;
        
        const dotId = `${r}-${c}`;
        
        if (selectedDot) {
            if (selectedDot !== dotId) {
                // Create a new line
                const newLine = [selectedDot, dotId];
                // Avoid duplicates
                const lineExists = lines.some(l => 
                    (l[0] === newLine[0] && l[1] === newLine[1]) || 
                    (l[0] === newLine[1] && l[1] === newLine[0])
                );
                
                if (!lineExists) {
                    const newLines = [...lines, newLine];
                    setLines(newLines);
                    onAnswer({ lines: newLines });
                }
            }
            setSelectedDot(null);
        } else {
            setSelectedDot(dotId);
        }
    };

    const removeLine = (index) => {
        if (isAnswered) return;
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines);
        onAnswer({ lines: newLines });
    };

    const clearAll = () => {
        if (isAnswered) return;
        setLines([]);
        setSelectedDot(null);
        onAnswer({ lines: [] });
    };

    const getDotPos = (id) => {
        const [r, c] = id.split('-').map(Number);
        return {
            x: c * dotSpacing + dotSpacing,
            y: r * dotSpacing + dotSpacing
        };
    };

    return (
        <div className={`${styles.container} ${isAnswered ? (isCorrect ? styles.answeredCorrect : styles.answeredIncorrect) : ''}`}>
            <div className={styles.header}>
                <div className={styles.instructionWrap}>
                    {Boolean(question.hasAudio !== false) && (
                        <SpeakerButton text={question.questionText} className={styles.speaker} />
                    )}
                    <h3 className={styles.instruction}>
                        {renderMarkdown(question.questionText || "Draw on the grid")}
                    </h3>
                </div>
                <div className={styles.controls}>
                    <button onClick={clearAll} className={styles.clearBtn} disabled={isAnswered}>Clear All</button>
                </div>
            </div>

            <div className={styles.gridWrapper}>
                <svg 
                    width={cols * dotSpacing + dotSpacing} 
                    height={rows * dotSpacing + dotSpacing}
                    className={styles.svg}
                >
                    {/* Render Lines */}
                    {lines.map((line, i) => {
                        const p1 = getDotPos(line[0]);
                        const p2 = getDotPos(line[1]);
                        return (
                            <g key={i} className={styles.lineGroup}>
                                <line 
                                    x1={p1.x} y1={p1.y} 
                                    x2={p2.x} y2={p2.y} 
                                    className={styles.line}
                                />
                                {!isAnswered && (
                                    <circle 
                                        cx={(p1.x + p2.x) / 2} 
                                        cy={(p1.y + p2.y) / 2} 
                                        r="8" 
                                        className={styles.deleteHandle}
                                        onClick={() => removeLine(i)}
                                    />
                                )}
                            </g>
                        );
                    })}

                    {/* Render Temporary Line */}
                    {selectedDot && (
                        <circle 
                            cx={getDotPos(selectedDot).x} 
                            cy={getDotPos(selectedDot).y} 
                            r={dotSpacing/3} 
                            className={styles.selectionPulse} 
                        />
                    )}

                    {/* Render Dots */}
                    {Array.from({ length: rows }).map((_, r) => 
                        Array.from({ length: cols }).map((_, c) => {
                            const pos = getDotPos(`${r}-${c}`);
                            const isSelected = selectedDot === `${r}-${c}`;
                            return (
                                <circle 
                                    key={`${r}-${c}`}
                                    cx={pos.x} cy={pos.y} 
                                    r="3" 
                                    className={`${styles.dot} ${isSelected ? styles.dotSelected : ''}`}
                                    onClick={() => handleDotClick(r, c)}
                                />
                            );
                        })
                    )}
                </svg>
            </div>

            {isAnswered && (
                <div className={`${styles.feedback} ${isCorrect ? styles.correct : styles.incorrect}`}>
                    {isCorrect ? "Well done!" : "Not quite. Check the solution below."}
                </div>
            )}
        </div>
    );
}
