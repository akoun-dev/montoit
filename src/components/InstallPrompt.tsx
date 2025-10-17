import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useIsMobile } from "@/hooks/use-mobile";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const InstallPrompt = () => {
  const { isInstallable, handleInstall, handleDismiss } = useInstallPrompt();
  const isMobile = useIsMobile();

  // Only show on mobile devices
  if (!isMobile || !isInstallable) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-primary shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary-foreground text-sm">
              Installez Mon Toit
            </p>
            <p className="text-xs text-primary-foreground/80">
              Accès rapide et expérience optimisée
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstall}
            className="font-semibold"
          >
            Installer
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
