import React from 'react';
import styles from './MasterySidebar.module.css';

const MasterySidebar = ({ 
    smartScore = 0, 
    questionsAnswered = 0, 
    time = { mins: '00', secs: '00' },
    streak = 0,
    currentStage = 0,
    tokensCollected = 0,
    tokensNeeded = 5,
    difficulty = 'Easy'
}) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (smartScore / 100) * circumference;

    return (
        <aside className={styles.sidebar}>
            {/* Minimalist Gauge */}
            <div className={styles.glassCard}>
                <div className={styles.gaugeContainer}>
                    <svg className={styles.gaugeSvg} width="100" height="100">
                        <circle
                            className={styles.gaugeBg}
                            cx="50"
                            cy="50"
                            r={radius}
                        />
                        <circle
                            className={styles.gaugeFill}
                            cx="50"
                            cy="50"
                            r={radius}
                            style={{
                                strokeDasharray: circumference,
                                strokeDashoffset: offset,
                                stroke: smartScore >= 80 ? '#22c55e' : (smartScore >= 40 ? '#3b82f6' : '#ef4444')
                            }}
                        />
                    </svg>
                    <div className={styles.scoreOverlay}>
                        <div className={styles.scoreValue}>{smartScore}</div>
                        <div className={styles.scoreLabel}>SMART</div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Stack */}
            <div className={styles.statsStack}>
                <div className={`${styles.glassCard} ${styles.statMiniCard}`}>
                    <div className={styles.miniLabel}>Streak</div>
                    <div className={styles.miniValue}>🔥 {streak}</div>
                </div>
                <div className={`${styles.glassCard} ${styles.statMiniCard}`}>
                    <div className={styles.miniLabel}>Questions</div>
                    <div className={styles.miniValue}>{questionsAnswered}</div>
                </div>
                <div className={`${styles.glassCard} ${styles.statMiniCard}`}>
                    <div className={styles.miniLabel}>Time</div>
                    <div className={styles.miniValue}>{time.mins}:{time.secs}</div>
                </div>
            </div>

            {/* Mastery Journey */}
            <div className={`${styles.glassCard} ${styles.journeyCard}`}>
                <div className={styles.gaugeHeader}>Mastery Journey</div>
                <div className={styles.journeyTimeline}>
                    {[1, 2, 3].map((stage) => (
                        <div key={stage} className={styles.journeyStep}>
                            <div className={`${styles.journeyNode} ${stage <= currentStage + 1 ? styles.activeNode : ''} ${stage <= currentStage ? styles.completedNode : ''}`}>
                                {stage < currentStage + 1 ? '✓' : ''}
                                {stage === currentStage + 1 && <div className={styles.nodePulse} />}
                            </div>
                            <div className={styles.journeyLabel}>Stage {stage}</div>
                            {stage < 3 && <div className={`${styles.journeyLine} ${stage <= currentStage ? styles.activeLine : ''}`} />}
                        </div>
                    ))}
                </div>
                <div className={styles.difficultyBadge}>
                    Level: {difficulty}
                </div>
            </div>
        </aside>
    );
};

export default MasterySidebar;
