'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, RotateCcw, CheckCircle2, AlertCircle, Volume2 } from 'lucide-react';
import styles from './SpeechToText.module.css';

export default function SpeechToText({ 
    targetText, 
    onValidation,
    isAnswered,
    userAnswer
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isCorrect, setIsCorrect] = useState(null);
    const [error, setError] = useState(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep mic on for slow readers
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPart = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcriptPart;
                } else {
                    interim += transcriptPart;
                }
            }

            if (final) {
                setTranscript(prev => prev + ' ' + final);
            }
            setInterimTranscript(interim);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            if (event.error !== 'no-speech') {
                setError(`Error: ${event.error}`);
                setIsRecording(false);
            }
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {}
            }
        };
    }, []);

    const toggleRecording = () => {
        if (isAnswered) return;

        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            setError(null);
            setTranscript('');
            setInterimTranscript('');
            setIsCorrect(null);
            try {
                recognitionRef.current.start();
                setIsRecording(true);
            } catch (e) {
                console.error("Start recording failed:", e);
                setError("Could not start microphone. Please check permissions.");
            }
        }
    };

    const getSimilarity = (str1, str2) => {
        const s1 = str1.split(' ').filter(Boolean);
        const s2 = str2.split(' ').filter(Boolean);
        
        if (s1.length === 0 || s2.length === 0) return 0;
        
        // Simple word-overlap similarity (best for kids)
        let matches = 0;
        const s2Copy = [...s2];
        
        s1.forEach(word => {
            const index = s2Copy.indexOf(word);
            if (index !== -1) {
                matches++;
                s2Copy.splice(index, 1);
            }
        });
        
        const longest = Math.max(s1.length, s2.length);
        return matches / longest;
    };

    const validate = (finalText) => {
        if (!targetText) return;
        
        const clean = (text) => text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ").trim();
        const normalizedTranscript = clean(finalText);
        const normalizedTarget = clean(targetText);

        const similarity = getSimilarity(normalizedTranscript, normalizedTarget);
        console.log(`[SPEECH] Similarity: ${(similarity * 100).toFixed(1)}%`);

        // 80% similarity is usually enough for a child's speech module
        const success = similarity >= 0.8;
        
        setIsCorrect(success);
        if (onValidation) {
            onValidation(success, finalText);
        }
    };

    useEffect(() => {
        if (!isRecording && (transcript || interimTranscript)) {
            validate(transcript + interimTranscript);
        }
    }, [isRecording]);

    // Handle initial state from userAnswer if needed
    useEffect(() => {
        if (isAnswered && userAnswer) {
            setTranscript(userAnswer.transcript || '');
            setIsCorrect(userAnswer.isCorrect);
        }
    }, [isAnswered, userAnswer]);

    return (
        <div className={styles.container}>
            <div className={styles.targetCard}>
                <div className={styles.targetLabel}>Listen and Speak</div>
                <div className={styles.targetText}>{targetText}</div>
                <button 
                    className={styles.speakerBtn}
                    title="Hear the text"
                    onClick={() => {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(targetText);
                        utterance.lang = 'en-US';
                        window.speechSynthesis.speak(utterance);
                    }}
                >
                    <Volume2 size={18} />
                </button>
            </div>

            <div className={styles.micArea}>
                <motion.button
                    whileHover={!isAnswered ? { scale: 1.05 } : {}}
                    whileTap={!isAnswered ? { scale: 0.95 } : {}}
                    onClick={toggleRecording}
                    disabled={isAnswered}
                    className={`${styles.micButton} ${isRecording ? styles.recording : ''}`}
                    style={{ opacity: isAnswered ? 0.5 : 1, cursor: isAnswered ? 'default' : 'pointer' }}
                >
                    {isRecording ? <Square size={32} fill="currentColor" /> : <Mic size={32} />}
                </motion.button>
                
                <AnimatePresence>
                    {isRecording && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={styles.waves}
                        >
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className={styles.wave}
                                    animate={{
                                        scale: [1, 1.8, 2.5],
                                        opacity: [0.5, 0.2, 0],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: i * 0.6,
                                    }}
                                />
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className={styles.transcriptArea}>
                {error ? (
                    <div className={styles.error}><AlertCircle size={16} /> {error}</div>
                ) : (
                    <div className={styles.transcript}>
                        {transcript}
                        <span className={styles.interim}>{interimTranscript}</span>
                        {!transcript && !interimTranscript && !isRecording && (
                            <span className={styles.placeholder}>
                                {isAnswered ? "Recorded audio processed." : "Tap the mic and say the sentence..."}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {isCorrect !== null && !isRecording && (
                <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`${styles.feedback} ${isCorrect ? styles.correct : styles.incorrect}`}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        {isCorrect ? (
                            <><CheckCircle2 size={24} /> Perfect Pronunciation!</>
                        ) : (
                            <><AlertCircle size={24} /> Not quite right</>
                        )}
                    </div>
                    {!isAnswered && (
                        <button className={styles.retryBtn} onClick={toggleRecording}>
                            <RotateCcw size={16} /> Try Again
                        </button>
                    )}
                </motion.div>
            )}
        </div>
    );
}
