'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from '../register/auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mergeGuestProgress = async (userId) => {
    if (typeof window === 'undefined') return;
    const key = 'wexls_guest_id';
    const legacyKey = 'practice_student_id';
    const guestId = window.localStorage.getItem(key) || window.localStorage.getItem(legacyKey);

    if (!guestId || guestId === userId) return;

    try {
      await fetch('/api/adaptive/merge-guest-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestStudentId: guestId,
          userStudentId: userId,
        }),
      });
      // Clear all guest IDs so browser is now purely in user mode
      window.localStorage.removeItem(key);
      window.localStorage.removeItem(legacyKey);
    } catch {
      // best effort merge
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      const userId = user?.id;

      if (userId && user.role !== 'teacher') {
        await mergeGuestProgress(userId);
      }

      if (user?.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1>Sign in</h1>
        <p className={styles.sub}>Continue your learning journey.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className={styles.switch}>
          New here? <Link href="/register">Create account</Link>
        </p>
      </div>
    </main>
  );
}
