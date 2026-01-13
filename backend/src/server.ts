import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import passport, { initializePassport } from './config/passport';

// Import routes
import authRoutes from './routes/auth.routes';
import recruiterRoutes from './routes/recruiter.routes';
import applicantRoutes from './routes/applicant.routes';
import jobRoutes from './routes/job.routes';
import applicationRoutes from './routes/application.routes';
import aiRoutes from './routes/ai.routes';
import interviewRoutes from './routes/interview.routes';
import talentPoolRoutes from './routes/talent-pool.routes';

// Load environment variables
dotenv.config();

// Initialize Passport OAuth strategies
initializePassport();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8080',
    'http://localhost:8081', // Vite alternative port
    'http://localhost:8082',
    'https://hiresense-gcc.vercel.app', // Production frontend
  ],
  credentials: true
}));
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with 10MB limit for resumes
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(passport.initialize()); // Initialize Passport

// Ensure database connection for each request in serverless
if (process.env.VERCEL === '1') {
  app.use(async (req: Request, res: Response, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error('DB connection error in middleware:', error);
      res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
  });
}

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to HireSense API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      jobs: '/api/jobs',
      applications: '/api/applications'
    }
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'HireSense API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/applicant', applicantRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/talent-pool', talentPoolRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  try {
    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
    });

    // Handle unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Only start the server if not in a serverless environment (Vercel)
if (process.env.VERCEL !== '1') {
  startServer();
} else {
  // For Vercel serverless, connect to DB with caching
  let isConnected = false;
  const connectOnce = async () => {
    if (!isConnected) {
      try {
        await connectDB();
        isConnected = true;
      } catch (error) {
        console.error('Failed to connect to database:', error);
      }
    }
  };
  connectOnce();
}

export default app;
