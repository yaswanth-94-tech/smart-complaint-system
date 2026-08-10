import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS for React frontend (localhost:5173 or process.env.FRONTEND_URL)
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api', healthRoutes);

app.listen(PORT, () => {
  console.log(`[SCMS Backend] Server running on http://localhost:${PORT}`);
});
