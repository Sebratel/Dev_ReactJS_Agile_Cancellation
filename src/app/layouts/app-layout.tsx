import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { resolveAppPageTitle } from '@/app/layouts/resolve-app-page-title';
import {
  AppSidebarDesktop,
  AppSidebarMobile,
} from '@/components/navigation/app-sidebar';
import { AppTopbar } from '@/components/navigation/app-topbar';

export function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = resolveAppPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <AppSidebarDesktop />
        <AppSidebarMobile
          open={mobileSidebarOpen}
          onOpenChange={setMobileSidebarOpen}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppTopbar
            currentTitle={currentTitle}
            onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
