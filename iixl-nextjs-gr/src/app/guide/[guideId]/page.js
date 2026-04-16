import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import styles from './guide.module.css';
import lessonStyles from '../../lesson/[lessonId]/lesson.module.css';


export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const guideId = resolvedParams.guideId;
  const title = guideId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${title} | Adaptive Learning Platform`,
    description: `Read the comprehensive guide on ${title}.`,
  };
}

export default async function GuidePage({ params }) {
  const resolvedParams = await params;
  const guideId = resolvedParams.guideId;
  const filePath = path.join(process.cwd(), 'src/content', `${guideId}.md`);
  
  let markdownContent = '';
  try {
    markdownContent = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Failed to load guide:', error);
    notFound();
  }

  return (
    <div className={styles.container}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
      
      <header className={styles.header}>
        <div className={styles.navBar}>
          <Link href="/" className={styles.backLink}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Hub
          </Link>
          <div className={styles.logo}>iXL Guides</div>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.articleCard}>
          <div className={styles.markdownBody}>
            <ReactMarkdown 
              remarkPlugins={[remarkMath, remarkGfm]} 
              rehypePlugins={[rehypeKatex, rehypeRaw]}
              components={{
                p: ({ node, ...props }) => {
                  const hasBlockChild = node?.children?.some?.(
                    c => c.tagName === 'practiceblock' || c.tagName === 'div'
                  );
                  return hasBlockChild ? <div {...props} /> : <p {...props} />;
                },
                practiceblock: ({ node, ...props }) => {
                  const questionHtml = props.questionhtml || '';
                  const practiceLabel = props.practicelabel || 'Practice now >>';
                  const practiceLink = props.practicelink || '#';
                  
                  return (
                    <div className={lessonStyles.tryBtnContainer}>
                      <h2 className={lessonStyles.tryTitle}>Try some practice problems!</h2>
                      <div className={lessonStyles.practiceCard}>
                        <div className={lessonStyles.practiceContent}>
                          <p dangerouslySetInnerHTML={{ __html: questionHtml }} />
                          <input type="text" className={lessonStyles.practiceInput} disabled={true} />
                        </div>
                        <div className={lessonStyles.practiceFooter}>
                          <Link href={practiceLink}>{practiceLabel}</Link>
                        </div>
                      </div>
                    </div>
                  );
                }
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
        </div>
      </main>
    </div>
  );
}
