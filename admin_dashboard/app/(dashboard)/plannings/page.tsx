'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlanningsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/parametres?tab=plannings');
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span>Redirection vers les Paramètres & Plannings...</span>
    </div>
  );
}
