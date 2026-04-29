'use client';

import { useState } from 'react';
import { instantiateTemplate } from '@/lib/practice/generators/templateInstantiator';
import QuestionRenderer from '@/components/practice/QuestionRenderer';
import styles from './template.module.css';

export default function TemplateTestPage() {
    const [logicType, setLogicType] = useState('money_subtraction_v1');
    const [dataSourceStr, setDataSourceStr] = useState('{\n  "student_name": "Rohan",\n  "item": "Cricket Bat 🏏",\n  "item_cost": 250\n}');
    const [generatedQuestion, setGeneratedQuestion] = useState(null);
    const [error, setError] = useState('');
    const [answer, setAnswer] = useState(null);

    const handleGenerate = () => {
        try {
            setError('');
            const ds = dataSourceStr.trim() ? JSON.parse(dataSourceStr) : {};
            
            // Mock a database question structure
            const rawQuestion = {
                id: `test_${Date.now()}`,
                logic_type: logicType,
                data_source: ds,
                adaptiveConfig: {}
            };
            
            // Hydrate variables via instantiateTemplate
            const inst = instantiateTemplate(rawQuestion, null);
            
            if (!inst || !inst.type) {
                setError('Template instantiator returned an invalid or unhydrated question. Check the logic_type or data_source.');
                setGeneratedQuestion(null);
            } else {
                setGeneratedQuestion(inst);
                // Reset answer when a new question is generated
                setAnswer(null);
            }
        } catch (err) {
            setError('Error: ' + err.message);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Template Generator Tester</h1>
                <p>Instantly test and debug your logic from `templateInstantiator.js`</p>
            </header>

            <div className={styles.split}>
                <div className={styles.editorPanel}>
                    <div className={styles.field}>
                        <label>logic_type</label>
                        <input 
                            type="text" 
                            value={logicType} 
                            onChange={(e) => setLogicType(e.target.value)} 
                            className={styles.input}
                            placeholder="e.g. money_subtraction_v1"
                        />
                    </div>
                    <div className={styles.field}>
                        <label>data_source (JSON object)</label>
                        <textarea 
                            value={dataSourceStr} 
                            onChange={(e) => setDataSourceStr(e.target.value)} 
                            className={styles.textarea}
                            rows={8}
                            placeholder='{ "key": "value" }'
                        />
                    </div>
                    <button className={styles.button} onClick={handleGenerate}>
                        Generate Question
                    </button>
                    
                    {error && <div className={styles.error}>{error}</div>}
                    
                    {generatedQuestion && (
                        <div className={styles.debug}>
                            <h3>Raw Generated Question Payload</h3>
                            <pre>{JSON.stringify(generatedQuestion, null, 2)}</pre>
                        </div>
                    )}
                </div>

                <div className={styles.previewPanel}>
                    <h2 style={{marginTop: 0, color: '#1e293b'}}>Live UI Preview</h2>
                    {generatedQuestion ? (
                        <div className={styles.rendererWrapper}>
                            <QuestionRenderer
                                question={generatedQuestion}
                                userAnswer={answer}
                                onAnswer={setAnswer}
                                onSubmit={() => alert('Submitted Answer Data: \n\n' + JSON.stringify(answer, null, 2))}
                                isAnswered={false}
                            />
                        </div>
                    ) : (
                        <div className={styles.empty}>Click Generate to preview the UI</div>
                    )}
                </div>
            </div>
        </div>
    );
}
