'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BackButton({ className }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Basic check to see if we have history
    if (typeof window !== 'undefined' && window.history.length > 1) {
      setCanGoBack(true);
    }
  }, []);

  if (!canGoBack) return null;

  return (
    <button
      onClick={() => router.back()}
      className={className}
      aria-label="Go back"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
