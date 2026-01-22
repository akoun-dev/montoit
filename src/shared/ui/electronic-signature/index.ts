/**
 * Electronic Signature UI Components
 *
 * This module provides React components for the CryptoNeo electronic signature workflow.
 *
 * @example Basic usage with button
 * ```tsx
 * import { ElectronicSignatureButton } from '@/shared/ui/electronic-signature';
 *
 * function MyComponent() {
 *   return (
 *     <ElectronicSignatureButton
 *       documents={[{
 *         id: 'contract-123',
 *         url: 'https://example.com/contract.pdf',
 *         title: 'Contrat de location'
 *       }]}
 *       contractId="contract-123"
 *       onSuccess={(urls) => console.log('Signed:', urls)}
 *       onError={(error) => console.error('Error:', error)}
 *     />
 *   );
 * }
 * ```
 *
 * @example Using modal directly
 * ```tsx
 * import { ElectronicSignatureModal } from '@/shared/ui/electronic-signature';
 *
 * function MyComponent() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <ElectronicSignatureModal
 *       isOpen={isOpen}
 *       onClose={() => setIsOpen(false)}
 *       documents={documents}
 *       contractId="contract-123"
 *     />
 *   );
 * }
 * ```
 */

// Main modal component
export { ElectronicSignatureModal } from './ElectronicSignatureModal';
export type { SignatureDocument } from './ElectronicSignatureModal';

// Convenience button component
export { ElectronicSignatureButton } from './ElectronicSignatureButton';
