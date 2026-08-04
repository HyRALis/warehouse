import fs from 'fs';
import path from 'path';

export class StorageService {
  /**
   * Upload file to local storage
   * TODO: Replace with Cloudflare R2 SDK
   */
  static async uploadFile(buffer: Buffer, filename: string, mimetype: string): Promise<string> {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  }

  /**
   * Delete file from local storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(__dirname, '../..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
