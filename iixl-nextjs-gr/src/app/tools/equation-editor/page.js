'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './editor.module.css';
import { renderLatexToHtml } from '@/components/practice/latexUtils';
import 'katex/dist/katex.min.css';

const SYMBOL_CATEGORIES = [
  {
    name: 'Samples',
    symbols: [
      { label: 'Quadratic', value: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', preview: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      { label: 'FTC', value: '\\int_{a}^{b} f\'(x) \\, dx = f(b) - f(a)', preview: '\\int_{a}^{b} f\'(x) \\, dx = f(b) - f(a)' },
      { label: 'Pythagoras', value: 'a^2 + b^2 = c^2', preview: 'a^2 + b^2 = c^2' },
      { label: 'Std Dev', value: '\\sigma = \\sqrt{\\frac{\\sum(x - \\mu)^2}{N}}', preview: '\\sigma = \\sqrt{\\frac{\\sum(x - \\mu)^2}{N}}' },
      { label: 'Euler', value: 'e^{i\\pi} + 1 = 0', preview: 'e^{i\\pi} + 1 = 0' },
      { label: 'Derivative', value: 'f\'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}', preview: 'f\'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}' },
      { label: 'Binomial', value: '(x+y)^n = \\sum_{k=0}^n {n \\choose k} x^{n-k} y^k', preview: '(x+y)^n = \\sum' },
    ]
  },
  {
    name: 'Basic',
    symbols: [
      { label: '+', value: '+' },
      { label: '-', value: '-' },
      { label: '\u00D7', value: '\\times' },
      { label: '\u00F7', value: '\\div' },
      { label: '=', value: '=' },
      { label: '\u2260', value: '\\neq' },
      { label: '\u00B1', value: '\\pm' },
      { label: '\u221E', value: '\\infty' },
      { label: '\u2248', value: '\\approx' },
      { label: '<', value: '<' },
      { label: '>', value: '>' },
      { label: '\u2264', value: '\\le' },
      { label: '\u2265', value: '\\ge' },
    ]
  },
  {
    name: 'Operators',
    symbols: [
      { label: 'a/b', value: '\\frac{a}{b}', preview: '\\frac{a}{b}' },
      { label: '\u221A', value: '\\sqrt{x}', preview: '\\sqrt{x}' },
      { label: '\u221B', value: '\\sqrt[3]{x}', preview: '\\sqrt[3]{x}' },
      { label: 'x^y', value: 'x^{y}', preview: 'x^{y}' },
      { label: 'x_y', value: 'x_{y}', preview: 'x_{y}' },
      { label: '()', value: '\\left( x \\right)', preview: '(x)' },
      { label: '[]', value: '\\left[ x \\right]', preview: '[x]' },
      { label: '{}', value: '\\left\\{ x \\right\\}', preview: '{x}' },
    ]
  },
  {
    name: 'Calculus',
    symbols: [
      { label: '\u222B', value: '\\int', preview: '\\int' },
      { label: '\u222B_a^b', value: '\\int_{a}^{b} f(x)\\,dx', preview: '\\int_{a}^{b}' },
      { label: '\u2211', value: '\\sum_{i=1}^{n}', preview: '\\sum' },
      { label: 'lim', value: '\\lim_{x \\to \\infty}', preview: '\\lim' },
      { label: 'dy/dx', value: '\\frac{dy}{dx}', preview: '\\frac{dy}{dx}' },
      { label: '\u2202', value: '\\partial', preview: '\\partial' },
      { label: '\u2207', value: '\\nabla', preview: '\\nabla' },
      { label: '\u0394', value: '\\Delta', preview: '\\Delta' },
    ]
  },
  {
    name: 'Greek',
    symbols: [
      { label: '\u03B1', value: '\\alpha' },
      { label: '\u03B2', value: '\\beta' },
      { label: '\u03B3', value: '\\gamma' },
      { label: '\u03B4', value: '\\delta' },
      { label: '\u03B5', value: '\\epsilon' },
      { label: '\u03B8', value: '\\theta' },
      { label: '\u03BB', value: '\\lambda' },
      { label: '\u03BC', value: '\\mu' },
      { label: '\u03C0', value: '\\pi' },
      { label: '\u03C3', value: '\\sigma' },
      { label: '\u03D5', value: '\\phi' },
      { label: '\u03C9', value: '\\omega' },
      { label: '\u03A9', value: '\\Omega' },
      { label: '\u03A3', value: '\\Sigma' },
    ]
  },
  {
    name: 'Logic/Set',
    symbols: [
      { label: '\u2200', value: '\\forall' },
      { label: '\u2203', value: '\\exists' },
      { label: '\u2208', value: '\\in' },
      { label: '\u2209', value: '\\notin' },
      { label: '\u2282', value: '\\subset' },
      { label: '\u2286', value: '\\subseteq' },
      { label: '\u222A', value: '\\cup' },
      { label: '\u2229', value: '\\cap' },
      { label: '\u21D2', value: '\\Rightarrow' },
      { label: '\u21D4', value: '\\Leftrightarrow' },
    ]
  },
  {
    name: 'Matrices',
    symbols: [
      { label: '2x2', value: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', preview: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: '[2x2]', value: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', preview: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
      { label: '{2x1}', value: '\\begin{Bmatrix} a \\\\ b \\end{Bmatrix}', preview: '\\begin{Bmatrix} a \\\\ b \\end{Bmatrix}' },
      { label: 'Det', value: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', preview: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}' },
    ]
  }
];

export default function EquationEditor() {
  const [latex, setLatex] = useState('');
  const [activeTab, setActiveTab] = useState('Samples');
  const [showCopyToast, setShowCopyToast] = useState(false);
  const textareaRef = useRef(null);

  const insertSymbol = (value) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newLatex = before + value + after;
    setLatex(newLatex);

    // Set focus back and move cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + value.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const copyToClipboard = (format) => {
    let textToCopy = latex;
    if (format === 'inline') textToCopy = `\\(${latex}\\)`;
    if (format === 'display') textToCopy = `\\[ ${latex} \\]`;
    if (format === 'dollar') textToCopy = `$${latex}$`;
    
    navigator.clipboard.writeText(textToCopy);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const clearAll = () => {
    if (window.confirm('Clear all content?')) {
      setLatex('');
    }
  };

  const renderedHtml = renderLatexToHtml(latex || ' ', true);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Premium Equation Builder</h1>
        <p>Compose complex mathematical expressions with ease.</p>
      </header>

      <main className={styles.mainLayout}>
        <div className={styles.card}>
          <div className={styles.symbolTabs}>
            {SYMBOL_CATEGORIES.map(cat => (
              <button
                key={cat.name}
                className={`${styles.tabButton} ${activeTab === cat.name ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className={styles.symbolGrid}>
            {SYMBOL_CATEGORIES.find(c => c.name === activeTab).symbols.map((sym, i) => (
              <button
                key={i}
                className={`${styles.symbolLabel} ${activeTab === 'Samples' ? styles.symbolLabelWide : ''}`}
                onClick={() => {
                  if (activeTab === 'Samples') setLatex(sym.value);
                  else insertSymbol(sym.value);
                }}
                title={sym.value}
              >
                {sym.preview ? (
                  <span 
                    className={styles.symbolPreview}
                    dangerouslySetInnerHTML={{ __html: renderLatexToHtml(sym.preview) }} 
                  />
                ) : sym.label}
              </button>
            ))}
          </div>

          <div className={styles.editorContainer}>
            <label className={styles.sectionTitle}>LaTeX Editor</label>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Type your LaTeX here or use symbols above..."
            />
          </div>

          <div className={styles.actions}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => copyToClipboard('display')}>
              Copy Display Block
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => copyToClipboard('inline')}>
              Copy Inline
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => copyToClipboard('dollar')}>
              Copy as $...$
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => copyToClipboard('raw')}>
              Copy Raw
            </button>
            <button 
              className={`${styles.btn} ${styles.btnSecondary}`} 
              onClick={clearAll}
              style={{ marginLeft: 'auto', color: '#ef4444' }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <label className={styles.sectionTitle}>Live Preview</label>
          <div 
            className={styles.previewArea} 
            onClick={() => textareaRef.current?.focus()}
            title="Click to edit formula"
          >
            {latex ? (
              <div 
                className="katex-preview"
                dangerouslySetInnerHTML={{ __html: renderedHtml }} 
              />
            ) : (
              <span className={styles.emptyPreview}>Equation preview will appear here...</span>
            )}
          </div>
          
          <div style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
            <strong>Usage Tip:</strong> Click a symbol above to insert it at your cursor position. Use curly braces <code>{`{}`}</code> for grouping arguments.
          </div>
        </div>
      </main>

      {showCopyToast && (
        <div className={styles.copySuccess}>
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}
