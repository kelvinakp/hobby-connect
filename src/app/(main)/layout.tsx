import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
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
          <Sidebar />
          <Header />
          <main className="mt-14 min-h-[calc(100vh-3.5rem)] px-4 py-6 sm:px-6">
            {children}
          </main>
        </SidebarProvider>
      </SearchProvider>
    </NotificationProvider>
  );
}
