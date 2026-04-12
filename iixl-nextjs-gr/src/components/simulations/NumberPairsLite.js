'use client';

import { useMemo, useState } from 'react';
import styles from './NumberPairsLite.module.css';

const BASE_TILE_COUNT = 6;

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const buildRound = () => {
  const left = randomInt(1, 9);
  const right = randomInt(1, 9);
  const target = left + right;

  const distractors = new Set();
  while (distractors.size < BASE_TILE_COUNT - 2) {
    const next = randomInt(1, 9);
    if (next !== left && next !== right) distractors.add(next);
  }

  const values = [left, right, ...Array.from(distractors)]
    .sort(() => Math.random() - 0.5)
    .map((value, index) => ({
      id: `tile_${value}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      value,
    }));

  return {
    target,
    tiles: values,
  };
};

export default function NumberPairsLite() {
  const [round, setRound] = useState(() => buildRound());
  const [bank, setBank] = useState(round.tiles);
  const [slots, setSlots] = useState({ left: null, right: null });
  const [feedback, setFeedback] = useState('');

  const total = useMemo(
    () => (slots.left?.value || 0) + (slots.right?.value || 0),
    [slots]
  );

  const moveTile = (tileId, destination) => {
    const fromBank = bank.find((tile) => tile.id === tileId);
    const fromLeft = slots.left?.id === tileId ? slots.left : null;
    const fromRight = slots.right?.id === tileId ? slots.right : null;
    const tile = fromBank || fromLeft || fromRight;
    if (!tile) return;

    const nextBank = bank.filter((entry) => entry.id !== tileId);
    const nextSlots = { ...slots };

    if (nextSlots.left?.id === tileId) nextSlots.left = null;
    if (nextSlots.right?.id === tileId) nextSlots.right = null;

    if (destination === 'bank') {
      nextBank.push(tile);
      nextBank.sort((a, b) => a.value - b.value);
      setBank(nextBank);
      setSlots(nextSlots);
      setFeedback('');
      return;
    }

    if (nextSlots[destination]) {
      nextBank.push(nextSlots[destination]);
      nextBank.sort((a, b) => a.value - b.value);
    }

    nextSlots[destination] = tile;
    setBank(nextBank);
    setSlots(nextSlots);
    setFeedback('');
  };

  const handleCheck = () => {
    if (!slots.left || !slots.right) {
      setFeedback('Place two tiles into the slots first.');
      return;
    }

    if (total === round.target) {
      setFeedback(`Nice work. ${slots.left.value} + ${slots.right.value} = ${round.target}.`);
    } else {
      setFeedback(`Not yet. ${slots.left.value} + ${slots.right.value} = ${total}, so try another pair.`);
    }
  };

  const handleReset = () => {
    setBank(round.tiles);
    setSlots({ left: null, right: null });
    setFeedback('');
  };

  const handleNext = () => {
    const nextRound = buildRound();
    setRound(nextRound);
    setBank(nextRound.tiles);
    setSlots({ left: null, right: null });
    setFeedback('');
  };

  const renderTile = (tile, variant = 'bank') => (
    <button
      key={tile.id}
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', tile.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      className={`${styles.tile} ${variant === 'slot' ? styles.tileInSlot : ''}`}
    >
      {tile.value}
    </button>
  );

  const renderDropZone = (slotName, label) => (
    <div className={styles.dropColumn}>
      <span className={styles.dropLabel}>{label}</span>
      <div
        className={styles.dropZone}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          moveTile(event.dataTransfer.getData('text/plain'), slotName);
        }}
      >
        {slots[slotName] ? renderTile(slots[slotName], 'slot') : <span className={styles.placeholder}>Drop tile</span>}
      </div>
    </div>
  );

  return (
    <section className={styles.shell}>
      <div className={styles.board}>
        <div className={styles.promptCard}>
          <span className={styles.kicker}>Plain Drag and Drop</span>
          <h2 className={styles.title}>Make the target number</h2>
          <p className={styles.instructions}>
            Drag two number tiles into the slots so their sum matches the target.
          </p>
          <div className={styles.targetBadge}>{round.target}</div>
        </div>

        <div
          className={styles.bank}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            moveTile(event.dataTransfer.getData('text/plain'), 'bank');
          }}
        >
          {bank.map((tile) => renderTile(tile))}
        </div>

        <div className={styles.workspace}>
          {renderDropZone('left', 'Tile A')}
          <div className={styles.plus}>+</div>
          {renderDropZone('right', 'Tile B')}
          <div className={styles.equals}>=</div>
          <div className={styles.totalBox}>{total}</div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={handleCheck}>
            Check
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleReset}>
            Reset
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleNext}>
            Next Round
          </button>
        </div>

        <p className={styles.feedback}>{feedback || 'Tip: drag a tile back to the bank if you want to replace it.'}</p>
      </div>

      <aside className={styles.sidebar}>
        <div className={styles.infoCard}>
          <h3>Why this version is simple</h3>
          <p>
            It uses native HTML drag and drop plus React state. That keeps the logic small and
            easy to extend before moving to a more advanced library.
          </p>
        </div>

        <div className={styles.infoCard}>
          <h3>Easy upgrades</h3>
          <ul className={styles.list}>
            <li>Add more slots for decomposition into three parts.</li>
            <li>Show ten-frames or bar models under the tiles.</li>
            <li>Turn feedback into level progression and scoring.</li>
          </ul>
        </div>
      </aside>
    </section>
  );
}
