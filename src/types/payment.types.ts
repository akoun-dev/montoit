/**
 * Payment System Types
 * Types and interfaces for Mobile Money payment system
 */

import type { Database } from '@/shared/lib/database.types';

// Database types
export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

// Mobile Money Transaction - define locally since table doesn't exist
export interface MobileMoneyTransaction {
  id: string;
  payment_id: string;
  provider: MobileMoneyProvider;
  phone_number: string;
  amount: number;
  status: PaymentStatus;
  external_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

// Payment status
export type PaymentStatus =
  | 'pending'
  | 'initiated'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

// Mobile Money providers
export type MobileMoneyProvider = 'orange_money' | 'mtn_money' | 'moov_money' | 'wave';

// Phone number prefixes by provider
export const PROVIDER_PREFIXES: Record<MobileMoneyProvider, string[]> = {
  orange_money: ['07', '227'],
  mtn_money: ['05', '054', '055', '056'],
  moov_money: ['01'],
  wave: [], // Wave uses email or special numbers
};

// Transaction fees by provider (percentage)
export const PROVIDER_FEES: Record<MobileMoneyProvider, number> = {
  orange_money: 1.5,
  mtn_money: 1.5,
  moov_money: 1.2,
  wave: 1.0,
};

// Platform commission
export const PLATFORM_FEE_PERCENTAGE = 5;

// Payment request from client
export interface PaymentRequest {
  leaseId: string;
  amount: number;
  provider: MobileMoneyProvider;
  phoneNumber: string;
  description?: string;
}

// Payment response to client
export interface PaymentResponse {
  paymentId: string;
  transactionReference: string;
  status: PaymentStatus;
  amount: number;
  fees: number;
  totalAmount: number;
  provider: MobileMoneyProvider;
  message: string;
}

// Payment initiation request to Edge Function
export interface PaymentInitiationRequest {
  paymentId: string;
  provider: MobileMoneyProvider;
  phoneNumber: string;
  amount: number;
  transactionReference: string;
  metadata: {
    leaseId: string;
    tenantId: string;
    description: string;
  };
}

// Payment initiation response from Edge Function
export interface PaymentInitiationResponse {
  success: boolean;
  transactionId: string;
  externalTransactionId?: string;
  status: PaymentStatus;
  message: string;
  error?: string;
}

// Webhook payload from mobile money provider
export interface WebhookPayload {
  provider: MobileMoneyProvider;
  transactionId: string;
  externalTransactionId: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  phoneNumber: string;
  timestamp: string;
  signature: string;
  metadata?: Record<string, unknown>;
}

// Payment calculation result
export interface PaymentCalculation {
  baseAmount: number;
  providerFee: number;
  platformFee: number;
  totalAmount: number;
  landlordAmount: number;
}

// Payment filters for history
export interface PaymentFilters {
  tenantId?: string;
  leaseId?: string;
  status?: PaymentStatus;
  provider?: MobileMoneyProvider;
  startDate?: Date;
  endDate?: Date;
}

// Payment receipt data
export interface PaymentReceipt {
  paymentId: string;
  receiptNumber: string;
  date: Date;
  tenant: {
    name: string;
    email: string;
    phone: string;
  };
  property: {
    title: string;
    address: string;
  };
  lease: {
    id: string;
    startDate: Date;
    monthlyRent: number;
  };
  payment: {
    amount: number;
    fees: number;
    totalAmount: number;
    method: string;
    transactionReference: string;
  };
}

// Payment error types
export enum PaymentErrorCode {
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  CANCELLED_BY_USER = 'CANCELLED_BY_USER',
  INVALID_OTP = 'INVALID_OTP',
  TRANSACTION_EXPIRED = 'TRANSACTION_EXPIRED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface PaymentError {
  code: PaymentErrorCode;
  message: string;
  details?: unknown;
  retryable: boolean;
}

export type InTouchStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'PROCESSING' | 'CANCELLED';

export const INTOUCH_STATUS_MAPPING: Record<InTouchStatus, PaymentStatus> = {
  PENDING: 'processing',
  SUCCESS: 'completed',
  FAILED: 'failed',
  PROCESSING: 'processing',
  CANCELLED: 'cancelled',
};
