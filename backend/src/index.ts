import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env.config';
import healthRoutes from './routes/health.routes';
import complaintRoutes from './routes/complaint.routes';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Configure CORS for dev and production frontend
app.use(cors({ origin: true, credentials: true }));

app.use(express.json({ limit: '15mb' }));

// Health Check Endpoints
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Smart Complaint System Backend API is running.',
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Smart Complaint System Backend API is running.',
  });
});

// API Routes
app.use('/api', healthRoutes);
app.use('/api/complaints', complaintRoutes);

// Start server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
