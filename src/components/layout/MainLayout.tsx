import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ModernAppSidebar } from "@/components/navigation/ModernAppSidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BottomNav } from "@/components/mobile/BottomNav";

interface MainLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export const MainLayout = ({ children, showSidebar = true }: MainLayoutProps) => {
  if (!showSidebar) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-16 pb-20 md:pb-0">
          {children}
        </div>
        <Footer />
        <BottomNav />
      </>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <ModernAppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <Navbar />
          <div className="flex-1 pt-16 pb-20 md:pb-0">
            {children}
          </div>
          <Footer />
          <BottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
