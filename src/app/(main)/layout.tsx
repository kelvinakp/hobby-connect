import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import DesktopRightRail from "@/components/DesktopRightRail";
import NotificationProvider from "@/components/NotificationProvider";
import SidebarProvider from "@/components/SidebarContext";
import SearchProvider from "@/components/SearchContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationProvider>
      <SearchProvider>
        <SidebarProvider>
          <Header />
          <main className="mt-14 min-h-[calc(100vh-3.5rem)] px-4 py-6 sm:px-6">
            <div className="mx-auto w-full max-w-[1500px] lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_18rem]">
              <Sidebar />
              <section className="min-w-0">{children}</section>
              <aside className="hidden xl:block">
                <DesktopRightRail />
              </aside>
            </div>
          </main>
        </SidebarProvider>
      </SearchProvider>
    </NotificationProvider>
  );
}
