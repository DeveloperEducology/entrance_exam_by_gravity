'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './DungeonDash.module.css';

const GAME_SPEED = 0.5; // percent per frame roughly
const PLAYER_X = 10; // 10%
const PLAYER_WIDTH = 10; // obstacle interaction width

export default function DungeonDash() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lane, setLane] = useState(1); // 0, 1, 2
  const [targetType, setTargetType] = useState('even'); // 'even' | 'odd'
  
  const [obstacles, setObstacles] = useState([]);
  const requestRef = useRef();
  const lastObstacleTimeRef = useRef(0);
  
  // To avoid stale closures in requestAnimationFrame
  const stateRef = useRef({
    isPlaying,
    gameOver,
    score,
    lane,
    obstacles,
    targetType
  });

  useEffect(() => {
    stateRef.current = { isPlaying, gameOver, score, lane, obstacles, targetType };
  }, [isPlaying, gameOver, score, lane, obstacles, targetType]);

  // Handle Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!stateRef.current.isPlaying || stateRef.current.gameOver) return;
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setLane(l => Math.max(0, l - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setLane(l => Math.min(2, l + 1));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const generateObstacle = () => {
    let nums = [];
    let hasEven = false;
    let hasOdd = false;
    
    for (let i = 0; i < 3; i++) {
      let num = Math.floor(Math.random() * 99) + 1; // 1 to 99
      nums.push(num);
      if (num % 2 === 0) hasEven = true;
      else hasOdd = true;
    }
    
    if (!hasEven) {
      nums[0] = nums[0] % 2 === 0 ? nums[0] : nums[0] + 1;
    }
    if (!hasOdd) {
      nums[1] = nums[1] % 2 !== 0 ? nums[1] : nums[1] + 1;
    }

    return {
      id: Date.now() + Math.random(),
      x: 100, // Starts at 100% right
      doors: nums,
      passed: false
    };
  };

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setLane(1);
    setTargetType('even');
    setObstacles([{ ...generateObstacle(), x: 100 }]);
    lastObstacleTimeRef.current = performance.now();
  };

  const gameLoop = (time) => {
    if (!stateRef.current.isPlaying || stateRef.current.gameOver) return;

    let { obstacles, lane, score, targetType } = stateRef.current;
    let newGameOver = false;
    let newScore = score;
    let newTargetType = targetType;
    let newObstacles = [...obstacles];
    
    let currentSpeed = GAME_SPEED + Math.min(score * 0.02, 0.5);
    
    // Move obstacles
    for (let i = 0; i < newObstacles.length; i++) {
      let obs = newObstacles[i];
      obs.x -= currentSpeed;

      // Collision Detection
      // player is around 10%. door is around obs.x. width is 100px which is ~12.5% of 800px.
      // So let's check between x=5 and x=15
      if (!obs.passed && obs.x < PLAYER_X + 2 && obs.x > PLAYER_X - 10) {
        obs.passed = true;
        let doorNum = obs.doors[lane];
        
        let isEven = doorNum % 2 === 0;
        let requiresEven = targetType === 'even';
        
        if (isEven !== requiresEven) {
          newGameOver = true;
        } else {
          newScore += 1;
          
          if (newScore === 9) {
            newTargetType = 'odd';
          } else if (newScore >= 19) {
            newTargetType = Math.random() > 0.5 ? 'even' : 'odd';
          }
        }
      }
    }
    
    newObstacles = newObstacles.filter(o => o.x > -20);
    
    let spawnDelay = Math.max(3000 - score * 50, 1500);
    if (time - lastObstacleTimeRef.current > spawnDelay) { // spawn every 3s initially, faster later
      newObstacles.push(generateObstacle());
      lastObstacleTimeRef.current = time;
    }

    if (newGameOver) {
      setGameOver(true);
      setIsPlaying(false);
    } else {
      setObstacles(newObstacles);
      if (newScore !== score) setScore(newScore);
      if (newTargetType !== targetType) setTargetType(newTargetType);
      requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  useEffect(() => {
    if (isPlaying && !gameOver) {
      requestRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, gameOver]);

  return (
    <div className={styles.gameContainer}>
      <div className={styles.sky}></div>
      
      <div className={styles.instructionsPanel}>
        Pass through doors marked with <span style={{color: '#fff', textShadow: '0 0 10px white'}}>{targetType.toUpperCase()} NUMBERS</span>
      </div>
      
      <div className={styles.hud}>
        ⭐ {score}
      </div>

      <div className={`${styles.lane} ${styles.laneTop}`}></div>
      <div className={`${styles.lane} ${styles.laneMiddle}`}></div>
      <div className={`${styles.lane} ${styles.laneBottom}`}></div>

      <div 
        className={`${styles.player} ${styles[`playerLane${lane}`]} ${isPlaying && !gameOver ? styles.runningAnim : ''} ${gameOver ? styles.hitAnim : ''}`}
      >
        🤠
      </div>

      {obstacles.map(obs => (
        <div key={obs.id} className={styles.doorSet} style={{ left: `${obs.x}%` }}>
          {obs.doors.map((num, i) => (
            <div key={i} className={styles.door}>
              <div className={styles.doorPillar}></div>
              <div className={styles.doorCircle}>
                {num}
              </div>
            </div>
          ))}
        </div>
      ))}

      {(!isPlaying && !gameOver) && (
        <div className={styles.overlay}>
          <div className={styles.overlayTitle}>DUNGEON DASH</div>
          <button className={styles.startButton} onClick={startGame}>Start Game</button>
        </div>
      )}

      {gameOver && (
        <div className={styles.overlay}>
          <div className={styles.overlayTitle}>GAME OVER!</div>
          <div style={{ color: 'white', fontSize: '24px', marginBottom: '20px' }}>
            You entered an {stateRef.current.targetType === 'even' ? 'ODD' : 'EVEN'} door.
          </div>
          <div style={{ color: '#E87A5D', fontSize: '32px', fontWeight: 'bold', marginBottom: '30px' }}>Score: {score}</div>
          <button className={styles.startButton} onClick={startGame}>Play Again</button>
        </div>
      )}
    </div>
  );
}
