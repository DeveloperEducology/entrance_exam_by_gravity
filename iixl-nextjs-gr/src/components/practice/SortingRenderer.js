'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  rectIntersection,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { 
  restrictToWindowEdges,
  snapCenterToCursor
} from '@dnd-kit/modifiers';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import styles from './SortingRenderer.module.css';
import QuestionParts from './QuestionParts';
import { isImageUrl, isInlineSvg } from './contentUtils';
import SafeImage from './SafeImage';

const POOL_ID = 'pool';
const SLOT_PREFIX = 'slot-';

const dropAnimationConfig = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

function DraggableItem({ itemId, content, isAnswered, isSelected, onClick, isDraggingActive = false }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: itemId,
    disabled: isAnswered,
  });

  return (
    <motion.div
      layout
      layoutId={`item-${itemId}`}
      ref={setNodeRef}
      className={`${styles.item} ${isAnswered ? styles.disabled : ''} ${isSelected ? styles.selected : ''} ${isDraggingActive ? styles.activeDragging : ''}`}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0 : 1 }}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick(itemId);
        }
      }}
    >
      <div className={styles.itemContent}>{content}</div>
    </motion.div>
  );
}

function DroppableSlot({ id, index, children, isActive, isAnswered, showIndex = true }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: isAnswered,
  });

  return (
    <div
      ref={setNodeRef}
      className={styles.slotSensor}
    >
      <div className={`${styles.slot} ${isOver ? styles.slotOver : ''} ${isActive ? styles.slotActive : ''}`}>
        {showIndex && <div className={styles.slotIndex}>{index + 1}</div>}
        <div className={styles.slotContent}>
          {children}
        </div>
      </div>
    </div>
  );
}

const TOP_PREFIX = 'top-';
const BOTTOM_PREFIX = 'bottom-';

export default function SortingRenderer({
  question,
  userAnswer,
  onAnswer,
  onSubmit,
  isAnswered,
}) {
  const itemIds = useMemo(() => (question.items || []).map((item) => String(item.id)), [question.items]);
  
  const [topSlots, setTopSlots] = useState(Array(itemIds.length).fill(null));
  const [bottomSlots, setBottomSlots] = useState(itemIds);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    // If userAnswer exists and is an array of IDs of the right length
    const initialTop = Array.isArray(userAnswer) && userAnswer.length === itemIds.length 
      ? userAnswer.map(id => id || null) 
      : Array(itemIds.length).fill(null);
    
    setTopSlots(initialTop);

    // Initial bottom slots: items not in top slots
    const placedIds = initialTop.filter(id => id !== null);
    const unplacedIds = itemIds.filter(id => !placedIds.includes(id));
    
    // Simplest approach for bottom slots: fill in order
    const initialBottom = Array(itemIds.length).fill(null);
    unplacedIds.forEach((id, idx) => {
      initialBottom[idx] = id;
    });
    setBottomSlots(initialBottom);
    
    setSelectedItemId(null);
  }, [question.id, itemIds.join('|')]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const getItem = (itemId) => (question.items || []).find((item) => String(item.id) === String(itemId));

  const renderItemContent = (itemId) => {
    const item = getItem(itemId);
    if (!item) return null;
    const content = item.content || '';
    if (isInlineSvg(content)) return <div className={styles.itemMedia} dangerouslySetInnerHTML={{ __html: content }} />;
    if (isImageUrl(content)) return <SafeImage src={content} alt={`Sorted item ${itemId}`} className={styles.itemImage} width={80} height={60} sizes="(max-width: 768px) 20vw, 80px" />;
    return <span>{content}</span>;
  };

  const handleDragStart = (event) => {
    setActiveId(String(event.active.id));
    setSelectedItemId(null);
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const draggedId = String(active.id);
    const targetId = String(over.id);

    let nextTop = [...topSlots];
    let nextBottom = [...bottomSlots];

    const fromTopIdx = nextTop.indexOf(draggedId);
    const fromBottomIdx = nextBottom.indexOf(draggedId);

    if (targetId.startsWith(TOP_PREFIX)) {
      const toTopIdx = parseInt(targetId.replace(TOP_PREFIX, ''), 10);
      const existingInTarget = nextTop[toTopIdx];

      if (fromTopIdx !== -1) {
        // Top to Top swap
        nextTop[fromTopIdx] = existingInTarget;
        nextTop[toTopIdx] = draggedId;
      } else {
        // Bottom to Top
        nextBottom[fromBottomIdx] = existingInTarget;
        nextTop[toTopIdx] = draggedId;
      }
    } else if (targetId.startsWith(BOTTOM_PREFIX)) {
      const toBottomIdx = parseInt(targetId.replace(BOTTOM_PREFIX, ''), 10);
      const existingInTarget = nextBottom[toBottomIdx];

      if (fromBottomIdx !== -1) {
        // Bottom to Bottom swap
        nextBottom[fromBottomIdx] = existingInTarget;
        nextBottom[toBottomIdx] = draggedId;
      } else {
        // Top to Bottom
        nextTop[fromTopIdx] = existingInTarget;
        nextBottom[toBottomIdx] = draggedId;
      }
    }

    setTopSlots(nextTop);
    setBottomSlots(nextBottom);
    onAnswer(nextTop);
  };

  const handleItemTap = (itemId) => {
    if (isAnswered) return;
    setSelectedItemId(selectedItemId === itemId ? null : itemId);
  };

  const handleBoxClick = (area, index) => {
    if (isAnswered) return;

    if (selectedItemId) {
      let nextTop = [...topSlots];
      let nextBottom = [...bottomSlots];

      const fromArea = nextTop.includes(selectedItemId) ? 'top' : 'bottom';
      const fromIdx = fromArea === 'top' ? nextTop.indexOf(selectedItemId) : nextBottom.indexOf(selectedItemId);

      const toArea = area;
      const toIdx = index;
      const existingInTarget = toArea === 'top' ? nextTop[toIdx] : nextBottom[toIdx];

      // Execute Move/Swap
      if (fromArea === 'top' && toArea === 'top') {
        nextTop[fromIdx] = existingInTarget;
        nextTop[toIdx] = selectedItemId;
      } else if (fromArea === 'bottom' && toArea === 'bottom') {
        nextBottom[fromIdx] = existingInTarget;
        nextBottom[toIdx] = selectedItemId;
      } else if (fromArea === 'top' && toArea === 'bottom') {
        nextTop[fromIdx] = existingInTarget;
        nextBottom[toIdx] = selectedItemId;
      } else if (fromArea === 'bottom' && toArea === 'top') {
        nextBottom[fromIdx] = existingInTarget;
        nextTop[toIdx] = selectedItemId;
      }

      setTopSlots(nextTop);
      setBottomSlots(nextBottom);
      onAnswer(nextTop);
      setSelectedItemId(null);
    } else {
      const itemId = area === 'top' ? topSlots[index] : bottomSlots[index];
      if (itemId) setSelectedItemId(itemId);
    }
  };

  const isComplete = topSlots.every(id => id !== null);

  return (
    <div className={styles.container}>
      <div className={styles.questionCard}>
        <div className={styles.questionContent}>
          <QuestionParts parts={question.parts} />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          modifiers={[restrictToWindowEdges]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className={styles.sortingInteraction}>
            <LayoutGroup>
              {/* Progress Indicator */}
              <div className={styles.progressHeader}>
                <div className={styles.progressText}>
                  Step {topSlots.filter(id => id !== null).length} of {itemIds.length}
                </div>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${(topSlots.filter(id => id !== null).length / itemIds.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Target Area */}
              <div className={styles.slotsContainer}>
                <div className={styles.slotsArea}>
                  {topSlots.map((id, idx) => (
                    <div key={`top-${idx}`} onClick={() => handleBoxClick('top', idx)} className={styles.slotWrapper}>
                      <DroppableSlot
                        id={`${TOP_PREFIX}${idx}`}
                        index={idx}
                        isAnswered={isAnswered}
                        isActive={!!activeId && !topSlots.includes(activeId)}
                      >
                        <AnimatePresence mode="popLayout">
                          {id ? (
                            <DraggableItem
                              itemId={id}
                              content={renderItemContent(id)}
                              isAnswered={isAnswered}
                              isSelected={selectedItemId === id}
                              onClick={handleItemTap}
                              isDraggingActive={activeId === id}
                            />
                          ) : null}
                        </AnimatePresence>
                      </DroppableSlot>
                    </div>
                  ))}
                </div>
              </div>

              {!isAnswered && (
                <div className={styles.instructionWrapper}>
                  <div className={styles.instruction}>
                    Drag the numbers to the boxes in order
                  </div>
                </div>
              )}

              {/* Source Area */}
              <div className={styles.slotsContainer}>
                <div className={styles.slotsArea}>
                  {bottomSlots.map((id, idx) => (
                    <div key={`bottom-${idx}`} onClick={() => handleBoxClick('bottom', idx)} className={styles.slotWrapper}>
                      <DroppableSlot
                        id={`${BOTTOM_PREFIX}${idx}`}
                        index={idx}
                        isAnswered={isAnswered}
                        isActive={!!activeId && !bottomSlots.includes(activeId)}
                        showIndex={false}
                      >
                        <AnimatePresence mode="popLayout">
                          {id ? (
                            <DraggableItem
                              itemId={id}
                              content={renderItemContent(id)}
                              isAnswered={isAnswered}
                              isSelected={selectedItemId === id}
                              onClick={handleItemTap}
                              isDraggingActive={activeId === id}
                            />
                          ) : null}
                        </AnimatePresence>
                      </DroppableSlot>
                    </div>
                  ))}
                </div>
              </div>
            </LayoutGroup>
          </div>

          <DragOverlay dropAnimation={dropAnimationConfig} modifiers={[snapCenterToCursor]}>
            {activeId ? (
              <div className={styles.dragOverlay}>
                <div className={styles.item}>
                  <div className={styles.itemContent}>{renderItemContent(activeId)}</div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {question.showSubmitButton && !isAnswered && (
          <button className={styles.submitButton} onClick={() => onSubmit()} disabled={!isComplete}>
            Submit Answer
          </button>
        )}
      </div>
    </div>
  );
}
