'use client';
import { useState } from 'react';
import styles from './ImportDocs.module.css';

export default function ImportDocsPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchDocument = async () => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setQuestions([]);
    
    try {
      const response = await fetch(`http://localhost:5000/api/import-doc?documentId=${encodeURIComponent(url)}`);
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'Failed to parse document');
      }
      
      if (result.data && result.data.formattedQuestions) {
        setQuestions(result.data.formattedQuestions);
      } else {
        throw new Error('No questions found or invalid format');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveToDatabase = async () => {
    if (questions.length === 0) return;
    
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/questions/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questions)
      });
      
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      
      alert(`Successfully saved ${questions.length} questions to the database!`);
      setQuestions([]);
      setUrl('');
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };
  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const updateAllParts = (idx, field, value) => {
    setQuestions(prev => {
      const updated = [...prev];
      if (updated[idx].parts) {
        updated[idx].parts = updated[idx].parts.map(p => ({ ...p, [field]: value }));
      }
      return updated;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Import from Google Docs</h1>
        <p>Paste a Google Doc URL to automatically extract and parse questions into the database schema.</p>
      </div>

      <div className={styles.inputGroup}>
        <input 
          type="text" 
          className={styles.input} 
          placeholder="https://docs.google.com/document/d/..." 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading || saving}
        />
        <button 
          className={styles.btn} 
          onClick={fetchDocument}
          disabled={!url || loading || saving}
        >
          {loading ? 'Parsing Doc...' : 'Fetch Questions'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {questions.length > 0 && (
        <>
          <div className={styles.grid}>
            {questions.map((q, idx) => (
              <div key={idx} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.typeBadge}>{q.type || 'MCQ'}</span>
                  <span className={styles.marksBadge}>{q.marks} Mark(s)</span>
                </div>
                
                <div className={styles.questionContent}>
                  {q.parts?.map((part, pIdx) => {
                    if (part.type === 'text') {
                      return <span key={pIdx}>{part.content}</span>;
                    } else if (part.type === 'input') {
                      return (
                        <span key={pIdx} style={{ display: 'inline-block', margin: '0 4px' }}>
                          <input 
                            type="text" 
                            disabled 
                            value={part.answer} 
                            style={{ width: `${Math.max(part.answer.length * 10, 50)}px`, padding: '2px 8px', border: '1px solid #3b82f6', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', textAlign: 'center' }} 
                          />
                        </span>
                      );
                    } else if (part.type === 'image') {
                      return (
                        <div key={pIdx} style={{ margin: '1rem 0' }}>
                          <img 
                            src={part.url} 
                            alt={part.label || 'Question Image'} 
                            style={{ width: part.width ? `${part.width}px` : 'auto' }} 
                            className={styles.partImage} 
                          />
                          {part.label && <div style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>{part.label}</div>}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                {q.options && q.options.length > 0 && (
                  <ul className={styles.optionsList}>
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = q.correct_answer_indices?.includes(oIdx) || q.correct_answer_index === oIdx;
                      return (
                        <li key={oIdx} className={`${styles.optionItem} ${isCorrect ? styles.optionCorrect : ''}`}>
                          <div className={styles.optionLetter}>{String.fromCharCode(65 + oIdx)}</div>
                          <div style={{ flex: 1 }}>
                            {opt && opt.type === 'image' ? (
                              <img 
                                src={opt.imageUrl || opt.url} 
                                alt={opt.label || `Option ${String.fromCharCode(65 + oIdx)}`} 
                                style={{ width: opt.width ? `${opt.width}px` : '100px' }} 
                              />
                            ) : (
                              <span>{typeof opt === 'string' ? opt : (opt?.content || '')}</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {q.solution?.steps?.[0]?.content && (
                  <div className={styles.solutionBox}>
                    <strong>Solution:</strong> {q.solution.steps[0].content}
                  </div>
                )}

                <div className={styles.configPanel}>
                  <h4>Question Config</h4>
                  <div className={styles.configRow}>
                    <label className={styles.configLabel}>
                      <input 
                        type="checkbox" 
                        checked={q.is_vertical ?? true} 
                        onChange={(e) => updateQuestion(idx, 'is_vertical', e.target.checked)} 
                      /> 
                      is_vertical
                    </label>
                    <label className={styles.configLabel}>
                      <input 
                        type="checkbox" 
                        checked={q.show_submit_button ?? false} 
                        onChange={(e) => updateQuestion(idx, 'show_submit_button', e.target.checked)} 
                      /> 
                      show_submit_button
                    </label>
                    <label className={styles.configLabel}>
                      Complexity:
                      <input 
                        type="number" 
                        value={q.complexity || 8} 
                        onChange={(e) => updateQuestion(idx, 'complexity', Number(e.target.value))} 
                      />
                    </label>
                  </div>
                  
                  <h4>Parts Config (applies to all)</h4>
                  <div className={styles.configRow}>
                    <label className={styles.configLabel}>
                      <input 
                        type="checkbox" 
                        checked={q.parts?.[0]?.isVertical ?? false} 
                        onChange={(e) => updateAllParts(idx, 'isVertical', e.target.checked)} 
                      /> 
                      parts.isVertical
                    </label>
                    <label className={styles.configLabel}>
                      <input 
                        type="checkbox" 
                        checked={q.parts?.[0]?.hasAudio ?? true} 
                        onChange={(e) => updateAllParts(idx, 'hasAudio', e.target.checked)} 
                      /> 
                      parts.hasAudio
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.actions}>
            <button 
              className={`${styles.btn} ${styles.btnSuccess}`} 
              onClick={saveToDatabase}
              disabled={saving}
            >
              {saving ? 'Saving...' : `Approve & Save ${questions.length} Questions`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
