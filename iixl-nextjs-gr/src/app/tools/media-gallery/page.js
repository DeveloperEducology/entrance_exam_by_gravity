'use client';
import { useState } from 'react';
import styles from './MediaGallery.module.css';

export default function MediaGalleryPage() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!inputText.trim()) return;

    // Extract URLs from text (comma separated or newline separated)
    const urls = inputText
      .split(/[\n,]/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http'));

    if (urls.length === 0) {
      setError('No valid HTTP/HTTPS URLs found in input.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('http://localhost:5000/api/media/bulk-upload-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });

      const resJson = await response.json();
      
      if (resJson.error) {
        throw new Error(resJson.error.message || 'Upload failed');
      }

      setResults(resJson.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Bulk Media Gallery Uploader</h1>
        <p>Paste multiple image URLs below (one per line or comma-separated) to permanently upload them to Cloudflare R2.</p>
      </div>

      <div className={styles.inputSection}>
        <textarea
          className={styles.textarea}
          placeholder="https://example.com/image1.png&#10;https://example.com/image2.jpg"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading}
        />
        <div className={styles.actions}>
          <button 
            className={styles.uploadBtn} 
            onClick={handleUpload}
            disabled={loading || !inputText.trim()}
          >
            {loading ? 'Uploading to R2...' : 'Upload All URLs'}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {results.length > 0 && (
        <div className={styles.resultsSection}>
          <h2>Upload Results ({results.filter(r => r.success).length}/{results.length} successful)</h2>
          
          <div className={styles.grid}>
            {results.map((item, idx) => (
              <div key={idx} className={`${styles.card} ${!item.success ? styles.cardError : ''}`}>
                {item.success ? (
                  <>
                    <div className={styles.imagePreview}>
                      <img src={item.r2_url} alt="Preview" />
                    </div>
                    <div className={styles.urlBox}>
                      <input type="text" readOnly value={item.r2_url} />
                      <button onClick={() => copyToClipboard(item.r2_url)}>Copy</button>
                    </div>
                  </>
                ) : (
                  <div className={styles.errorText}>
                    <strong>Failed:</strong> {item.original}
                    <br/>
                    <small>{item.error}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
