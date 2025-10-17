import { useEffect, useRef } from 'react';
import { Cell, PieChart, Pie } from 'recharts';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import confetti from 'canvas-confetti';

interface TenantScoreMeterProps {
  score: number;
  className?: string;
}

export const TenantScoreMeter = ({ score, className = '' }: TenantScoreMeterProps) => {
  const hasTriggeredConfetti = useRef(false);

  useEffect(() => {
    if (score === 100 && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [score]);

  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score }
  ];

  const getColor = (score: number) => {
    if (score >= 75) return 'hsl(var(--chart-1))';
    if (score >= 60) return 'hsl(var(--chart-3))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium">Score Locataire</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Votre score est calculé selon vos vérifications (ONECI, Face ID, CNAM), 
                la complétude de votre profil et votre historique de location.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="relative w-32 h-32 mx-auto">
        <PieChart width={128} height={128}>
          <Pie
            data={data}
            cx={64}
            cy={64}
            innerRadius={45}
            outerRadius={60}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
          >
            <Cell fill={getColor(score)} />
            <Cell fill="hsl(var(--muted))" />
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>

      <div className="text-center mt-2">
        <p className="text-xs text-muted-foreground">
          {score >= 75 && '🌟 Excellent profil !'}
          {score >= 60 && score < 75 && '👍 Bon profil'}
          {score < 60 && 'Complétez vos vérifications'}
        </p>
      </div>
    </div>
  );
};
