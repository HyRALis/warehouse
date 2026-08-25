import multer from 'multer';
import path from 'path';

const memoryStorage = multer.memoryStorage();

/**
 * Multer configuration for image uploads
 */
export const uploadImageMiddleware = multer({
    storage: memoryStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, JPG, and WEBP are allowed.'));
        }
    },
});

export const uploadCsvMiddleware = multer({
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const allowedMimeTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
        const isCsv = extension === '.csv' && allowedMimeTypes.includes(file.mimetype);

        if (isCsv) {
            callback(null, true);
        } else {
            callback(new Error('Invalid file type. Only CSV files are allowed.'));
        }
    },
});
