/**
 * Payment types for Mobile Money Edge Functions
 */

// Provider types
export type MobileMoneyProvider = 'orange_money' | 'mtn_money' | 'moov_money' | 'wave';

// API Keys interfaces
export interface OrangeMoneyApiKeys {
  api_key: string;
  merchant_id: string;
}

export interface MTNApiKeys {
  subscription_key: string;
  api_user: string;
  api_key: string;
}

export interface MoovApiKeys {
  api_key: string;
  merchant_id: string;
}

export interface WaveApiKeys {
  api_key: string;
  merchant_id: string;
}

export type ProviderApiKeys = OrangeMoneyApiKeys | MTNApiKeys | MoovApiKeys | WaveApiKeys;

// Payment request/response interfaces
export interface PaymentRequest {
  provider: MobileMoneyProvider;
  phoneNumber: string;
  amount: number;
  reference: string;
  description?: string;
}

export interface OrangeMoneyResponse {
  payment_token?: string;
  payment_url?: string;
  status: string;
  message?: string;
}

export interface MTNAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface MTNPaymentResponse {
  transactionId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
}

export interface MoovPaymentResponse {
  transaction_id?: string;
  status: string;
  payment_url?: string;
}

export interface WavePaymentResponse {
  id?: string;
  wave_launch_url?: string;
  status: string;
}

export type ProviderPaymentResponse = 
  | OrangeMoneyResponse 
  | MTNPaymentResponse 
  | MoovPaymentResponse 
  | WavePaymentResponse;

export interface PaymentSuccessResponse {
  success: true;
  transactionId: string;
  amount: number;
  fees: number;
  totalAmount: number;
  provider: MobileMoneyProvider;
  status: string;
  paymentUrl?: string;
}

export interface PaymentErrorResponse {
  success: false;
  error: string;
}

// Webhook types
export interface InTouchWebhookPayload {
  transaction_id: string;
  partner_transaction_id: string;
  status: string;
  amount: number;
  phone_number: string;
  timestamp?: string;
  service_id?: string;
  error_message?: string;
}

export interface WebhookLogEntry {
  webhook_type: string;
  source_ip: string | null;
  signature_provided: string | null;
  signature_valid: boolean;
  payload: Record<string, unknown>;
  processing_result: 'success' | 'failed' | 'rejected';
  error_message: string | null;
}

// Fee calculation
export const PROVIDER_FEE_RATES: Record<MobileMoneyProvider, number> = {
  orange_money: 0.015,
  mtn_money: 0.015,
  moov_money: 0.012,
  wave: 0.01,
};
