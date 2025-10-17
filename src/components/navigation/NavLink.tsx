import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export const NavLink = ({ 
  to, 
  label, 
  icon: Icon, 
  badge,
  variant = 'ghost',
  className 
}: NavLinkProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const variantStyles = {
    primary: 'text-primary hover:text-primary/80',
    secondary: 'text-secondary hover:text-secondary/80',
    ghost: 'text-foreground/80 hover:text-foreground',
  };

  return (
    <Link 
      to={to}
      className={cn(
        'flex items-center gap-2 text-sm font-medium relative group transition-all duration-300',
        variantStyles[variant],
        isActive && 'text-primary font-semibold',
        className
      )}
    >
      <Icon className={cn(
        'h-4 w-4 transition-transform duration-200',
        'group-hover:scale-110'
      )} />
      <span>{label}</span>
      
      {/* Active indicator */}
      {isActive && (
        <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-sm transition-all duration-300" />
      )}
      
      {/* Badge */}
      {badge && (
        <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold bg-primary text-primary-foreground rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
};
