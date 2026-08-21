'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    if (currentUser) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  return null;
}