/**
 * Service de traitement d'image pour l'authentification faciale
 *
 * Compresse et formate les images avant l'envoi à l'API ONECI
 */

/**
 * Compresse et redimensionne une image base64 pour l'API ONECI
 * @param base64Image - Image au format dataURL (data:image/...)
 * @returns Image compressée au format base64 (sans préfixe data URL)
 */
export async function processImageForOneCI(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }

        // Dimensions maximales pour l'API ONECI
        const MAX_WIDTH = 640;
        const MAX_HEIGHT = 480;

        // Calculer les nouvelles dimensions en gardant le ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        // Arrondir les dimensions
        width = Math.round(width);
        height = Math.round(height);

        console.log('[ImageProcessing] Redimensionnement:', {
          original: { width: img.width, height: img.height },
          resized: { width, height },
        });

        // Redimensionner l'image
        canvas.width = width;
        canvas.height = height;

        // Fond blanc pour PNG (éviter transparence qui pourrait poser problème)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        // L'API ONECI préfère le format JPEG pour les données biométriques
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

        // Retirer le préfixe data:image/jpeg;base64,
        const base64Data = compressedDataUrl.split(',')[1];

        console.log('[ImageProcessing] Image traitée:', {
          format: 'JPEG',
          dimensions: { width, height },
          originalSize: Math.round(base64Image.length / 1024) + ' KB',
          processedSize: Math.round(base64Data.length / 1024) + ' KB',
          reduction: Math.round((1 - base64Data.length / base64Image.length) * 100) + '%',
        });

        resolve(base64Data);
      } catch (error) {
        console.error('[ImageProcessing] Erreur lors du traitement:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image'));
    };

    // Charger l'image
    img.src = base64Image;
  });
}
