/**
 * UI Component Library
 * Export all reusable UI components from here
 */

// Premium custom components
export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { default as Input } from './Input';
export type { InputProps } from './Input';

export {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './Card';
export type {
  CardProps,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
} from './Card';

export { default as Modal, ConfirmModal } from './Modal';
export type { ModalProps, ConfirmModalProps } from './Modal';

export {
  Skeleton,
  SkeletonText,
  PropertyCardSkeleton,
  PropertyDetailSkeleton,
  FormSkeleton,
} from './Skeleton';
export type { SkeletonProps } from './Skeleton';

export { default as UIComponentsDemo } from './UIComponentsDemo';

export { Label } from './label';

export { Textarea } from './textarea';

export { Switch } from './switch';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

export { Badge, badgeVariants } from './badge';

export { Checkbox } from './checkbox';

// Custom additional components
export { Progress } from './Progress';
export { Table as DataTable, StatsTable } from './DataTable';
export { Badge as BadgeCustom } from './BadgeCustom';
export type { BadgeProps as BadgeCustomProps } from './BadgeCustom';

export { ScoreBadge } from './ScoreBadge';
export type { ScoreBadgeProps } from './ScoreBadge';

export { OwnerBadge } from './OwnerBadge';
export type { OwnerBadgeProps } from './OwnerBadge';

export { default as InputWithIcon } from './InputWithIcon';
export type { InputWithIconProps } from './InputWithIcon';

export { Breadcrumb } from './Breadcrumb';

export { FloatingCallButton } from './FloatingCallButton';
export type { FloatingCallButtonProps } from './FloatingCallButton';

// Validation components
export { ValidatedInput } from './ValidatedInput';
export { ValidatedTextarea } from './ValidatedTextarea';

// Form Stepper
export { FormStepper, FormStepContent, useFormStepper } from './FormStepper';
export type { FormStepperProps, FormStepContentProps } from './FormStepper';

// Cookie Consent
export { CookieConsent, getCookieConsent, resetCookieConsent } from './CookieConsent';
export type { CookieConsentProps } from './CookieConsent';

// Additional UI Components
export { default as AccessDenied } from './AccessDenied';
export { ANSUTCertificationBadge } from './ANSUTCertificationBadge';
export { default as BadgeIndicator } from './BadgeIndicator';
export { default as DocumentUpload } from './DocumentUpload';
export { default as ElectronicSignatureGated } from './ElectronicSignatureGated';
export { default as GuarantorForm } from './GuarantorForm';
export { default as LivenessDetector } from './LivenessDetector';
export { default as MapboxMapGated } from './MapboxMapGated';
export { default as MobileMoneyGated } from './MobileMoneyGated';
export { PaymentReceiptModal } from './PaymentReceiptModal';
export { default as PlacesAutocomplete } from './PlacesAutocomplete';
export { PropertyBadges } from './PropertyBadges';
export { default as SelfieCapture } from './SelfieCapture';
export { default as SignaturePad } from './SignaturePad';
export { VisitCalendar } from './VisitCalendar';
