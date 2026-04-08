"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Volume2, 
    Lightbulb, 
    PenTool, 
    ChevronRight, 
    History, 
    Trophy, 
    Flame, 
    CheckCircle, 
    XCircle,
    Settings,
    ArrowRight
} from 'lucide-react';
import Base10Representer from '@/components/practice/base-10/Base10Blocks';
import ShadeGrid from '@/components/practice/shade-grid/ShadeGrid';
import { ProgressBar } from '@/components/practice/hud/HUD';
import WorkPad from '@/components/practice/workpad/WorkPad';
import styles from '../PracticeClassic.module.css';

/**
 * HIGH-SITUATIONAL PRACTICE LAB (Classic UI)
 * Meticulously aligned with WEXLS visual identity.
 */
export default function PracticeLab({ params }) {
  const { microskillId } = React.use(params);
  
  // SESSION STATE
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState({ score: 0, tokens: 0, stage: 1, time: 0 });
  const [answer, setAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isWorkPadOpen, setIsWorkPadOpen] = useState(false);

  // FETCH QUESTIONS FROM API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/questions/${microskillId}`);
        const data = await res.json();
        if (data.success) {
          setQuestions(data.questions);
          // NEW: Transform URL to use human-readable Template ID instead of GUID
          if (data.questions[0]?.template_id) {
             const newUrl = `/practice/${data.questions[0].template_id}`;
             window.history.replaceState({ path: newUrl }, "", newUrl);
          }
        }
      } catch (err) {
        console.error("Failed to load lab:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [microskillId]);

  // TIMER
  useEffect(() => {
    const timer = setInterval(() => {
        setSession(prev => ({ ...prev, time: prev.time + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];

  const handleSubmit = () => {
    if (!currentQuestion) return;
    
    let isCorrect = false;
    const target = currentQuestion.correct_answer;
    
    if (typeof target === 'object' && !Array.isArray(target) && target !== null) {
        isCorrect = Object.keys(target).every(k => 
            answer && answer[k] && String(answer[k]).toLowerCase().trim() === String(target[k]).toLowerCase().trim()
        );
    } else {
        isCorrect = String(answer).toLowerCase().trim() === String(target).toLowerCase().trim();
    }
    
    setFeedback({
      isCorrect,
      solution: typeof currentQuestion.solution === 'string' ? { steps: [{ text: currentQuestion.solution }] } : currentQuestion.solution
    });

    setSession(prev => {
      let { score, tokens, stage } = prev;
      if (isCorrect) {
        score = Math.min(100, score + 12);
        tokens += 1;
        if (tokens > 0 && tokens % 5 === 0) stage = Math.min(4, stage + 1);
      } else {
        score = Math.max(0, score - 8);
        tokens = Math.max(0, tokens - 1);
      }
      return { ...prev, score, tokens, stage };
    });
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswer(null);
      setFeedback(null);
    } else {
      // FOR DYNAMIC SKILLS: FETCH NEXT SEED
      try {
        const res = await fetch(`/api/questions/${microskillId}`);
        const data = await res.json();
        if (data.success && data.questions.length > 0) {
            setQuestions(prev => [...prev, ...data.questions]);
            setCurrentIndex(prev => prev + 1);
            setAnswer(null);
            setFeedback(null);
        } else {
            window.location.href = "/";
        }
      } catch (e) {
        window.location.href = "/";
      }
    }
  };

  if (loading) return (
     <div className={styles.loadingContainer}>
        <div className={styles.loaderPulse} />
        <p>Generating Practice Set...</p>
     </div>
  );

  if (!currentQuestion) return (
     <div className={styles.loadingContainer}>
        <h3>No Content Found</h3>
        <p>Try selecting another skill.</p>
        <button onClick={() => window.location.href = "/"}>Back</button>
     </div>
  );

  return (
    <div className={styles.learningLab}>
      {/* HUD HEADER */}
      <header className={styles.labHeader}>
         <div className={styles.logoSection}>
            <div className={styles.logo}>WEXLS</div>
            <div className={styles.headerTitle}>{currentQuestion.title || "Mathematics Mastery"}</div>
         </div>
         
         <div className={styles.hudGroup}>
            <StatCard label="QUESTIONS" value={currentIndex + 1} />
            <StatCard label="TIME" value={formatTime(session.time)} />
            <StatCard label="SMARTSCORE" value={session.score} />
            <StatCard label="LEVEL" value={session.score > 70 ? "Challenging" : "Easy"} />
         </div>
      </header>

      {/* BREADCRUMBS & POLICY TRACKING */}
      <div className={styles.breadcrumb}>
         <span>Skill Explorer</span> <ChevronRight size={14} />
         <span>Grade 3</span> <ChevronRight size={14} />
         <span>Math</span> <ChevronRight size={14} />
         <b style={{ color: "#334155" }}>{currentQuestion?.template_id?.toUpperCase() || currentQuestion?.id?.slice(0, 8).toUpperCase()}</b>
      </div>

      <main className={styles.labMain}>
         {/* MAIN INTERACTIVE CARD */}
         <section className={styles.questionSide}>
            <div className={styles.mainCard}>
               <button className={styles.learnExample}>
                  <Lightbulb size={16} /> Learn with an example
               </button>

               <div className={styles.questionContent}>
                  <div className={styles.questionTextContainer}>
                     <button className={styles.speakerBtn} onClick={() => speak(currentQuestion.question_text)}>
                        <Volume2 size={24} />
                     </button>
                     <h2 className={styles.questionText}>{currentQuestion.question_text || "Solve the problem below:"}</h2>
                  </div>

                  <div className={styles.interactionBox}>
                     <QuestionInteraction 
                        type={currentQuestion.type}
                        parts={currentQuestion.parts}
                        answer={answer}
                        setAnswer={setAnswer}
                        feedback={feedback}
                        options={currentQuestion.options}
                        questionText={currentQuestion.question_text}
                     />
                  </div>
               </div>

               <button className={styles.workItOut} onClick={() => setIsWorkPadOpen(true)}>
                  <PenTool size={16} /> Work it out
               </button>

                <AnimatePresence>
                   {feedback && (
                    <motion.div 
                        className={styles.feedbackRegion}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {feedback.isCorrect ? (
                            <div className={styles.correctOverlay} style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1, color: '#065f46' }}>
                                <CheckCircle size={28} />
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Brilliant!</div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>You correctly added the numbers.</div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.solutionContainer}>
                                <div className={styles.solutionTab}>
                                    <span className={styles.tabText}>solution</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem', color: '#991b1b' }}>
                                    <XCircle size={28} />
                                    <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Not quite. Check the solution.</div>
                                </div>
                                
                                <div className={styles.walkthroughBox}>
                                    {(currentQuestion.solution_steps || []).map((step, sIdx) => (
                                        <div key={sIdx} style={{ marginBottom: '2.5rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: '#1e293b' }}>
                                                {step.instruction}
                                            </div>
                                            <div className={styles.solutionGrid} style={{ display: 'inline-grid', gap: '8px', gridTemplateColumns: `repeat(${currentQuestion.gridCols}, 32px)`, fontFamily: 'Roboto Mono', fontSize: '1.2rem', fontWeight: 600 }}>
                                                {/* Rendering individual digits with highlighting */}
                                                {step.grid_state.map((cell, cIdx) => (
                                                    <div key={cIdx} style={{ 
                                                        gridRow: cell.r + 1, gridColumn: cell.c + 1,
                                                        color: cell.highlight ? '#0073af' : (cell.isCarry ? '#059669' : '#1e293b'),
                                                        fontSize: cell.isCarry ? '0.8rem' : '1.2rem',
                                                        textAlign: 'center',
                                                        borderBottom: cell.r === 2 ? '2px solid #334155' : 'none'
                                                    }}>
                                                        {cell.prefix} {cell.content}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ marginTop: '1rem', fontWeight: 800, fontSize: '1.2rem', color: '#0073af' }}>
                                        The sum is {currentQuestion.finalSum}.
                                    </div>
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', width: '100%' }}>
                            <button className={styles.primaryBtn} onClick={handleNext} style={{ backgroundColor: feedback.isCorrect ? '#059669' : '#dc2626', width: 'auto' }}>
                               Next <ArrowRight size={18} />
                            </button>
                        </div>
                    </motion.div>
                   )}
                  {!feedback && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                        <button 
                            className={styles.choiceBtn} 
                            style={{ margin: 0, width: 'auto', backgroundColor: '#0073af', color: 'white', borderColor: '#0073af' }}
                            onClick={handleSubmit}
                            disabled={!answer}
                        >
                            Submit
                        </button>
                    </div>
                  )}
               </AnimatePresence>
            </div>
         </section>

         {/* SIDEBAR */}
         <aside className={styles.sidebar}>
            {/* SMARTSCORE CARD */}
            <div className={styles.sideCard}>
               <div className={`${styles.cardHeader} ${styles.blueHeader}`}>
                  <Trophy size={14} /> SMARTSCORE
               </div>
               <div className={styles.cardBody}>
                  <div className={styles.scoreLarge}>{session.score}</div>
                  <div className={styles.badgeGroup}>
                     <span className={`${styles.badge} ${styles.badgeBlue}`}>EASY</span>
                     <span className={`${styles.badge} ${styles.badgeGreen}`}>WARMUP</span>
                  </div>
               </div>
            </div>

            {/* CHALLENGE CARD */}
            <div className={styles.sideCard}>
               <div className={`${styles.cardHeader} ${styles.orangeHeader}`}>
                  <Flame size={14} /> CHALLENGE
               </div>
               <div className={styles.cardBody}>
                  <div className={styles.challengeTitle}>Stage {session.stage} of 3</div>
                  <div className={styles.challengeSub}>Collect 5 tokens</div>
                  <div className={styles.tokenList}>
                     {[1, 2, 3, 4, 5].map(t => (
                        <div key={t} className={`${styles.tokenCircle} ${ (session.tokens % 5) >= t ? styles.tokenFilled : ''}`} />
                     ))}
                  </div>
               </div>
            </div>

            <div className={styles.teacherLink}>
               <Settings size={14} /> Teacher tools <ChevronRight size={14} />
            </div>
         </aside>
      </main>

      <WorkPad isOpen={isWorkPadOpen} onClose={() => setIsWorkPadOpen(false)} />
    </div>
  );
}

function StatCard({ label, value }) {
    return (
        <div className={styles.statCard}>
            <div className={styles.statLabel}>{label}</div>
            <div className={styles.statValue}>{value}</div>
        </div>
    );
}

function QuestionInteraction({ type, parts, answer, setAnswer, feedback, options, questionText }) {
    // 0. DEFENSIVE DATA HYDRATION
    let activeParts = [];
    try {
        activeParts = typeof parts === 'string' ? JSON.parse(parts) : (parts || []);
    } catch (e) {
        console.warn("Interaction Renderer: Failed to hydrate parts", parts);
        activeParts = [];
    }

    // 1. SMART TABLE DETECTION
    const gridPart = activeParts.find(p => ['smarttable', 'grid', 'addition_grid'].includes(p.type?.toLowerCase()));
    
    // 2. DEDUPLICATE INSTRUCTIONS
    // Filter out parts that are already represented as the main question headline
    const uniqueInstructions = activeParts.filter(p => 
        p.type === 'text' && 
        p.content?.trim() !== questionText?.trim()
    );

    return (
        <div className="interaction-workspace" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* RENDER UNIQUE INSTRUCTIONAL PARTS */}
            {uniqueInstructions.map((tp, idx) => (
                <div key={idx} style={{ fontSize: '1.15rem', color: '#64748b', fontWeight: 600, fontStyle: 'italic', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                    {tp.content}
                </div>
            ))}

            {/* RENDER GRID IF DETECTED */}
            {gridPart ? (
                <div className={styles.gridWorkspace}>
                    <div 
                        className={styles.mathGrid}
                        style={{ gridTemplateColumns: `repeat(${gridPart.config?.cols || 3}, 58px)` }}
                    >
                        {gridPart.cells?.map((cell, idx) => {
                            const isInput = cell.type === 'input';
                            const isCarry = isInput && cell.id?.startsWith('c');
                            return (
                                <div key={idx} style={{ 
                                    gridRow: cell.r + 1, 
                                    gridColumn: cell.c + 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    minHeight: '64px'
                                }}>
                                    {isInput ? (
                                        <input 
                                            type="text"
                                            maxLength={2}
                                            autoComplete="off"
                                            className={isCarry ? styles.carryInput : styles.answerInput}
                                            value={(answer && answer[cell.id]) || ''}
                                            onChange={(e) => setAnswer(prev => ({ ...prev, [cell.id]: e.target.value }))}
                                            disabled={feedback}
                                        />
                                    ) : (
                                        <div className={styles.cellDigit}>
                                            {cell.prefix && <span className={styles.cellPrefix} style={{ left: '-45px', top: '4px' }}>{cell.prefix}</span>}
                                            {cell.content}
                                            {/* Column Math Divider (Rendered below the last addend row) */}
                                            {cell.r === (gridPart.config?.rows || 4) - 2 && (
                                                <div 
                                                    className={styles.sumDivider} 
                                                    style={{ 
                                                        width: `${(gridPart.config?.cols || 3) * 64}px`, 
                                                        position: 'absolute', 
                                                        left: '-32px', 
                                                        bottom: '-28px' // Pushed further down to avoid overlap
                                                    }} 
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                /* FALLBACKS FOR OTHER TYPES (MCQ, BASE-10, etc) */
                <InteractionRouter 
                    type={type} 
                    activeParts={activeParts} 
                    answer={answer} 
                    setAnswer={setAnswer} 
                    feedback={feedback} 
                    options={options} 
                />
            )}
        </div>
    );
}

/**
 * Sub-router to keep QuestionInteraction clean
 */
function InteractionRouter({ type, activeParts, answer, setAnswer, feedback, options }) {
    // 2. MCQ HANDLER
    if (type === 'mcq' || (options && options.length > 0)) {
        const choices = typeof options === 'string' ? JSON.parse(options) : (options || []);
        return (
            <div style={{ width: '100%' }}>
                {choices.map((choice, idx) => (
                    <button 
                        key={idx}
                        className={`${styles.choiceBtn} ${answer === choice ? styles.choiceSelected : ''}`}
                        onClick={() => setAnswer(choice)}
                        disabled={feedback}
                    >
                        {choice}
                    </button>
                ))}
            </div>
        );
    }

    if (type === 'place_value_blocks') {
        const props = activeParts[0]?.props || {};
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <Base10Representer {...props} />
                <input 
                    type="text" 
                    placeholder="Enter answer" 
                    className={styles.choiceBtn}
                    style={{ cursor: 'text' }}
                    value={answer || ''}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={feedback}
                />
            </div>
        );
    }
    
    if (type === 'shadeGrid') {
        return (
            <ShadeGrid 
                rows={activeParts[0]?.props?.rows || 10} 
                cols={activeParts[0]?.props?.cols || 1} 
                onChange={(count) => setAnswer(count)}
            />
        );
    }

    // Default
    return (
        <input 
            type="text" 
            placeholder="Type your answer here..." 
            className={styles.choiceBtn}
            style={{ cursor: 'text', maxWidth: '300px' }}
            value={answer || ''}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={feedback}
        />
    );
}

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}
