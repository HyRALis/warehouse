import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

export class StorageService {
    /**
     * Upload file to local storage
     * TODO: Replace with Cloudflare R2 SDK
     *
     * Since multer diskStorage is used, the file is already written to disk.
     * This method just returns the relative URL path to the file.
     */
    static async uploadFile(file: Express.Multer.File): Promise<string> {
        return `/uploads/${file.filename}`;
    }

    /**
     * Delete file from local storage
     */
    static async deleteFile(filename: string): Promise<void> {
        const fullPath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }
}
