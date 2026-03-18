'use client';

import { useState } from 'react';
import FillInTheBlankRenderer from '@/components/practice/FillInTheBlankRenderer';
import styles from './demo.module.css';

const DEMO_QUESTIONS = [
    {
        id: 'pattern-demo',
        questionText: 'What row comes next in the pattern?',
        parts: [
            { type: 'text', content: "<div style='display:flex; gap:10px; margin-bottom:15px;'><svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><circle cx='12' cy='12' r='10' fill='#9B9BFF'/></svg></div>", isVertical: true },
            { type: 'text', content: "<div style='display:flex; gap:10px; margin-bottom:15px;'><svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><circle cx='12' cy='12' r='10' fill='#9B9BFF'/></svg></div>", isVertical: true },
            { type: 'text', content: "<div style='display:flex; gap:10px; margin-bottom:15px;'><svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><circle cx='12' cy='12' r='10' fill='#9B9BFF'/></svg></div>", isVertical: true },
            { type: 'text', content: "<div style='display:flex; gap:10px; margin-bottom:25px;'><svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg> <svg viewBox='0 0 24 24' width='40' height='40'><circle cx='12' cy='12' r='10' fill='#9B9BFF'/></svg></div>", isVertical: true },
            {
                type: 'sequence',
                children: [
                    { type: 'input', id: 'p1', maxLength: 2, width: '50px' },
                    { type: 'input', id: 'p2', maxLength: 2, width: '50px' },
                    { type: 'input', id: 'p3', maxLength: 2, width: '50px' },
                    { type: 'input', id: 'p4', maxLength: 2, width: '50px' },
                    { type: 'input', id: 'p5', maxLength: 2, width: '50px' },
                    { type: 'input', id: 'p6', maxLength: 2, width: '50px' }
                ]
            }
        ],
        adaptiveConfig: {
            autoAdvance: true,
            showKeypad: true,
            keypadKeys: [
                { label: "<svg viewBox='0 0 24 24'><path d='M12 2L2 22h20L12 2z' fill='#E0A5F2'/></svg>", value: "🔺" },
                { label: "<svg viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' fill='#9B9BFF'/></svg>", value: "🔵" },
                '⌫'
            ]
        }
    },
    {
        id: 'emoji-demo',
        questionText: 'Which fruit comes next in the sequence?',
        parts: [
            { type: 'text', content: '🍎 🍌 🍎 ' },
            { type: 'input', id: 'fruit_input', maxLength: 2, width: '60px' }
        ],
        adaptiveConfig: {
            // Custom keypad with emojis
            keypadKeys: ['🍎', '🍌', '🍇', '🍉', '⌫']
        }
    },
    {
        id: 'shape-demo',
        questionText: 'Identify the shape that has 3 sides.',
        parts: [
            { type: 'input', id: 'shape_input', maxLength: 10, width: '150px' }
        ],
        adaptiveConfig: {
            // Custom keypad with labels and values (words)
            keypadKeys: [
                { label: '🔴 Circle', value: 'Circle' },
                { label: '🟦 Square', value: 'Square' },
                { label: '🔺 Triangle', value: 'Triangle' },
                '⌫'
            ]
        }
    },
    {
        id: 'string-demo',
        questionText: 'Complete the sentence by choosing the correct word.',
        parts: [
            { type: 'text', content: 'The sky is ' },
            { type: 'input', id: 'color_input', maxLength: 10, width: '120px' }
        ],
        adaptiveConfig: {
            // Custom keypad with full words/strings
            keypadKeys: ['Blue', 'Red', 'Green', 'Yellow', '⌫']
        }
    }
];

export default function KeyboardDemoPage() {
    const [answers, setAnswers] = useState({});

    const handleAnswer = (questionId, newAnswer) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: newAnswer
        }));
    };

    return (
        <div className={styles.pageContainer}>
            <header className={styles.header}>
                <h1>Custom Virtual Keyboard Demo</h1>
                <p>Showcasing emojis, words, and custom strings in the virtual keypad.</p>
            </header>

            <main className={styles.main}>
                {DEMO_QUESTIONS.map((q) => (
                    <section key={q.id} className={styles.demoSection}>
                        <h2>{q.id.replace('-', ' ').toUpperCase()}</h2>
                        <div className={styles.rendererWrapper}>
                            <FillInTheBlankRenderer
                                question={q}
                                userAnswer={answers[q.id] || {}}
                                onAnswer={(val) => handleAnswer(q.id, val)}
                                onSubmit={() => alert(`Submitted: ${JSON.stringify(answers[q.id])}`)}
                                isAnswered={false}
                            />
                        </div>
                    </section>
                ))}
            </main>
        </div>
    );
}
