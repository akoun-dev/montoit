/**
 * Service ONECI (Office National de l'État Civil de Côte d'Ivoire)
 *
 * Export principal pour l'intégration ONECI dans l'application MonToit
 */

export { default as oneciService } from './oneci.service';
export {
  initOneciService,
  getAuthToken,
  invalidateAuthToken,
  verifyPersonAttributes,
  faceAuthentication,
  getRemainingRequests,
  verifyPerson,
  imageToBase64,
  isValidNni,
  formatDateForApi,
} from './oneci.service';

export * from './types';
