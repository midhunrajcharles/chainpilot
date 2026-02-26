import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ApiResponse } from '../types';

const router = Router();

// GET /api/health
// Description: Check system health and service status
router.get('/',
  asyncHandler(async (req: any, res: any) => {
    const startTime = Date.now();
    
    // Check database connection
    let dbStatus = 'healthy';
    let dbError = null;
    
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      } else {
        throw new Error('Database not connected');
      }
    } catch (error) {
      dbStatus = 'unhealthy';
      dbError = error;
    }

    // Check external services
    const services: any = {
      database: {
        status: dbStatus,
        error: dbError
      },
      cloudinary: {
        status: process.env.CLOUDINARY_CLOUD_NAME ? 'healthy' : 'unhealthy',
        error: process.env.CLOUDINARY_CLOUD_NAME ? null : 'Cloudinary not configured'
      },
      email: {
        status: process.env.SMTP_HOST ? 'healthy' : 'unhealthy',
        error: process.env.SMTP_HOST ? null : 'SMTP not configured'
      }
    };

    // Determine overall status
    const allHealthy = Object.values(services).every((service: any) => service.status === 'healthy');
    const anyUnhealthy = Object.values(services).some((service: any) => service.status === 'unhealthy');
    
    let overallStatus = 'healthy';
    if (anyUnhealthy) {
      overallStatus = 'degraded';
    }
    if (dbStatus === 'unhealthy') {
      overallStatus = 'unhealthy';
    }

    const responseTime = Date.now() - startTime;

    const response: ApiResponse = {
      success: true,
      data: {
        status: overallStatus,
        services: services,
        uptime: process.uptime(),
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    res.status(200).json(response);
  })
);

// GET /api/metrics
// Description: Get system performance metrics
router.get('/metrics',
  asyncHandler(async (req: any, res: any) => {
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    // Get CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    
    // Get database stats
    let dbStats = null;
    try {
      const stats = mongoose.connection.db ? await mongoose.connection.db.stats() : null;
      if (stats) {
        dbStats = {
          collections: stats.collections,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize
        };
      }
    } catch (error) {
      dbStats = { error: 'Unable to fetch database stats' };
    }

    // Get collection counts
    const collectionCounts: any = {};
    try {
      const collections = mongoose.connection.db ? await mongoose.connection.db.listCollections().toArray() : [];
      for (const collection of collections) {
        const count = mongoose.connection.db ? await mongoose.connection.db.collection(collection.name).countDocuments() : 0;
        collectionCounts[collection.name] = count;
      }
    } catch (error) {
      collectionCounts.error = 'Unable to fetch collection counts';
    }

    // Calculate uptime
    const uptime = process.uptime();
    const uptimeFormatted = {
      seconds: Math.floor(uptime),
      minutes: Math.floor(uptime / 60),
      hours: Math.floor(uptime / 3600),
      days: Math.floor(uptime / 86400)
    };

    const metrics = {
      system: {
        uptime: uptimeFormatted,
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      },
      database: dbStats,
      collections: collectionCounts,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        corsOrigin: process.env.CORS_ORIGIN
      },
      timestamp: new Date().toISOString()
    };

    const response: ApiResponse = {
      success: true,
      data: metrics
    };

    res.status(200).json(response);
  })
);

export default router;
