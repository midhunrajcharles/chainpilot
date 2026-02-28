import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { requestLogger } from "./middleware/logger";
import { connectDB } from './config/database';
import { errorHandler, notFound } from './middleware/errorMiddleware';

// Import routes
import analyticsRoutes from './routes/analyticsRoutes';
import chatRoutes from './routes/chatRoutes';
import contactRoutes from './routes/contactRoutes';
import healthRoutes from './routes/healthRoutes';
import notificationRoutes from './routes/notificationRoutes';
import securityRoutes from './routes/securityRoutes';
import sharingRoutes from './routes/sharingRoutes';
import teamRoutes from './routes/teamRoutes';
import transactionRoutes from './routes/transactionRoutes';
import userRoutes from './routes/userRoutes';

// Import new security routes
import contractAnalysisRoutes from './routes/contractAnalysisRoutes';
import monitoringRoutes from './routes/monitoringRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import anomalyRoutes from './routes/anomalyRoutes';
import policyRoutes from './routes/policyRoutes';
import multiChainRoutes from './routes/multiChainRoutes';

// Import monitoring engine
import { startMonitoringEngine, loadActiveMonitors } from './services/monitoringEngine';
import { startScheduledExecutor } from './services/scheduledExecutor';
import ContractMonitor from './models/ContractMonitor';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Parse CORS_ORIGIN: supports comma-separated list, single value, or fallback to both local ports
const rawCorsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001';
const allowedOrigins = rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls (no origin) and whitelisted origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CRITICAL: Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Compression middleware
app.use(compression());

// Logging middleware
app.use(requestLogger());
// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ChainPilot AI Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/user', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/sharing', sharingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/health', healthRoutes);

// New security analysis routes
app.use('/api/contracts', contractAnalysisRoutes);
app.use('/api/monitors', monitoringRoutes);
app.use('/api/audits', auditLogRoutes);
app.use('/api/anomaly', anomalyRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/multichain', multiChainRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize monitoring engine
async function initializeMonitoringEngine() {
  try {
    // Load active monitors from database
    await loadActiveMonitors(async () => {
      const monitors = await ContractMonitor.find({ isActive: true }).lean();
      return monitors.map((m: any) => ({
        id: m._id.toString(),
        userId: m.userId,
        contractAddress: m.contractAddress,
        chainId: m.chainId,
        thresholds: m.thresholds,
        isActive: m.isActive,
        lastChecked: m.lastChecked,
        createdAt: m.createdAt,
        alertHistory: m.alertHistory,
      }));
    });
    
    // Start cron jobs
    startMonitoringEngine();
    
    console.log('✅ Monitoring engine initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize monitoring engine:', error);
  }
}

function initializeScheduledExecutor() {
  try {
    startScheduledExecutor();
  } catch (error) {
    console.error('⚠️  Failed to initialize scheduled auto executor:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 ChainPilot AI Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
  console.log(`🛡️  Security Analysis Engine: ACTIVE`);
  
  // Initialize monitoring engine after server starts
  await initializeMonitoringEngine();
  initializeScheduledExecutor();
});

export default app;
