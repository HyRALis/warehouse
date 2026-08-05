import QRCode from 'qrcode';

export class QRCodeService {
    /**
     * Generate QR Code as Data URL
     */
    static async generateQRCode(productId: string): Promise<string> {
        try {
            const url = await QRCode.toDataURL(productId);
            return url;
        } catch (err) {
            console.error(err);
            throw new Error('Failed to generate QR code');
        }
    }
}
