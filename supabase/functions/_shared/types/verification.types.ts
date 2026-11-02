/**
 * Types for verification edge functions
 */

// ============ Face Verification Types ============

export interface FaceVerificationRequest {
  cniImageBase64: string;
  selfieBase64: string;
}

export interface AzureFaceDetectResponse {
  faceId: string;
  faceRectangle: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface AzureFaceVerifyResponse {
  isIdentical: boolean;
  confidence: number;
}

export interface FaceVerificationUpdateData {
  face_verification_attempts: number;
  face_similarity_score: number;
  face_verification_status?: 'verified' | 'failed';
  face_verified_at?: string;
}

// ============ CryptoNeo Signature Types ============

export interface SignatureRequest {
  action: 'request_certificate' | 'verify_otp' | 'sign_document' | 'get_certificate';
  userId: string;
  leaseId?: string;
  documentUrl?: string;
  otpCode?: string;
  phoneNumber?: string;
  email?: string;
  fullName?: string;
}

export interface LeaseSignatureUpdate {
  signature_timestamp?: string;
  signed_pdf_url?: string;
  tenant_signature?: string;
  tenant_signed_at?: string;
  tenant_certificate_id?: string;
  landlord_signature?: string;
  landlord_signed_at?: string;
  landlord_certificate_id?: string;
  status?: string;
}

export interface CryptoNeoSignResult {
  signature_id: string;
  signed_document_url: string;
  timestamp: string;
}

export interface CryptoNeoCertificateResult {
  certificate_id: string;
}

// ============ ONECI Verification Types ============

export interface ONECIRequest {
  verificationId: string;
  cniNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  userId: string;
}

export interface ONECIVerificationResult {
  verified: boolean;
  confidence?: number;
  score?: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  nationality?: string;
  gender?: string;
  address?: string;
  issued_date?: string;
  expiry_date?: string;
}

// ============ CNAM Verification Types ============

export interface CNAMRequest {
  verificationId: string;
  cnamNumber: string;
  firstName: string;
  lastName: string;
  userId: string;
}

export interface CNAMVerificationResult {
  verified: boolean;
  status?: string;
  policy_status?: string;
  full_name?: string;
  affiliation_number?: string;
  affiliation_date?: string;
  employer?: string;
  is_active?: boolean;
}
