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
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '15mb' }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/complaints', complaintRoutes);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.send('Smart Complaint System Backend API is running.');
});

// Start server
app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
