/**
 * Service de traitement de documents avec OCR et tagging intelligent
 * Utilise Tesseract.js pour l'OCR (gratuit, hors ligne) et Azure OpenAI pour le tagging
 */

import { createWorker } from 'tesseract.js';
import { apiKeysConfig } from '@/shared/config/api-keys.config';

interface OCRResult {
  text: string;
  success: boolean;
  error?: string;
}

interface TagGenerationResult {
  tags: string[];
  suggestedCategory?: string;
  success: boolean;
  error?: string;
}

// Event emitter pour la progression OCR
class OCREventEmitter {
  private listeners: Array<(progress: number) => void> = [];

  subscribe(callback: (progress: number) => void) {
    console.log('🔔 [OCR Emitter] Subscribe - listeners avant:', this.listeners.length);
    this.listeners.push(callback);
    console.log('🔔 [OCR Emitter] Subscribe - listeners après:', this.listeners.length);
    return () => {
      console.log('🔕 [OCR Emitter] Unsubscribe - listeners avant:', this.listeners.length);
      this.listeners = this.listeners.filter(cb => cb !== callback);
      console.log('🔕 [OCR Emitter] Unsubscribe - listeners après:', this.listeners.length);
    };
  }

  emit(progress: number) {
    console.log(`📢 [OCR Emitter] Emit progress: ${progress}% - listeners: ${this.listeners.length}`);
    this.listeners.forEach(cb => {
      console.log('  → Appel listener');
      cb(progress);
    });
  }

  clear() {
    console.log('🗑️ [OCR Emitter] Clear all listeners');
    this.listeners = [];
  }
}

const ocrProgressEmitter = new OCREventEmitter();

class DocumentProcessorService {
  private worker: Tesseract.Worker | null = null;
  private workerInitialized = false;

  /**
   * Initialise le worker Tesseract (avec logger global)
   */
  private async getWorker(): Promise<Tesseract.Worker> {
    if (!this.worker || !this.workerInitialized) {
      if (this.worker) {
        await this.worker.terminate();
      }
      this.worker = await createWorker('fra', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            console.log(`OCR: ${progress}%`);
            // Émettre l'événement de progression
            ocrProgressEmitter.emit(progress);
          }
        },
      });
      this.workerInitialized = true;
    }
    return this.worker;
  }

  /**
   * S'abonne à la progression OCR
   */
  onProgress(callback: (progress: number) => void): () => void {
    return ocrProgressEmitter.subscribe(callback);
  }

  /**
   * Extrait le texte d'un document via OCR (Tesseract.js - gratuit, hors ligne)
   */
  async extractTextFromDocument(fileUrl: string, _fileName: string): Promise<OCRResult> {
    try {
      const worker = await this.getWorker();

      // Récupérer l'image depuis l'URL
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Impossible de récupérer l\'image');
      }

      const blob = await response.blob();
      const result = await worker.recognize(blob);

      return {
        text: result.data.text || '',
        success: true,
      };
    } catch (error) {
      console.error('OCR URL error:', error);
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Extrait le texte d'un fichier File directement (pour les uploads)
   */
  async extractTextFromFile(file: File): Promise<OCRResult> {
    try {
      const worker = await this.getWorker();

      // Tesseract peut traiter directement les fichiers
      const result = await worker.recognize(file);

      return {
        text: result.data.text || '',
        success: true,
      };
    } catch (error) {
      console.error('OCR file error:', error);
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Termine le worker Tesseract (à appeler lors du cleanup)
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Génère des tags intelligents et suggère une catégorie via Azure OpenAI
   */
  async generateTagsAndCategory(
    documentText: string,
    fileName: string,
    _currentCategory: string
  ): Promise<TagGenerationResult> {
    if (!apiKeysConfig.azure.openai.isConfigured) {
      // Fallback: tags basiques basés sur le nom de fichier et le texte extrait
      return {
        tags: this.generateBasicTags(fileName, documentText),
        success: true,
      };
    }

    try {
      const systemPrompt = `Tu es un assistant spécialisé dans l'analyse de documents immobiliers.
Ta tâche est d'analyser le contenu d'un document et de:
1. Générer 3-5 tags pertinents en français (mots-clés importants)
2. Suggérer une catégorie parmi: contract, lease, insurance, diagnostic, invoice, receipt, other

Réponds UNIQUEMENT au format JSON:
{
  "tags": ["tag1", "tag2", "tag3"],
  "suggestedCategory": "category"
}

Catégories:
- contract: Contrats de location, baux d'habitation
- lease: Bail commercial
- insurance: Assurances habitation, assurance propriétaire
- diagnostic: Diagnostics techniques (amiante, plomb, énergie, gaz, etc.)
- invoice: Factures de travaux, de charges, de services
- receipt: Quittances de loyer
- other: Autres documents`;

      const response = await fetch(
        `${apiKeysConfig.azure.openai.endpoint}/openai/deployments/${apiKeysConfig.azure.openai.deploymentName}/chat/completions?api-version=${apiKeysConfig.azure.openai.apiVersion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKeysConfig.azure.openai.key,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: `Nom du fichier: ${fileName}\n\nContenu du document:\n${documentText.substring(0, 4000)}`,
              },
            ],
            max_tokens: 200,
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        }
      );

      if (!response.ok) {
        // Fallback vers les tags basiques
        return {
          tags: this.generateBasicTags(fileName, documentText),
          success: true,
        };
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0]?.message?.content || '{}');

      return {
        tags: content.tags || [],
        suggestedCategory: content.suggestedCategory,
        success: true,
      };
    } catch (error) {
      console.error('AI tagging error:', error);
      // Fallback vers les tags basiques
      return {
        tags: this.generateBasicTags(fileName, documentText),
        success: true,
      };
    }
  }

  /**
   * Génère des tags basiques à partir du nom de fichier et du texte extrait (fallback)
   */
  private generateBasicTags(fileName: string, extractedText?: string): string[] {
    const tags: string[] = [];
    const fileNameLower = fileName.toLowerCase();
    const textLower = extractedText?.toLowerCase() || '';

    // Tags basés sur le nom de fichier
    if (fileNameLower.includes('contrat') || fileNameLower.includes('bail')) {
      tags.push('location', 'contrat');
    }
    if (fileNameLower.includes('assurance')) {
      tags.push('assurance');
    }
    if (fileNameLower.includes('diagnostic')) {
      tags.push('diagnostic');
    }
    if (fileNameLower.includes('facture')) {
      tags.push('facture');
    }
    if (fileNameLower.includes('quittance')) {
      tags.push('loyer', 'quittance');
    }
    if (fileNameLower.includes('2024') || fileNameLower.includes('2025')) {
      tags.push(fileNameLower.includes('2024') ? '2024' : '2025');
    }

    // Tags basés sur le texte extrait
    if (textLower) {
      // Recherche de montants
      const amounts = textLower.match(/\d+[\s,]?\d*\s?(€|euros|fcfa|xof|cfa)/gi);
      if (amounts && amounts.length > 0) {
        tags.push('montant');
      }

      // Recherche de dates
      if (/\d{1,2}[\s\/\-\.]\d{1,2}[\s\/\-\.]\d{2,4}/.test(textLower)) {
        tags.push('daté');
      }

      // Recherche de noms propres (mots en majuscule au milieu du texte)
      const properNames = textLower.match(/\b[A-Z][a-z]+\b/g);
      if (properNames && properNames.length > 2) {
        tags.push('parties');
      }
    }

    // Limiter à 5 tags maximum
    return tags.slice(0, 5);
  }
}

// Singleton instance
export const documentProcessorService = new DocumentProcessorService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    documentProcessorService.terminate();
  });
}
