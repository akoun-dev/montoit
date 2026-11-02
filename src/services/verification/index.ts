/**
 * Services de vérification d'identité
 * Export centralisé pour tous les services de vérification
 */

export { oneCiService } from './oneci.service';
export type {
  OneCITokenResponse,
  OneCIIdentityVerification,
  OneCIFaceAuthRequest,
  OneCIAuthResponse,
  OneCIRequestCount,
} from './oneci.service';
