/**
 * SMS/WhatsApp types for Edge Functions
 */

import type { ServiceConfig } from '../serviceManager.ts';

export interface SMSRequest {
  phoneNumber: string;
  message: string;
  sender?: string;
}

export interface SMSHandlerParams {
  phoneNumber: string;
  message: string;
  sender: string;
}

export interface SMSSuccessResponse {
  success: true;
  messageId?: string;
  reference?: string;
  provider: string;
}

export interface SMSErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export type SMSResponse = SMSSuccessResponse | SMSErrorResponse;

// Provider-specific types
export interface InTouchSMSRequest {
  recipient_phone_number: string;
  message: string;
  sender_id: string;
}

export interface InTouchSMSResponse {
  message_id?: string;
  id?: string;
  transaction_id?: string;
  status?: string;
}

export interface BrevoSMSRequest {
  sender: string;
  recipient: string;
  content: string;
  type: 'transactional' | 'marketing';
}

export interface BrevoSMSResponse {
  messageId: string;
  reference?: string;
  smsCount?: number;
  usedCredits?: number;
  remainingCredits?: number;
}

export interface AzureSMSSendResult {
  successful: boolean;
  messageId?: string;
  errorMessage?: string;
}

// Handler type for service manager
export type SMSProviderHandler = (
  config: ServiceConfig,
  params: SMSHandlerParams
) => Promise<SMSSuccessResponse>;

export type SMSHandlers = {
  intouch?: SMSProviderHandler;
  azure?: SMSProviderHandler;
  brevo?: SMSProviderHandler;
};

// OTP types
export interface OTPRequest {
  phoneNumber: string;
  method: 'sms' | 'whatsapp';
}

export interface VerifyOTPRequest {
  phoneNumber: string;
  code: string;
  fullName?: string;
}

export interface OTPRecord {
  id: string;
  phone: string;
  code: string;
  type: 'sms' | 'whatsapp';
  expires_at: string;
  verified_at: string | null;
  attempts: number;
  max_attempts: number;
  created_at: string;
}

export interface OTPSuccessResponse {
  success: true;
  message: string;
  provider?: string;
  expiresIn: number;
  otp?: string; // Only in dev mode
  devMode?: boolean;
}

export interface OTPRateLimitResponse {
  error: string;
  retryAfter: number;
  rateLimited: true;
}

export interface VerifyOTPSuccessResponse {
  success: true;
  action: 'login' | 'register' | 'needsName';
  userId?: string;
  sessionUrl?: string;
  isNewUser?: boolean;
  needsProfileCompletion?: boolean;
  phoneVerified?: boolean;
  message: string;
}
