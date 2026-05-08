'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './MathKeyboardInput.module.css';

const KEYBOARD_HEIGHT = 280;

/**
 * MathKeyboardInput — Universal math input with bottom-docked keyboard.
 *
 * mode="fraction" → stacked numerator/denominator display
 * mode="text"     → single growing text box (default)
 *
 * Keyboard always docks to viewport bottom, pushes page up so Submit stays visible.
 */
export default function MathKeyboardInput({
  id = 'input',
  value = '',
  onChange,
  disabled = false,
  isCorrect,
  isAnswered,
  autoFocus = false,
  mode = 'text',       // 'text' | 'fraction'
  placeholder = '',
}) {
  // ── Fraction parsing ──────────────────────────────────────────────────────
  const parseFrac = (v) => {
    const s = String(v || '');
    const i = s.indexOf('/');
    return i === -1 ? { num: s, den: '' } : { num: s.slice(0, i), den: s.slice(i + 1) };
  };

  const isFraction = mode === 'fraction';

  const [fracParts, setFracParts] = useState(() => parseFrac(value));
  const [textVal, setTextVal]     = useState(isFraction ? '' : String(value || ''));
  const [slot, setSlot]           = useState('num');   // fraction slot: 'num'|'den'
  const [showFrac, setShowFrac]   = useState(false);   // text mode → fraction view on □/□ press
  const [open, setOpen]           = useState(false);
  const [mounted, setMounted]     = useState(false);
  const boxRef = useRef(null);

  // Derived: are we rendering the fraction stacked view?
  const inFracView = isFraction || showFrac;

  useEffect(() => setMounted(true), []);

  // ── Global coordination: only one keyboard open at a time ────────────────
  useEffect(() => {
    const onActivate = (e) => {
      if (e.detail?.id !== id) setOpen(false);
    };
    window.addEventListener('mathkeyboard:activate', onActivate);
    return () => window.removeEventListener('mathkeyboard:activate', onActivate);
  }, [id]);

  // Sync from parent
  useEffect(() => {
    if (isFraction) setFracParts(parseFrac(value));
    else setTextVal(String(value || ''));
  }, [value]);

  // Push page content up when keyboard is open
  useEffect(() => {
    if (open) {
      document.body.style.paddingBottom = `${KEYBOARD_HEIGHT + 20}px`;
      document.body.style.transition = 'padding-bottom 0.2s';
      setTimeout(() => boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
    } else {
      document.body.style.paddingBottom = '';
    }
    return () => { document.body.style.paddingBottom = ''; };
  }, [open]);

  // ── Physical keyboard support when input is active ────────────────────────
  useEffect(() => {
    if (!open || disabled) return;
    const onKeyDown = (e) => {
      // Don't intercept if user is typing in another real input/textarea
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        press(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        press('⌫');
      } else if (e.key === '/') {
        e.preventDefault();
        press('FRACTION');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        press(e.shiftKey ? 'LEFT' : 'RIGHT');
      } else if (e.key === 'ArrowUp')   { e.preventDefault(); press('UP'); }
        else if (e.key === 'ArrowDown')  { e.preventDefault(); press('DOWN'); }
        else if (e.key === 'ArrowLeft')  { e.preventDefault(); press('LEFT'); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); press('RIGHT'); }
      else if (['+','-','*','%','(',')','.'].includes(e.key)) {
        e.preventDefault();
        const map = { '-':'−', '*':'×' };
        press(map[e.key] || e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, disabled, isFraction, slot, fracParts, textVal]);

  const emitFrac = useCallback((num, den) => {
    if (onChange) onChange(den ? `${num}/${den}` : num);
  }, [onChange]);

  const emitText = useCallback((v) => {
    if (onChange) onChange(v);
  }, [onChange]);

  // ── Key press handler ─────────────────────────────────────────────────────
  const press = (key) => {
    if (disabled) return;

    if (isFraction) {
      const cur = slot;
      if (key === '⌫') {
        const newVal = fracParts[cur].slice(0, -1);
        const updated = { ...fracParts, [cur]: newVal };
        setFracParts(updated);
        emitFrac(updated.num, updated.den);
      } else if (key === 'CLEAR') {
        const updated = { num: '', den: '' };
        setFracParts(updated);
        emitFrac('', '');
      } else if (key === 'FRACTION') {
        setSlot('den');
      } else if (key === 'UP' || key === 'LEFT') {
        setSlot('num');
      } else if (key === 'DOWN' || key === 'RIGHT') {
        setSlot('den');
      } else if (/^[0-9]$/.test(key)) {
        const newVal = fracParts[cur] + key;
        const updated = { ...fracParts, [cur]: newVal };
        setFracParts(updated);
        emitFrac(updated.num, updated.den);
        if (cur === 'num' && newVal.length >= 2) setSlot('den');
      }
    } else {
      // Text mode
      if (key === '⌫') {
        if (showFrac) {
          // Backspace on empty denominator → revert to text mode
          if (fracParts.den === '') {
            setShowFrac(false);
            const restored = fracParts.num;
            setTextVal(restored);
            emitText(restored);
          } else {
            const updated = { ...fracParts, den: fracParts.den.slice(0, -1) };
            setFracParts(updated);
            emitText(`${updated.num}/${updated.den}`);
          }
        } else {
          const v = textVal.slice(0, -1);
          setTextVal(v);
          emitText(v);
        }
      } else if (key === 'CLEAR') {
        setTextVal('');
        setShowFrac(false);
        setFracParts({ num: '', den: '' });
        emitText('');
      } else if (key === 'FRACTION') {
        // Switch to stacked fraction view
        // Current text becomes numerator, jump to denominator
        setFracParts({ num: textVal, den: '' });
        setShowFrac(true);
        setSlot('den');
        emitText(textVal + '/');
      } else if (key === 'UP' || key === 'LEFT') {
        if (showFrac) setSlot('num');
      } else if (key === 'DOWN' || key === 'RIGHT') {
        if (showFrac) setSlot('den');
      } else if (showFrac) {
        // Typing into fraction slots while in dynamic frac view
        const cur = slot;
        const newVal = fracParts[cur] + key;
        const updated = { ...fracParts, [cur]: newVal };
        setFracParts(updated);
        emitText(`${updated.num}/${updated.den}`);
        if (cur === 'num' && newVal.length >= 2) setSlot('den');
      } else {
        const v = textVal + key;
        setTextVal(v);
        emitText(v);
      }
    }
  };

  const openKeyboard = () => {
    if (!disabled) {
      setOpen(true);
      if (isFraction) setSlot('num');
      // Tell all other instances to close
      window.dispatchEvent(new CustomEvent('mathkeyboard:activate', { detail: { id } }));
    }
  };
  const closeKeyboard = () => setOpen(false);

  // ── Display values ────────────────────────────────────────────────────────
  const isEmpty = inFracView
    ? (fracParts.num === '' && fracParts.den === '')
    : textVal === '';

  const feedbackClass = isAnswered
    ? (isCorrect ? styles.correct : styles.incorrect)
    : '';

  // ── Keyboard portal ────────────────────────────────────────────────────────
  const keyboard = mounted && open && !disabled && createPortal(
    <div className={styles.dock}>
      {/* Tab + close */}
      <div className={styles.tabRow}>
        <span className={`${styles.tab} ${styles.tabActive}`}>123</span>
        <span className={`${styles.tab} ${styles.tabDim}`}>𝑥π</span>
        <span className={styles.tabFill} />
        <button className={styles.closeBtn} onClick={closeKeyboard} aria-label="Close">✕</button>
      </div>

      {/* Keypad body */}
      <div className={styles.keyboardBody}>
        {/* Left: 6-col number + symbol grid */}
        <div className={styles.numPad}>
          {/* Row 1: 7 8 9 % + − */}
          {['7','8','9'].map(k => <button key={k} className={styles.key} onClick={() => press(k)}>{k}</button>)}
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('%')}>%</button>
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('+')}>+</button>
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('−')}>−</button>

          {/* Row 2: 4 5 6 □/□ × ÷ */}
          {['4','5','6'].map(k => <button key={k} className={styles.key} onClick={() => press(k)}>{k}</button>)}
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('FRACTION')} title="Fraction">
            <span className={styles.fracIcon}>
              <span>□</span>
              <span className={styles.fracIconBar} />
              <span>□</span>
            </span>
          </button>
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('×')}>×</button>
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('÷')}>÷</button>

          {/* Row 3: 1 2 3 ( ) */}
          {['1','2','3'].map(k => <button key={k} className={styles.key} onClick={() => press(k)}>{k}</button>)}
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('(')}>(</button>
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press(')')}>)</button>
          <div />

          {/* Row 4: 0 . (−) _ _ ⌫ */}
          <button className={styles.key} onClick={() => press('0')}>0</button>
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('.')}>.</button>
          <button className={`${styles.key} ${styles.sym} ${styles.small}`} onClick={() => press('(−)')}>(−)</button>
          <div /><div />
          <button className={`${styles.key} ${styles.sym}`} onClick={() => press('⌫')}>
            ⌫
          </button>
        </div>

        {/* Right: arrow cross (hidden on very small screens) */}
        <div className={styles.arrowWrap}>
          <div className={styles.arrows}>
            <div />
            <button className={styles.arrowKey} onClick={() => press('UP')}>▲</button>
            <div />
            <button className={styles.arrowKey} onClick={() => press('LEFT')}>◀</button>
            <div className={styles.arrowCenter} />
            <button className={styles.arrowKey} onClick={() => press('RIGHT')}>▶</button>
            <div />
            <button className={styles.arrowKey} onClick={() => press('DOWN')}>▼</button>
            <div />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        ref={boxRef}
        className={`${styles.answerBox} ${open ? styles.focused : ''} ${feedbackClass}`}
        onClick={openKeyboard}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openKeyboard(); }}
        aria-label="Math input"
      >
        {/* ── FRACTION / DYNAMIC FRAC VIEW mode ── */}
        {inFracView && (isEmpty && !open)
          ? <span className={styles.ph}>?</span>
          : inFracView && (
            <span className={styles.fracDisplay}>
              <span 
                className={`${styles.fracSlot} ${open && slot === 'num' ? styles.slotActive : ''}`}
                onClick={(e) => { e.stopPropagation(); setSlot('num'); if (!open) openKeyboard(); }}
              >
                {fracParts.num || (open && slot === 'num' ? <span className={styles.cursor} /> : <span className={styles.ph2}>□</span>)}
              </span>
              <span className={styles.fracBar} />
              <span 
                className={`${styles.fracSlot} ${open && slot === 'den' ? styles.slotActive : ''}`}
                onClick={(e) => { e.stopPropagation(); setSlot('den'); if (!open) openKeyboard(); }}
              >
                {fracParts.den || (open && slot === 'den' ? <span className={styles.cursor} /> : <span className={styles.ph2}>□</span>)}
              </span>
            </span>
          )
        }

        {/* ── TEXT mode ── */}
        {!inFracView && (
          <span className={`${styles.textDisplay} ${open ? styles.textFocused : ''}`}>
            {textVal || (!open && <span className={styles.ph}>{placeholder || '?'}</span>)}
            {open && <span className={styles.cursor} />}
          </span>
        )}

        {isAnswered && (
          <span className={styles.feedback}>{isCorrect ? '✓' : '✗'}</span>
        )}
      </div>

      {keyboard}
    </>
  );
}
