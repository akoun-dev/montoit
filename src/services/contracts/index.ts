/**
 * Services de gestion des contrats
 * 
 * Ce fichier exporte tous les services liés à la gestion des contrats.
 * Note: Certains services nécessitent des tables supplémentaires dans la base de données :
 * - rent_payments (paiements de loyer)
 * - rent_indexations (indexations de loyer)
 * - deposit_status, deposit_release_date, deposit_deduction_amount, deposit_deduction_reason (dans lease_contracts)
 */

// Service de signature numérique
export {
  saveContractSignature,
  canvasToBase64,
  hasUserSigned,
  getContractSignatures,
  sendSignatureNotification,
  getClientIP,
} from './signatureService';

// Service de gestion des paiements de loyer
export {
  getContractPayments,
  getPaymentStats,
  createRentPayment,
  updatePaymentStatus,
  deleteRentPayment,
  getLatePaymentsByOwner,
} from './rentPaymentService';

// Service de gestion du dépôt de garantie
export {
  getContractDeposit,
  getDepositStatsByOwner,
  releaseDeposit,
  updateDepositStatus,
  partialDepositRelease,
  getPendingDeposits,
} from './depositService';

// Service d'indexation automatique du loyer
export {
  canIndexContract,
  calculateRentIndexation,
  getContractIndexations,
  createRentIndexation,
  applyRentIndexation,
  getPendingIndexations,
  formatPercentage,
  formatCurrency,
} from './rentIndexationService';

// Service de gestion des contrats
export {
  generateAndUploadContract,
  regenerateContract,
  downloadContract,
  deleteContract,
  sendSignatureReminder,
  terminateContract,
} from './contractService';
