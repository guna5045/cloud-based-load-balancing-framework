import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { isOriginAllowed } from './config/environment';
import { requestLogger } from './middlewares/requestLogger';
import { errorHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';

const app: Application = express();

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    project: 'Cloud-Based Load Balancing Framework',
    phase: 'Phase 1 - Project Foundation',
    status: 'online',
    endpoints: {
      health: '/api/health',
      servers: '/api/servers',
      topology: '/api/topology',
      requests: '/api/requests',
      metrics: '/api/metrics',
    },
  });
});

// 404 handler for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;
