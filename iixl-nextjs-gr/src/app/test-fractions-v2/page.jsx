"use client";

import React, { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export default function TestFractionsV2Preview() {
  const [question, setQuestion] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logicType, setLogicType] = useState('visual_models_identify');
  const [seed, setSeed] = useState('');
  const [showJson, setShowJson] = useState(false);

  const fetchQuestion = async (customSeed = '') => {
    setLoading(true);
    try {
      const url = new URL('/api/test-fractions-v2', window.location.origin);
      url.searchParams.set('logic_type', logicType);
      if (customSeed) {
          url.searchParams.set('seed', customSeed);
      } else {
          url.searchParams.set('seed', Date.now().toString());
      }
      
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        setQuestion(data.question);
        setTemplate(data.template);
        setSeed(data.seed);
      } else {
        console.error("API returned error:", data.error);
      }
    } catch (err) {
      console.error("Failed to fetch question:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestion();
  }, [logicType]);

  const handleGenerateNew = () => {
    fetchQuestion();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem' }}>Fractions V2 Visual Preview</h1>
      
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <select 
          value={logicType} 
          onChange={(e) => setLogicType(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <optgroup label="Visual Models">
            <option value="visual_models_identify">Identify Fraction</option>
            <option value="visual_models_equal_parts">Equal Parts</option>
            <option value="visual_models_fraction_of_set">Fraction of a Set</option>
          </optgroup>
          <optgroup label="Number Lines">
            <option value="number_lines_identify">Identify Point</option>
            <option value="number_lines_graph">Graph Fraction (MCQ)</option>
          </optgroup>
          <optgroup label="Equivalence">
            <option value="equivalence_identify_equivalent">Identify Equivalent (Visual)</option>
            <option value="equivalence_simplify">Simplify Fraction</option>
            <option value="equivalence_missing_value">Find Missing Value</option>
          </optgroup>
          <optgroup label="Conversions">
            <option value="conversions_fraction_to_decimal">Fraction to Decimal</option>
            <option value="conversions_decimal_to_fraction">Decimal to Fraction</option>
          </optgroup>
          <optgroup label="Word Problems">
            <option value="word_problems_fraction_model">Identify Fraction Model</option>
            <option value="word_problems_fraction_value">Identify Fraction Value</option>
            <option value="word_problems_fraction_of_set">Fraction of a Set</option>
          </optgroup>
          <optgroup label="Operations">
            <option value="operations_add_like_denominators">Add (Like Denominators)</option>
            <option value="operations_subtract_like_denominators">Subtract (Like Denominators)</option>
          </optgroup>
        </select>
        <button 
          onClick={handleGenerateNew}
          style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Generate New
        </button>
        <button 
          onClick={() => setShowJson(!showJson)}
          style={{ padding: '0.5rem 1rem', background: showJson ? '#4b5563' : '#e5e7eb', color: showJson ? 'white' : '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
        >
          {showJson ? 'Hide JSONs' : 'Show JSONs'}
        </button>
        <span style={{ color: '#666', fontSize: '14px' }}>Seed: {seed}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      ) : question ? (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '2rem', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {showJson && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1rem', background: '#111827', color: '#f3f4f6', borderRadius: '8px', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '1rem', color: '#9ca3af', textTransform: 'uppercase' }}>Template JSON (DB Blueprint)</h3>
                <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace' }}>
                  {JSON.stringify(template, null, 2)}
                </pre>
              </div>
              <div style={{ padding: '1rem', background: '#1f2937', color: '#f3f4f6', borderRadius: '8px', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '1rem', color: '#9ca3af', textTransform: 'uppercase' }}>Generated Question JSON</h3>
                <pre style={{ margin: 0, fontSize: '11px', fontFamily: 'monospace' }}>
                  {JSON.stringify(question, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
            {!question.parts || question.parts.length === 0 ? question.questionText : null}
          </h2>
          
          {question.parts && question.parts.length > 0 && (
            <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: question.layoutConfig?.partsDirection === 'row' ? 'row' : 'column', flexWrap: 'wrap', alignItems: question.layoutConfig?.partsDirection === 'row' ? 'center' : 'flex-start', justifyContent: 'center', gap: '0.5rem', fontSize: '20px' }}>
               {question.parts.map((part, i) => (
                  part.type === 'svg' ? (
                    <div key={i} dangerouslySetInnerHTML={{ __html: part.content }} style={{ display: 'flex' }} />
                  ) : part.type === 'latex' ? (
                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}><InlineMath math={part.content} /></div>
                  ) : part.type === 'text' ? (
                    <p key={i} style={{ maxWidth: '800px', textAlign: 'left', margin: 0 }} dangerouslySetInnerHTML={{ __html: part.content.replace(/\\n/g, '<br/>') }} />
                  ) : part.type === 'input' ? (
                    <div key={i} style={{ display: 'inline-block', padding: '0.5rem 1rem', border: '2px solid #3b82f6', borderRadius: '4px', margin: '0.5rem 0' }}>[Input: {part.id}]</div>
                  ) : null
               ))}
            </div>
          )}
          
          {(question.type === 'fill_in_the_blank' || question.type === 'fillInTheBlank') ? (
             <div style={{ textAlign: 'center', marginTop: '2rem', padding: '2rem', border: '2px dashed #ccc', borderRadius: '8px' }}>
                <p style={{ fontSize: '18px', marginBottom: '1rem', color: '#666' }}>Student types their answer here</p>
                <div style={{ display: 'inline-block', padding: '0.5rem 2rem', border: '2px solid #3b82f6', borderRadius: '4px', fontSize: '24px', fontWeight: 'bold' }}>
                  {question.correctAnswerText}
                </div>
                <p style={{ marginTop: '1rem', color: '#166534', fontWeight: 'bold' }}>Correct Answer shown above</p>
             </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: question.layoutConfig?.columns ? `repeat(${question.layoutConfig.columns}, 1fr)` : 'repeat(2, 1fr)', 
              gap: question.layoutConfig?.gap || '1rem' 
            }}>
              {question.options?.map((opt, index) => (
                <div 
                  key={opt.id} 
                  style={{ 
                    border: '2px solid #e5e7eb', 
                    borderRadius: '8px', 
                    padding: '1rem', 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                >
                  {opt.type === 'svg' ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: opt.content }} 
                      style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                    />
                  ) : opt.type === 'latex' ? (
                    <div style={{ padding: '2rem 0', fontSize: '24px' }}><InlineMath math={opt.content} /></div>
                  ) : (
                    <div style={{ padding: '2rem 0', fontSize: '18px' }} dangerouslySetInnerHTML={{ __html: String(opt.content).replace(/\\n/g, '<br/>') }} />
                  )}
                  
                  <div style={{ 
                    marginTop: '1rem', 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: opt.isCorrect ? '#dcfce7' : '#fee2e2',
                    color: opt.isCorrect ? '#166534' : '#991b1b'
                  }}>
                    {opt.isCorrect ? 'Correct Answer' : 'Distractor'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {question.solution && question.solution.length > 0 && (
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px dashed #e5e7eb' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1rem', color: '#4b5563' }}>Solution Explanation</h3>
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '18px', color: '#1e293b' }}>
                {question.solution.map((item, i) => {
                  const steps = item.type === 'section' ? item.parts : [item];
                  return steps.map((step, j) => (
                    <div key={`${i}-${j}`} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      {step.type === 'text' ? (
                        <span dangerouslySetInnerHTML={{ __html: step.content.replace(/\\n/g, '<br/>') }} />
                      ) : step.type === 'svg' ? (
                        <div dangerouslySetInnerHTML={{ __html: step.content }} style={{ display: 'flex' }} />
                      ) : step.type === 'latex' ? (
                        <div style={{ display: 'flex' }}><InlineMath math={step.content} /></div>
                      ) : null}
                    </div>
                  ));
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>No question generated.</div>
      )}
    </div>
  );
}
