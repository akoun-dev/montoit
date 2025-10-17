import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const AdvancedTabs = TabsPrimitive.Root;

interface AdvancedTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  sticky?: boolean;
}

const AdvancedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  AdvancedTabsListProps
>(({ className, sticky, ...props }, ref) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  }, []);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 border-b bg-background",
        sticky && "sticky top-16 z-10 backdrop-blur-sm bg-background/95"
      )}
    >
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto scrollbar-hide"
        onScroll={checkScroll}
      >
        <TabsPrimitive.List
          ref={ref}
          className={cn(
            "inline-flex h-10 items-center justify-start p-1 text-muted-foreground",
            className
          )}
          {...props}
        />
      </div>

      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
});
AdvancedTabsList.displayName = "AdvancedTabsList";

interface AdvancedTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  badge?: string | number;
}

const AdvancedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  AdvancedTabsTriggerProps
>(({ className, badge, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all",
      "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "hover:bg-accent hover:text-accent-foreground",
      className
    )}
    {...props}
  >
    {children}
    {badge !== undefined && (
      <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-xs">
        {badge}
      </Badge>
    )}
  </TabsPrimitive.Trigger>
));
AdvancedTabsTrigger.displayName = "AdvancedTabsTrigger";

const AdvancedTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
AdvancedTabsContent.displayName = "AdvancedTabsContent";

// Mobile-optimized bottom navigation version
interface MobileTabsNavProps {
  tabs: Array<{
    value: string;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
  }>;
  value: string;
  onValueChange: (value: string) => void;
}

const MobileTabsNav: React.FC<MobileTabsNavProps> = ({ tabs, value, onValueChange }) => {
  const visibleTabs = tabs.slice(0, 4);
  const hiddenTabs = tabs.slice(4);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around p-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors relative",
              value === tab.value
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="relative">
              {tab.icon}
              {tab.badge !== undefined && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-xs"
                >
                  {tab.badge}
                </Badge>
              )}
            </span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
        
        {hiddenTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-1 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs font-medium">Plus</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hiddenTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  onClick={() => onValueChange(tab.value)}
                  className="flex items-center gap-2"
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <Badge variant="secondary" className="ml-auto">
                      {tab.badge}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export {
  AdvancedTabs,
  AdvancedTabsList,
  AdvancedTabsTrigger,
  AdvancedTabsContent,
  MobileTabsNav,
};
