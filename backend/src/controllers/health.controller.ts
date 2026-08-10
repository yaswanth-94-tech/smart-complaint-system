import { Request, Response } from 'express';

export const getHealth = (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "Smart Complaint System backend is running"
  });
};
