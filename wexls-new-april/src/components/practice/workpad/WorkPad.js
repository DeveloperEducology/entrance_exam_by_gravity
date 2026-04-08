"use client";

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Eraser, Trash2, X, Maximize2 } from 'lucide-react';
import styles from './WorkPad.module.css';

export default function WorkPad({ isOpen, onClose }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pencil');
  
  // Basic Canvas Setup
  useEffect(() => {
    if (isOpen) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight - 80;
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3b82f6';
    }
  }, [isOpen]);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = tool === 'pencil' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = tool === 'pencil' ? 3 : 20;
    ctx.globalCompositeOperation = tool === 'pencil' ? 'source-over' : 'destination-out';
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.overlay}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className={styles.toolbar}>
             <button className={`${styles.tool} ${tool === 'pencil' ? styles.active : ''}`} onClick={() => setTool('pencil')}><Pencil size={20} /></button>
             <button className={`${styles.tool} ${tool === 'eraser' ? styles.active : ''}`} onClick={() => setTool('eraser')}><Eraser size={20} /></button>
             <button className={styles.tool} onClick={clearCanvas}><Trash2 size={20} /></button>
             <div className={styles.divider} />
             <button className={styles.close} onClick={onClose}><X size={20} /></button>
          </div>
          <canvas 
            ref={canvasRef}
            className={styles.canvas}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          <div className={styles.footer}>
             <span className={styles.hint}>Sketch your work here...</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
