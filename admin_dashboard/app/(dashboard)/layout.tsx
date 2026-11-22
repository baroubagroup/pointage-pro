import { Sidebar } from '@/components/sidebar';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F4F7FD] text-slate-900 font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <PwaInstallPrompt />
        <main className="flex-1 p-4 sm:p-7 overflow-y-auto pb-24 md:pb-7">
          {children}
        </main>
      </div>
    </div>
  );
}
