'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const { vendor, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (vendor) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [vendor, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="font-medium text-slate-400">Checking authentication...</p>
      </div>
    </div>
  );
}
