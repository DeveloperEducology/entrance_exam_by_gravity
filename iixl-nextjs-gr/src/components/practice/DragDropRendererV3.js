'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DragDropRendererV3.module.css';
import QuestionParts from './QuestionParts';
import SafeImage from './SafeImage';

const POOL_ID = '__pool__';

function DraggableItem({
  id,
  item,
  isSelected,
  onSelect,
  isAnswered,
  isCorrect,
  disabled,
  isPlaced
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: disabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
    touchAction: 'none',
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!disabled) {
          e.stopPropagation();
          onSelect?.(id);
        }
      }}
      className={`
        ${styles.dragItem}
        ${isPlaced ? styles.isPlaced : ''}
        ${isDragging ? styles.dragging : ''}
        ${isSelected ? styles.selected : ''}
      `}
    >
      {isAnswered && isPlaced && (
        <div className={`${styles.statusIcon} ${isCorrect ? styles.correct : styles.incorrect}`}>
          {isCorrect ? '✓' : '✕'}
        </div>
      )}
      <span>{item.content}</span>
    </div>
  );
}

function DropZone({
  id,
  children,
  x,
  y,
  isTarget,
  onSlotClick,
  disabled
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSlotClick?.(id)}
      style={{ left: `${x}%`, top: `${y}%` }}
      className={`
        ${styles.dropZone} 
        ${isOver ? styles.isOver : ''} 
        ${isTarget && !React.Children.count(children) ? styles.isTarget : ''}
      `}
    >
      <AnimatePresence>
        {children}
      </AnimatePresence>
    </div>
  );
}

export default function DragDropRendererV3({
  question,
  userAnswer,
  onAnswer,
  onSubmit,
  isAnswered,
}) {
  const [activeId, setActiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  
  const diagramPart = useMemo(() => {
    return question.parts?.find(p => p.type === 'dragAndDropv3') || {};
  }, [question.parts]);

  const dragItems = useMemo(() => {
    const raw = diagramPart.dragItems || question.dragItems || question.drag_items || question.items || [];
    return raw.map((item, idx) => ({
      ...item,
      id: String(item.id || `item-${idx}`),
      content: item.content || item.label || item.text || item.value || '',
      targetGroupId: String(item.targetGroupId || item.target_group_id || '')
    }));
  }, [question, diagramPart]);

  const dropGroups = useMemo(() => {
    const raw = diagramPart.dropGroups || question.dropGroups || question.drop_groups || question.groups || [];
    return raw.map((group, idx) => ({
      ...group,
      id: String(group.id || `group-${idx}`),
      label: group.label || group.name || group.title || '',
      x: group.x ?? 50,
      y: group.y ?? 50
    }));
  }, [question, diagramPart]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const placements = useMemo(() => {
    if (!userAnswer || typeof userAnswer !== 'object') return {};
    return userAnswer;
  }, [userAnswer]);

  const getItemsInGroup = (groupId) => dragItems.filter(item => placements[item.id] === String(groupId));

  const handleDragStart = (e) => {
    if (isAnswered) return;
    setActiveId(String(e.active.id));
    setSelectedId(null);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveId(null);
    if (isAnswered || !over) return;

    const itemId = String(active.id);
    const targetId = String(over.id);
    const isKnownBucket = dropGroups.some((group) => group.id === targetId);

    if (targetId === POOL_ID) {
      if (placements[itemId]) {
        const next = { ...placements };
        delete next[itemId];
        onAnswer(next);
      }
    } else if (isKnownBucket) {
      onAnswer({ ...placements, [itemId]: targetId });
    }
  };

  const handleItemSelect = (id) => {
    if (isAnswered) return;
    setSelectedId(prev => prev === id ? null : id);
  };

  const handleZoneClick = (targetGroupId) => {
    if (isAnswered || !selectedId) return;
    if (targetGroupId === POOL_ID) {
      if (placements[selectedId]) {
        const next = { ...placements };
        delete next[selectedId];
        onAnswer(next);
      }
    } else {
      onAnswer({ ...placements, [selectedId]: targetGroupId });
    }
    setSelectedId(null);
  };

  const canSubmit = useMemo(() => {
    const requiredItemIds = dragItems.filter(item => item.targetGroupId).map(item => item.id);
    return requiredItemIds.length === 0 || requiredItemIds.every(id => !!placements[id]);
  }, [dragItems, placements]);

    const mapSource = diagramPart.mapUrl || question.mapUrl || question.map_url || question.imageUrl || question.image_url;

    return (
    <div className={styles.container} onClick={() => setSelectedId(null)}>
      <motion.div
        className={styles.questionCard}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.title}>
          <QuestionParts parts={question.parts} />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
          {/* Map Overlay Section */}
          <div className={styles.mapWrapper}>
            {mapSource ? (
              <img
                src={mapSource}
                alt="Diagram"
                className={styles.mapImage}
                onLoad={(e) => console.log("Map Loaded Success:", e.target.src)}
                onError={(e) => console.log("Map Load Error:", e.target.src)}
              />
            ) : (
              <div className={styles.missingMap}>Map image not found (Check mapUrl field)</div>
            )}
            
            {dropGroups.map((group) => (
              <DropZone
                key={group.id}
                id={group.id}
                x={group.x}
                y={group.y}
                onSlotClick={handleZoneClick}
                isTarget={!!selectedId}
                disabled={isAnswered}
              >
                {getItemsInGroup(group.id).map(item => (
                  <motion.div key={item.id} layout>
                    <DraggableItem
                      id={item.id}
                      item={item}
                      isSelected={selectedId === item.id}
                      onSelect={handleItemSelect}
                      isAnswered={isAnswered}
                      isCorrect={placements[item.id] === item.targetGroupId}
                      disabled={isAnswered}
                      isPlaced={true}
                    />
                  </motion.div>
                ))}
              </DropZone>
            ))}
          </div>

          {/* Item Bank */}
          <div
            className={styles.itemsPool}
            onClick={(e) => {
              e.stopPropagation();
              handleZoneClick(POOL_ID);
            }}
          >
            {dragItems.map((item) => {
              const isPlaced = !!placements[item.id];
              return (
                <div key={item.id} className={styles.itemSlot}>
                  {!isPlaced && (
                    <DraggableItem
                      id={item.id}
                      item={item}
                      isSelected={selectedId === item.id}
                      onSelect={handleItemSelect}
                      isAnswered={isAnswered}
                      disabled={isAnswered}
                      isPlaced={false}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {!isAnswered && (
            <div className={styles.instruction}>
              Drag items to their correct positions on the map.
            </div>
          )}
        </DndContext>

        <button
          className={styles.submitButton}
          disabled={!canSubmit || isAnswered}
          onClick={() => onSubmit()}
        >
          {isAnswered ? 'Answer Submitted' : 'Submit Answer'}
        </button>
      </motion.div>
    </div>
  );
}
