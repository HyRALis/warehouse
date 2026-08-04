import { Response, NextFunction } from 'express';
import prisma from '@inventory-system/database';
import { AuthRequest } from '../middleware/auth';

export class TemplateController {
  /**
   * List templates
   */
  static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = await prisma.characteristicTemplate.findMany({
        where: { vendorId: req.vendorId },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template by id
   */
  static async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const template = await prisma.characteristicTemplate.findFirst({
        where: { id, vendorId: req.vendorId }
      });

      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }

      res.status(200).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create template
   */
  static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, fields } = req.body;
      const template = await prisma.characteristicTemplate.create({
        data: {
          name,
          fields,
          vendorId: req.vendorId!
        }
      });
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update template
   */
  static async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, fields } = req.body;

      const template = await prisma.characteristicTemplate.findFirst({
        where: { id, vendorId: req.vendorId }
      });

      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }

      const updatedTemplate = await prisma.characteristicTemplate.update({
        where: { id },
        data: { name, fields }
      });

      res.status(200).json({ success: true, data: updatedTemplate });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete template
   */
  static async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const template = await prisma.characteristicTemplate.findFirst({
        where: { id, vendorId: req.vendorId }
      });

      if (!template) {
        res.status(404).json({ success: false, message: 'Template not found' });
        return;
      }

      await prisma.characteristicTemplate.delete({ where: { id } });

      res.status(200).json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}
