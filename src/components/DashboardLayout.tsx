import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Droplet, Building2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Get hospital name from user object
  const hospitalName = user?.hospitalName || user?.name || "Hospital";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 h-16 border-b border-border/40 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-primary/10 hover:text-primary transition-colors" />
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-medical-red to-red-600 rounded-lg p-1.5 shadow-md">
                  <Droplet className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Blood Inventory System</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-secondary/50 px-4 py-2 rounded-full border border-border/50">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">{hospitalName}</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
