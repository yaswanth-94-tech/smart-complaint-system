import { Request, Response } from 'express';
import {
  analyzeComplaintWithGemini,
  checkDuplicateComplaintsWithGemini,
  analyzeComplaintImageWithGemini,
} from '../services/gemini.service';

export const analyzeComplaint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, location } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: title',
      });
      return;
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: description',
      });
      return;
    }

    const locationStr = typeof location === 'string' ? location.trim() : 'Campus';

    const result = await analyzeComplaintWithGemini({
      title: title.trim(),
      description: description.trim(),
      location: locationStr,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in analyzeComplaint controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze complaint',
      message: error.message || 'Internal server error',
    });
  }
};

export const checkDuplicates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, location, existingComplaints } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: title',
      });
      return;
    }

    const result = await checkDuplicateComplaintsWithGemini(
      {
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        location: typeof location === 'string' ? location.trim() : '',
      },
      Array.isArray(existingComplaints) ? existingComplaints : []
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in checkDuplicates controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check duplicate complaints',
      message: error.message || 'Internal server error',
    });
  }
};

export const analyzeImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType, context } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: imageBase64',
      });
      return;
    }

    const result = await analyzeComplaintImageWithGemini({
      imageBase64: imageBase64.trim(),
      mimeType: typeof mimeType === 'string' ? mimeType.trim() : 'image/jpeg',
      context: typeof context === 'object' ? context : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in analyzeImage controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze complaint image',
      message: error.message || 'Internal server error',
    });
  }
};
