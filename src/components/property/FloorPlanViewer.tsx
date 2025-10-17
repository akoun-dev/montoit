import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, Maximize2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "./OptimizedImage";

interface FloorPlan {
  url: string;
  title: string;
  floor?: string;
  surface?: number;
}

interface FloorPlanViewerProps {
  plans: FloorPlan[];
}

export const FloorPlanViewer = ({ plans }: FloorPlanViewerProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePlan = plans[activeIndex];

  return (
    <div className="space-y-4">
      {/* Plan navigation */}
      {plans.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {plans.map((plan, index) => (
            <Button
              key={index}
              variant={index === activeIndex ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveIndex(index)}
              className="whitespace-nowrap"
            >
              {plan.title}
            </Button>
          ))}
        </div>
      )}

      {/* Plan viewer */}
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="relative">
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => zoomIn()}
                className="bg-background/80 backdrop-blur-sm"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => zoomOut()}
                className="bg-background/80 backdrop-blur-sm"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => resetTransform()}
                className="bg-background/80 backdrop-blur-sm"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-[600px] bg-muted rounded-lg overflow-hidden"
              contentClass="!w-full !h-full flex items-center justify-center"
            >
              <OptimizedImage
                src={activePlan.url}
                alt={activePlan.title}
                className="max-w-full max-h-full object-contain"
              />
            </TransformComponent>

            {/* Plan info */}
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-md">
              <h3 className="font-semibold">{activePlan.title}</h3>
              {activePlan.floor && (
                <p className="text-sm text-muted-foreground">
                  Étage: {activePlan.floor}
                </p>
              )}
              {activePlan.surface && (
                <p className="text-sm text-muted-foreground">
                  Surface: {activePlan.surface} m²
                </p>
              )}
            </div>
          </div>
        )}
      </TransformWrapper>
    </div>
  );
};
