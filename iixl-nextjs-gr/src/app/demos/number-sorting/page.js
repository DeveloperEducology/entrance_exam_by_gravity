"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  MeasuringStrategy,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

// --- Utility Functions ---

const isPrime = (num) => {
  if (num <= 1) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
};

const generateNumbers = () => {
  const primes = [];
  const composites = [];
  
  // Get 2 unique primes
  while (primes.length < 2) {
    const n = Math.floor(Math.random() * 48) + 2;
    if (isPrime(n) && !primes.includes(n)) primes.push(n);
  }
  
  // Get 2 unique composites
  while (composites.length < 2) {
    const n = Math.floor(Math.random() * 48) + 4;
    if (!isPrime(n) && !composites.includes(n)) composites.push(n);
  }

  // Combine and shuffle
  return [...primes, ...composites].sort(() => Math.random() - 0.5).map((val, idx) => ({
    id: `num-${val}-${idx}`,
    value: val
  }));
};

// --- Components ---

function DraggableNumber({ id, value, isSelected, onSelect, isOverlay, isDragging: isDraggingProp }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style = { 
    transform: CSS.Translate.toString(transform),
    touchAction: 'none'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(id);
      }}
      className={`
        flex items-center justify-center font-black rounded-2xl select-none cursor-pointer
        transition-all duration-200 border-2 text-xl sm:text-2xl w-full h-full
        ${isOverlay ? 'scale-110 shadow-2xl rotate-2 z-[1000] bg-blue-600 border-blue-700 text-white' : ''}
        ${isDragging && !isOverlay ? 'opacity-0' : 'opacity-100'}
        ${isSelected ? 'ring-4 ring-amber-300 bg-amber-500 border-amber-600 z-50 text-white shadow-lg' : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-blue-400'}
      `}
    >
      {value}
    </div>
  );
}

function DropZone({ id, children, isTarget, onSlotClick, hint, minHeight = "80px", isBucket = false }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`flex flex-col gap-2 ${isBucket ? 'w-full' : ''}`}>
      <div
        ref={setNodeRef}
        onClick={() => onSlotClick?.(id)}
        style={{ minHeight }}
        className={`
          rounded-[1.5rem] border-2 transition-all duration-300 relative p-3 flex flex-wrap content-start gap-2 justify-center
          ${isOver ? 'bg-blue-50 border-blue-400 scale-[1.02] shadow-md z-10' : 'bg-slate-50 border-slate-100'}
          ${isTarget && !children ? 'border-amber-400 border-dashed animate-pulse bg-amber-50' : 'border-dashed'}
          ${isBucket ? 'min-h-[180px] rounded-[2rem] border-4' : 'w-20 sm:w-24 h-20 sm:h-24'}
        `}
      >
        <AnimatePresence>
          {children}
        </AnimatePresence>
        {!React.Children.count(children) && !isOver && hint && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold italic text-xs px-2 text-center select-none pointer-events-none">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [bankSlots, setBankSlots] = useState({ 'bank-0': null, 'bank-1': null, 'bank-2': null, 'bank-3': null });
  const [buckets, setBuckets] = useState({ prime: [], composite: [] });
  const [activeId, setActiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const startNewQuestion = useCallback(() => {
    const nums = generateNumbers();
    const newBank = {};
    nums.forEach((num, i) => {
      newBank[`bank-${i}`] = num;
    });
    setBankSlots(newBank);
    setBuckets({ prime: [], composite: [] });
    setSelectedId(null);
    setShowSuccess(false);
  }, []);

  useEffect(() => {
    startNewQuestion();
  }, [startNewQuestion]);

  const sensors = useSensors(useSensor(PointerSensor, { 
    activationConstraint: { distance: 5 } 
  }));

  const handleDragStart = (e) => {
    setActiveId(e.active.id);
    setSelectedId(null);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveId(null);

    if (over) {
      const targetId = over.id;
      
      // Find the dragged item in any current slot
      let draggedItem = null;
      let sourceKey = null;
      let sourceType = null;

      Object.entries(bankSlots).forEach(([key, val]) => {
        if (val?.id === active.id) { draggedItem = val; sourceKey = key; sourceType = 'bank'; }
      });
      if (!draggedItem) {
        Object.entries(buckets).forEach(([key, list]) => {
          const found = list.find(i => i.id === active.id);
          if (found) { draggedItem = found; sourceKey = key; sourceType = 'bucket'; }
        });
      }

      if (!draggedItem) return;

      // Logic for moving/swapping
      if (targetId.startsWith('bank-')) {
        const itemAtTarget = bankSlots[targetId];
        
        setBankSlots(prev => ({
          ...prev,
          [targetId]: draggedItem,
          ...(sourceType === 'bank' ? { [sourceKey]: itemAtTarget } : {})
        }));

        if (sourceType === 'bucket') {
          setBuckets(prev => {
            const nextList = prev[sourceKey].filter(i => i.id !== draggedItem.id);
            if (itemAtTarget) nextList.push(itemAtTarget);
            return { ...prev, [sourceKey]: nextList };
          });
        }
      } else if (targetId === 'prime' || targetId === 'composite') {
        setBuckets(prev => ({
          ...prev,
          [targetId]: [...prev[targetId], draggedItem]
        }));
        
        if (sourceType === 'bank') {
          setBankSlots(prev => ({ ...prev, [sourceKey]: null }));
        } else {
          setBuckets(prev => ({
            ...prev,
            [sourceKey]: prev[sourceKey].filter(i => i.id !== draggedItem.id)
          }));
        }
      }
    }
  };

  const handleLabelInteraction = (id) => {
    setSelectedId(selectedId === id ? null : id);
  };

  const handleSlotClick = (targetId) => {
    if (!selectedId) return;

    let draggedItem = null;
    let sourceKey = null;
    let sourceType = null;

    Object.entries(bankSlots).forEach(([key, val]) => {
      if (val?.id === selectedId) { draggedItem = val; sourceKey = key; sourceType = 'bank'; }
    });
    if (!draggedItem) {
      Object.entries(buckets).forEach(([key, list]) => {
        const found = list.find(i => i.id === selectedId);
        if (found) { draggedItem = found; sourceKey = key; sourceType = 'bucket'; }
      });
    }

    if (!draggedItem) return;

    if (targetId.startsWith('bank-')) {
      if (bankSlots[targetId]) return; // Only move to empty bank slots via click

      setBankSlots(prev => ({ ...prev, [targetId]: draggedItem, [sourceKey]: null }));
      if (sourceType === 'bucket') {
        setBuckets(prev => ({ ...prev, [sourceKey]: prev[sourceKey].filter(i => i.id !== selectedId) }));
      }
    } else {
      setBuckets(prev => ({ ...prev, [targetId]: [...prev[targetId], draggedItem] }));
      if (sourceType === 'bank') {
        setBankSlots(prev => ({ ...prev, [sourceKey]: null }));
      } else {
        setBuckets(prev => ({ ...prev, [sourceKey]: prev[sourceKey].filter(i => i.id !== selectedId) }));
      }
    }
    setSelectedId(null);
  };

  const checkAnswer = () => {
    const isBankEmpty = Object.values(bankSlots).every(v => v === null);
    if (!isBankEmpty) {
      alert("Sort all numbers before submitting!");
      return;
    }

    const primeCorrect = buckets.prime.every(item => isPrime(item.value));
    const compositeCorrect = buckets.composite.every(item => !isPrime(item.value));

    if (primeCorrect && compositeCorrect) {
      setShowSuccess(true);
      setScore(s => s + 1);
      setTimeout(() => {
        setRound(r => r + 1);
        startNewQuestion();
      }, 1500);
    } else {
      alert("Some numbers are in the wrong bucket. Check your math!");
    }
  };

  const findActiveValue = () => {
    if (!activeId) return '';
    const inBank = Object.values(bankSlots).find(i => i?.id === activeId);
    if (inBank) return inBank.value;
    const inPrime = buckets.prime.find(i => i.id === activeId);
    if (inPrime) return inPrime.value;
    const inComp = buckets.composite.find(i => i.id === activeId);
    if (inComp) return inComp.value;
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8 font-sans text-slate-800">
      <div className="w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col relative">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
          <motion.div 
            className="h-full bg-green-500" 
            animate={{ width: `${(score % 10) * 10}%` }} 
          />
        </div>

        <div className="p-6 xs:p-8 sm:p-12">
          <div className="flex justify-between items-center mb-6">
            <div className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
              Round {round}
            </div>
            <div className="text-slate-400 font-bold">Score: <span className="text-slate-900">{score}</span></div>
          </div>

          <h2 className="text-center text-2xl sm:text-3xl font-black mb-10 text-slate-700 leading-tight">
            Sort into <span className="text-blue-600">Prime</span> and <span className="text-indigo-600">Composite</span>.
          </h2>

          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          >
            {/* Number Bank with Fixed Placeholder Slots */}
            <div className="flex justify-center items-center gap-3 sm:gap-4 mb-12 flex-wrap">
              {Object.keys(bankSlots).map((slotId) => (
                <DropZone 
                  key={slotId} 
                  id={slotId} 
                  isTarget={!!selectedId} 
                  onSlotClick={handleSlotClick}
                  minHeight="80px"
                >
                  {bankSlots[slotId] && (
                    <DraggableNumber 
                      id={bankSlots[slotId].id} 
                      value={bankSlots[slotId].value} 
                      isSelected={selectedId === bankSlots[slotId].id}
                      onSelect={handleLabelInteraction}
                    />
                  )}
                </DropZone>
              ))}
            </div>

            {/* Buckets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
              <div className="flex flex-col gap-3">
                <h3 className="text-center font-black text-slate-400 uppercase tracking-widest text-xs">Prime Bucket</h3>
                <DropZone id="prime" isTarget={!!selectedId} onSlotClick={handleSlotClick} isBucket hint="Drop primes here">
                  {buckets.prime.map(item => (
                    <motion.div layout key={item.id} className="w-14 h-14 sm:w-16 sm:h-16">
                      <DraggableNumber id={item.id} value={item.value} onSelect={handleLabelInteraction} isSelected={selectedId === item.id} />
                    </motion.div>
                  ))}
                </DropZone>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-center font-black text-slate-400 uppercase tracking-widest text-xs">Composite Bucket</h3>
                <DropZone id="composite" isTarget={!!selectedId} onSlotClick={handleSlotClick} isBucket hint="Drop composites here">
                  {buckets.composite.map(item => (
                    <motion.div layout key={item.id} className="w-14 h-14 sm:w-16 sm:h-16">
                      <DraggableNumber id={item.id} value={item.value} onSelect={handleLabelInteraction} isSelected={selectedId === item.id} />
                    </motion.div>
                  ))}
                </DropZone>
              </div>
            </div>

            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
              duration: 250,
              easing: 'cubic-bezier(0.18, 0.89, 0.32, 1.28)'
            }}>
              {activeId ? (
                <div className="w-16 h-16 sm:w-20 sm:h-20">
                  <DraggableNumber id={activeId} value={findActiveValue()} isOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <div className="p-8 sm:p-12 pt-0">
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full bg-green-500 text-white py-5 rounded-3xl font-black text-2xl text-center shadow-[0_6px_0_#15803d]">
                EXCELLENT! ✨
              </motion.div>
            ) : (
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-3xl font-black text-xl sm:text-2xl shadow-[0_6px_0_#1e40af] active:shadow-none active:translate-y-1 transition-all"
                onClick={checkAnswer}
              >
                Submit Answer
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
