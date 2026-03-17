/**
 * Auth Services Module
 *
 * Exporte tous les services liés à l'authentification
 */

export { otpService, default as defaultOTPService } from './otp.service';
export { authService, default as defaultAuthService } from './auth.service';
export { welcomeMessageService, default as defaultWelcomeMessageService } from './welcome-message.service';
export type {
  OTPRequest,
  OTPVerification,
  OTPResult,
  OTPVerificationResult,
} from './otp.service';
export type {
  SignUpData,
  SignInData,
  AuthResult,
} from './auth.service';
export type {
  WelcomeMessageRequest,
  WelcomeMessageResponse,
  WelcomeMessageResult,
} from './welcome-message.service';
