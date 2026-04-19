import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from './lesson.module.css';
import { connectMongo } from '@/lib/db/mongo';
import mongoose from 'mongoose';

import MultiplicationStep from '@/components/lessons/MultiplicationStep';
import AreaModelStep from '@/components/lessons/AreaModelStep';
import { renderLatexToHtml } from '@/components/practice/latexUtils';

function parseHtmlWithLatex(html) {
  if (!html) return '';
  return html.replace(/\\\((.*?)\\\)|\\\[(.*?)\\\]/gs, (match, inlineTex, displayTex) => {
    if (inlineTex) return renderLatexToHtml(inlineTex, false);
    if (displayTex) return renderLatexToHtml(displayTex, true);
    return match;
  });
}

// SVGs for icons
const PrinterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const FacebookIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 3h6.5L14 11.5 22 3h-2.5L13 10.5 2 3zm0 21h6.5l8.5-12h-2.5l-8.5 12zm2-2.5h2l12-16h-2l-12 16z"></path>
  </svg>
);

const DiamondIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 12l10 10 10-10L12 2z" fill="#57c6e6" />
    <path d="M12 2l4 10-4 10-4-10L12 2z" fill="#fff" opacity="0.6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#57c6e6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

async function getLesson(lessonId) {
  try {
    await connectMongo();
    const db = mongoose.connection.db;
    const lesson = await db.collection("lessons").findOne({ slug: lessonId });
    if (lesson) lesson._id = lesson._id.toString();
    return lesson;
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return null;
  }
}

// Generate Dynamic Metadata for SEO Optimization
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const lesson = await getLesson(resolvedParams.lessonId);
  
  if (!lesson) {
    return {
      title: 'Lesson Not Found',
    };
  }
  
  return {
    title: `${lesson.title} | Adaptive Learning Platform`,
    description: `Master ${lesson.title} with our step-by-step interactive lesson and visual math grids.`,
    openGraph: {
      title: `${lesson.title} | Adaptive Learning Platform`,
      description: `Master ${lesson.title} with our step-by-step interactive lesson.`,
      type: 'article'
    }
  };
}

import InteractiveLessonBlock from '@/components/lessons/InteractiveLessonBlock';

export default async function LessonPage({ params }) {
  const resolvedParams = await params;
  const lesson = await getLesson(resolvedParams.lessonId);

  if (!lesson) {
    notFound();
  }

  const renderBlock = (block, idx) => {
    switch (block.type) {
      case 'heading':
        return (
          <h2 
            key={idx} 
            className={styles.sectionHeading} 
            dangerouslySetInnerHTML={{ __html: parseHtmlWithLatex(block.html || "") }}
          />
        );

      case 'areaModelStep':
        return (
          <AreaModelStep
            key={idx}
            columns={block.columns || []}
            rows={block.rows || []}
            cells={block.cells || []}
          />
        );

      case 'multiplicationStep':
        return (
          <MultiplicationStep 
            key={idx}
            topNumber={block.topNumber || []}
            bottomNumber={block.bottomNumber || []}
            regroups={block.regroups || []}
            results={block.results || []}
            explanations={block.explanations || []}
          />
        );

      case 'paragraph':
        if (block.interactions) {
          return <InteractiveLessonBlock key={idx} block={block} idx={idx} />;
        }
        return (
          <p 
            key={idx} 
            className={styles.textBlock} 
            dangerouslySetInnerHTML={{ __html: parseHtmlWithLatex(block.html || "") }}
          />
        );
      
      case 'mathBlock':
      case 'mathSentence':
        if (block.interactions) {
          return <InteractiveLessonBlock key={idx} block={block} idx={idx} />;
        }
        return (
          <p 
            key={idx} 
            className={styles.mathBlock} 
            dangerouslySetInnerHTML={{ __html: parseHtmlWithLatex(block.html || "") }}
          />
        );
      
      case 'space':
          return (
            <p 
              key={idx} 
              className={styles.textBlock} 
              dangerouslySetInnerHTML={{ __html: '&nbsp;' }}
            />
          );

      case 'placeValueTable':
        return (
          <table key={idx} className={styles.pvTable}>
            <thead>
              <tr>
                {block.headers?.map((h, i) => (
                  <th key={i} dangerouslySetInnerHTML={{ __html: parseHtmlWithLatex(h || "") }} style={h === '' ? {border: 'none', background: 'white'} : {}} />
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows?.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => {
                    const colorMap = {
                      'pink': 'cPink',
                      'green': 'cGreen',
                      'blue': 'cBlue',
                      'purple': 'cPurple',
                      'teal': 'cTeal'
                    };
                    const colorClass = styles[cell.color] || styles[colorMap[cell.color]] || '';
                    return (
                      <td 
                          key={cIdx} 
                          className={colorClass}
                          style={cell.val === ',' ? {border: 'none', background: 'white', fontWeight: 'bold', color: 'black'} : {}}
                      >
                          {cell.val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
        
      case 'practiceBlock':
        return (
          <div key={idx} className={styles.tryBtnContainer}>
            <h2 className={styles.tryTitle}>Try some practice problems!</h2>
            <div className={styles.practiceCard}>
              <div className={styles.practiceContent}>
                <p dangerouslySetInnerHTML={{ __html: parseHtmlWithLatex(block.questionHtml || block.label || "") }} />
                <input type="text" className={styles.practiceInput} disabled={true} />
              </div>
              <div className={styles.practiceFooter}>
                <Link href={block.practiceLink || `/practice/${block.microskillId}`}>{block.practiceLabel || 'Practice now >>'}</Link>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>{lesson.title}</h1>
          <button className={styles.printBtn} aria-label="Print lesson">
            <PrinterIcon />
          </button>
        </div>
        <div className={styles.shareArea}>
          <span>Share lesson:</span>
          <div className={styles.shareIcons}>
            <a href="#" className={`${styles.iconLink} ${styles.link}`}><LinkIcon /></a>
            <a href="#" className={`${styles.iconLink} ${styles.fb}`}><FacebookIcon /></a>
            <a href="#" className={`${styles.iconLink} ${styles.x}`}><XIcon /></a>
          </div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        
        {/* Left Column: Content */}
        <div className={styles.leftCol}>
          {lesson.contentBlocks?.map(renderBlock)}
        </div>

        {/* Right Column: Sidebar */}
        <div className={styles.sidebarArea}>
          {lesson.backLink && (
            <Link href={lesson.backLink} className={styles.returnBtn}>
              <div className={styles.returnBtnIcon}>
                <DiamondIcon />
                <div style={{textAlign: "left"}}>
                  <div style={{fontSize: "12px", color: "#666", fontWeight: "normal"}}>Ready to go back?</div>
                  <div>Return to your skill</div>
                </div>
              </div>
              <ChevronRightIcon />
            </Link>
          )}

          <div className={styles.relatedBox}>
            <h3 className={styles.relatedTitle}>Related</h3>
            
            {(lesson.relatedItems?.skills?.length > 0) && (
              <div className={styles.relatedSection}>
                <h4 className={styles.relatedSectionTitle}>Skills</h4>
                <ul className={styles.relatedList}>
                  {lesson.relatedItems.skills.map((s, i) => (
                    <li key={i}><Link href={`/skills/${s.skillId || '#'}`}>{s.label}</Link></li>
                  ))}
                </ul>
              </div>
            )}

            {(lesson.relatedItems?.videos?.length > 0) && (
              <div className={styles.relatedSection}>
                <h4 className={styles.relatedSectionTitle}>Videos</h4>
                {lesson.relatedItems.videos.map((v, i) => (
                   <a key={i} href={v.url || '#'} className={styles.videoThumb} style={{height: '92px', background: v.color || 'linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%)', position: 'relative', overflow: 'hidden'}}>
                     {v.thumbnail ? (
                       <img src={v.thumbnail} alt={v.label} style={{width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8}} />
                     ) : null}
                     <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, padding: '5px', background: 'rgba(0,0,0,0.6)', textAlign: 'center', fontSize: '10px', color: '#fff'}}>{v.label}</div>
                   </a>
                ))}
              </div>
            )}

            {(lesson.relatedItems?.lessons?.length > 0) && (
              <div className={styles.relatedSection}>
                <h4 className={styles.relatedSectionTitle}>Lessons</h4>
                <ul className={styles.relatedList}>
                  {lesson.relatedItems.lessons.map((l, i) => (
                    <li key={i}><Link href={`/lesson/${l.slug || '#'}`}>{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
