/**
 * ICON SYSTEM - MONTOIT DESIGN
 * Système d'icônes unifié basé sur Lucide React
 * Style: Outline uniquement pour cohérence
 */

import * as LucideIcons from 'lucide-react';

// Types pour les icônes
type IconName = keyof typeof LucideIcons;
type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
} & React.SVGProps<SVGSVGElement>;

// Icônes du système avec mapping sémantique
export const ICONS = {
  // Navigation & Layout
  Home: 'Home',
  Search: 'Search',
  Menu: 'Menu',
  X: 'X',
  ChevronDown: 'ChevronDown',

  // Utilisateur & Auth
  User: 'User',
  UserPlus: 'UserPlus',
  LogOut: 'LogOut',
  LogIn: 'LogIn',
  Shield: 'Shield',
  CheckCircle: 'CheckCircle',

  // Propriétés & Immobilier
  Building2: 'Building2',
  HomeIcon: 'Home',
  Bed: 'Bed',
  Bath: 'Bath',
  Square: 'Square',
  MapPin: 'MapPin',

  // Communication & Support
  Mail: 'Mail',
  Phone: 'Phone',
  MessageCircle: 'MessageCircle',
  Heart: 'Heart',
  Bell: 'Bell',

  // Actions & Interface
  Plus: 'Plus',
  PlusCircle: 'PlusCircle',
  Settings: 'Settings',
  Info: 'Info',
  HelpCircle: 'HelpCircle',
  AlertCircle: 'AlertCircle',

  // Navigation & Structure
  Calendar: 'Calendar',
  FileText: 'FileText',
  BarChart: 'BarChart',
  Database: 'Database',

  // Propriétés
  Coins: 'Coins',
  Award: 'Award',
  Key: 'Key',
  Activity: 'Activity',

  // Composants
  Loader2: 'Loader2',
  Download: 'Download',
  Send: 'Send',
  Eye: 'Eye',
  EyeOff: 'EyeOff',
  RefreshCw: 'RefreshCw',
} as const;

// Mapping des anciennes icônes vers les nouvelles
export const ICON_MAPPING = {
  // PropertyCard mappings
  bedrooms: 'Bed' as IconName,
  bathrooms: 'Bath' as IconName,
  surface: 'Square' as IconName,

  // Navigation mappings
  logout: 'LogOut' as IconName,
  login: 'LogIn' as IconName,
  home: 'Home' as IconName,
  search: 'Search' as IconName,

  // Communication mappings
  email: 'Mail' as IconName,
  phone: 'Phone' as IconName,
  location: 'MapPin' as IconName,
  heart: 'Heart' as IconName,
} as const;

/**
 * Composant Icon unifié
 * Garantit la cohérence du style outline et des tailles
 */
export const Icon = ({
  name,
  size = 20,
  className = '',
  color = 'currentColor',
  strokeWidth = 1.5,
  ...props
}: IconProps) => {
  const IconComponent = LucideIcons[name as IconName] as React.ComponentType<any>;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in Lucide React`);
    return null;
  }

  return (
    <IconComponent
      size={size}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
};

// Icônes spécialisées pour PropertyCard
export const PropertyIcons = {
  Bed: (props: Partial<IconProps>) => <Icon name="Bed" size={16} {...props} />,
  Bath: (props: Partial<IconProps>) => <Icon name="Bath" size={16} {...props} />,
  Square: (props: Partial<IconProps>) => <Icon name="Square" size={16} {...props} />,
  Location: (props: Partial<IconProps>) => <Icon name="MapPin" size={14} {...props} />,
};

// Icônes pour navigation
export const NavigationIcons = {
  Home: (props: Partial<IconProps>) => <Icon name="Home" size={20} {...props} />,
  Search: (props: Partial<IconProps>) => <Icon name="Search" size={20} {...props} />,
  Menu: (props: Partial<IconProps>) => <Icon name="Menu" size={20} {...props} />,
  Close: (props: Partial<IconProps>) => <Icon name="X" size={20} {...props} />,
};

// Icônes pour actions
export const ActionIcons = {
  Plus: (props: Partial<IconProps>) => <Icon name="Plus" size={16} {...props} />,
  Settings: (props: Partial<IconProps>) => <Icon name="Settings" size={18} {...props} />,
  Help: (props: Partial<IconProps>) => <Icon name="HelpCircle" size={18} {...props} />,
  Alert: (props: Partial<IconProps>) => <Icon name="AlertCircle" size={18} {...props} />,
};

// Icônes pour communication
export const CommunicationIcons = {
  Mail: (props: Partial<IconProps>) => <Icon name="Mail" size={16} {...props} />,
  Phone: (props: Partial<IconProps>) => <Icon name="Phone" size={16} {...props} />,
  Heart: (props: Partial<IconProps>) => <Icon name="Heart" size={16} {...props} />,
  Message: (props: Partial<IconProps>) => <Icon name="MessageCircle" size={16} {...props} />,
};

// Icônes pour statut
export const StatusIcons = {
  Success: (props: Partial<IconProps>) => <Icon name="CheckCircle" size={20} {...props} />,
  Loading: (props: Partial<IconProps>) => (
    <Icon name="Loader2" size={20} className="animate-spin" {...props} />
  ),
  User: (props: Partial<IconProps>) => <Icon name="User" size={20} {...props} />,
  Shield: (props: Partial<IconProps>) => <Icon name="Shield" size={20} {...props} />,
};

// Classes CSS pour les icônes
export const ICON_CLASSES = {
  // Sizes
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',

  // Colors
  primary: 'text-primary-500',
  secondary: 'text-neutral-500',
  muted: 'text-neutral-300',
  white: 'text-white',

  // States
  hover: 'hover:text-primary-700 transition-colors duration-250 ease-out',
  active: 'active:text-primary-900',
} as const;

// Utilitaire pour obtenir une classe d'icône complète
export const getIconClass = (
  size: keyof typeof ICON_CLASSES,
  color?: keyof typeof ICON_CLASSES,
  state?: keyof typeof ICON_CLASSES
): string => {
  let classes = ICON_CLASSES[size];

  if (color) classes += ` ${ICON_CLASSES[color]}`;
  if (state) classes += ` ${ICON_CLASSES[state]}`;

  return classes;
};

export default Icon;
