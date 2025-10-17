/**
 * Mobile File System Service for Mon Toit Real Estate App
 *
 * This file provides file system functionality for handling property documents,
 * contracts, photos, and other real estate related files.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  modifiedAt: Date;
  category: 'contract' | 'document' | 'photo' | 'video' | 'other';
  propertyId?: string;
  tags?: string[];
}

export interface FileSystemStats {
  totalFiles: number;
  totalSize: number;
  filesByCategory: Record<string, number>;
  sizeByCategory: Record<string, number>;
}

export class MobileFileSystemService {
  private static instance: MobileFileSystemService;
  private files: Map<string, FileMetadata> = new Map();
  private readonly APP_DIRECTORY = 'montoit_files';

  private constructor() {}

  static getInstance(): MobileFileSystemService {
    if (!MobileFileSystemService.instance) {
      MobileFileSystemService.instance = new MobileFileSystemService();
    }
    return MobileFileSystemService.instance;
  }

  /**
   * Initialize file system
   */
  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('File system: Not running on native platform');
      return;
    }

    try {
      // Create app directory if it doesn't exist
      await this.ensureDirectoryExists();

      // Load file metadata from preferences
      await this.loadFileMetadata();

      console.log('✅ File system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize file system:', error);
      throw error;
    }
  }

  /**
   * Ensure app directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: this.APP_DIRECTORY,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch (error) {
      // Directory might already exist, which is fine
      console.log('Directory already exists or created');
    }
  }

  /**
   * Load file metadata from preferences
   */
  private async loadFileMetadata(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'file_metadata' });
      if (value) {
        const metadataArray = JSON.parse(value) as FileMetadata[];
        this.files.clear();
        metadataArray.forEach(meta => {
          this.files.set(meta.id, {
            ...meta,
            createdAt: new Date(meta.createdAt),
            modifiedAt: new Date(meta.modifiedAt),
          });
        });
      }
    } catch (error) {
      console.warn('Could not load file metadata:', error);
    }
  }

  /**
   * Save file metadata to preferences
   */
  private async saveFileMetadata(): Promise<void> {
    try {
      const metadataArray = Array.from(this.files.values()).map(meta => ({
        ...meta,
        createdAt: meta.createdAt.toISOString(),
        modifiedAt: meta.modifiedAt.toISOString(),
      }));

      await Preferences.set({
        key: 'file_metadata',
        value: JSON.stringify(metadataArray),
      });
    } catch (error) {
      console.error('Could not save file metadata:', error);
    }
  }

  /**
   * Write file to storage
   */
  async writeFile(
    content: string | Blob,
    fileName: string,
    category: FileMetadata['category'],
    options?: {
      propertyId?: string;
      tags?: string[];
      mimeType?: string;
    }
  ): Promise<FileMetadata> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('File system is only available on native platforms');
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Light });

      const fileId = this.generateId();
      const filePath = `${this.APP_DIRECTORY}/${fileId}_${fileName}`;

      let data: string;
      let mimeType = options?.mimeType || 'text/plain';
      let size = 0;

      if (content instanceof Blob) {
        data = await this.blobToBase64(content);
        size = content.size;
        mimeType = content.type || mimeType;
      } else {
        data = content;
        size = new Blob([content]).size;
      }

      // Write file
      await Filesystem.writeFile({
        path: filePath,
        data,
        directory: Directory.Documents,
        encoding: content instanceof Blob ? undefined : Encoding.UTF8,
      });

      // Create metadata
      const metadata: FileMetadata = {
        id: fileId,
        name: fileName,
        path: filePath,
        size,
        mimeType,
        createdAt: new Date(),
        modifiedAt: new Date(),
        category,
        propertyId: options?.propertyId,
        tags: options?.tags || [],
      };

      // Store metadata
      this.files.set(fileId, metadata);
      await this.saveFileMetadata();

      await Haptics.notification({ type: 'success' });

      return metadata;
    } catch (error) {
      console.error('Error writing file:', error);
      throw new Error('Impossible d\'écrire le fichier: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }

  /**
   * Read file from storage
   */
  async readFile(fileId: string): Promise<{ content: string; metadata: FileMetadata }> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('File system is only available on native platforms');
    }

    try {
      const metadata = this.files.get(fileId);
      if (!metadata) {
        throw new Error('File not found');
      }

      const result = await Filesystem.readFile({
        path: metadata.path,
        directory: Directory.Documents,
        encoding: this.isTextFile(metadata.mimeType) ? Encoding.UTF8 : undefined,
      });

      await Haptics.impact({ style: ImpactStyle.Light });

      return {
        content: result.data as string,
        metadata,
      };
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error('Impossible de lire le fichier: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      const metadata = this.files.get(fileId);
      if (!metadata) {
        return false;
      }

      // Delete from filesystem
      await Filesystem.deleteFile({
        path: metadata.path,
        directory: Directory.Documents,
      });

      // Remove from metadata
      this.files.delete(fileId);
      await this.saveFileMetadata();

      await Haptics.impact({ style: ImpactStyle.Medium });

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get file metadata
   */
  getFileMetadata(fileId: string): FileMetadata | undefined {
    return this.files.get(fileId);
  }

  /**
   * Get all files
   */
  getAllFiles(): FileMetadata[] {
    return Array.from(this.files.values());
  }

  /**
   * Get files by category
   */
  getFilesByCategory(category: FileMetadata['category']): FileMetadata[] {
    return Array.from(this.files.values()).filter(file => file.category === category);
  }

  /**
   * Get files by property ID
   */
  getFilesByProperty(propertyId: string): FileMetadata[] {
    return Array.from(this.files.values()).filter(file => file.propertyId === propertyId);
  }

  /**
   * Search files by name or tags
   */
  searchFiles(query: string): FileMetadata[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.files.values()).filter(file =>
      file.name.toLowerCase().includes(lowerQuery) ||
      file.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get file system statistics
   */
  getStats(): FileSystemStats {
    const files = Array.from(this.files.values());
    const filesByCategory: Record<string, number> = {};
    const sizeByCategory: Record<string, number> = {};

    files.forEach(file => {
      filesByCategory[file.category] = (filesByCategory[file.category] || 0) + 1;
      sizeByCategory[file.category] = (sizeByCategory[file.category] || 0) + file.size;
    });

    return {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      filesByCategory,
      sizeByCategory,
    };
  }

  /**
   * Clear all files
   */
  async clearAllFiles(): Promise<void> {
    try {
      const files = Array.from(this.files.values());

      // Delete all files from filesystem
      for (const file of files) {
        try {
          await Filesystem.deleteFile({
            path: file.path,
            directory: Directory.Documents,
          });
        } catch (error) {
          console.warn(`Could not delete file ${file.name}:`, error);
        }
      }

      // Clear metadata
      this.files.clear();
      await this.saveFileMetadata();

      await Haptics.notification({ type: 'success' });
    } catch (error) {
      console.error('Error clearing files:', error);
      throw error;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Convert Blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if file is text-based
   */
  private isTextFile(mimeType: string): boolean {
    const textMimeTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/rtf',
    ];

    return textMimeTypes.some(type => mimeType.startsWith(type));
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Export files (create backup)
   */
  async exportFiles(): Promise<string> {
    try {
      const files = Array.from(this.files.values());
      const exportData = {
        exportedAt: new Date().toISOString(),
        files: files.map(file => ({
          ...file,
          createdAt: file.createdAt.toISOString(),
          modifiedAt: file.modifiedAt.toISOString(),
        })),
      };

      const fileName = `montoit_backup_${Date.now()}.json`;
      const content = JSON.stringify(exportData, null, 2);

      const metadata = await this.writeFile(content, fileName, 'document', {
        tags: ['backup', 'export'],
        mimeType: 'application/json',
      });

      await Haptics.notification({ type: 'success' });

      return metadata.id;
    } catch (error) {
      console.error('Error exporting files:', error);
      throw error;
    }
  }
}

/**
 * React hook for file system functionality
 */
export function useMobileFileSystem() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [files, setFiles] = React.useState<FileMetadata[]>([]);
  const [stats, setStats] = React.useState<FileSystemStats | null>(null);

  const fileService = MobileFileSystemService.getInstance();

  React.useEffect(() => {
    initializeFileSystem();
  }, []);

  const initializeFileSystem = async () => {
    setIsLoading(true);
    try {
      await fileService.initialize();
      setFiles(fileService.getAllFiles());
      setStats(fileService.getStats());
    } catch (error) {
      console.error('Failed to initialize file system:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const writeFile = async (
    content: string | Blob,
    fileName: string,
    category: FileMetadata['category'],
    options?: {
      propertyId?: string;
      tags?: string[];
      mimeType?: string;
    }
  ) => {
    setIsLoading(true);
    try {
      const metadata = await fileService.writeFile(content, fileName, category, options);
      setFiles(fileService.getAllFiles());
      setStats(fileService.getStats());
      return metadata;
    } finally {
      setIsLoading(false);
    }
  };

  const readFile = async (fileId: string) => {
    setIsLoading(true);
    try {
      return await fileService.readFile(fileId);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    const success = await fileService.deleteFile(fileId);
    if (success) {
      setFiles(fileService.getAllFiles());
      setStats(fileService.getStats());
    }
    return success;
  };

  const searchFiles = (query: string) => {
    return fileService.searchFiles(query);
  };

  const exportFiles = async () => {
    setIsLoading(true);
    try {
      const exportId = await fileService.exportFiles();
      setFiles(fileService.getAllFiles());
      return exportId;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    files,
    stats,
    writeFile,
    readFile,
    deleteFile,
    searchFiles,
    exportFiles,
    getFilesByCategory: fileService.getFilesByCategory.bind(fileService),
    getFilesByProperty: fileService.getFilesByProperty.bind(fileService),
    formatFileSize: fileService.formatFileSize.bind(fileService),
  };
}