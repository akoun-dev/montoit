import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const OfflineIndicator = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <Alert className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-warning text-warning-foreground border-warning">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="ml-2">
        Mode hors ligne - Certaines fonctionnalités sont limitées
      </AlertDescription>
    </Alert>
  );
};

export default OfflineIndicator;
