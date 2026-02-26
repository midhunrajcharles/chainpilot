import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { extractWalletAddress, validateRequiredFields, validateObjectId } from '../middleware/authMiddleware';
import { Notification } from '../models/Notification';
import { NotificationSubscription } from '../models/NotificationSubscription';
import { ApiResponse, PaginatedResponse } from '../types';
import { calculatePagination } from '../utils/helpers';

const router = Router();

// GET /api/notifications
// Description: Get user notifications with filtering options
router.get('/',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { unread, page = 1, limit = 20 } = req.query;

    let query: any = { walletAddress: userWalletAddress };
    if (unread !== undefined) {
      query.read = unread === 'true' ? false : true;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments(query);
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const pagination = calculatePagination(parseInt(page), parseInt(limit), total);

    const response: PaginatedResponse<any> = {
      success: true,
      data: notifications,
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages
    };

    res.status(200).json(response);
  })
);

// POST /api/notifications/mark-read
// Description: Mark notifications as read
router.post('/mark-read',
  extractWalletAddress,
  validateRequiredFields(['notificationIds']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { notificationIds } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'notificationIds must be a non-empty array'
      });
    }

    // Validate all IDs are valid ObjectIds
    for (const id of notificationIds) {
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return res.status(400).json({
          success: false,
          error: `Invalid notification ID: ${id}`
        });
      }
    }

    const result = await Notification.updateMany(
      {
        _id: { $in: notificationIds },
        walletAddress: userWalletAddress
      },
      { read: true }
    );

    const response: ApiResponse = {
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      },
      message: `${result.modifiedCount} notifications marked as read`
    };

    res.status(200).json(response);
  })
);

// POST /api/notifications/subscribe
// Description: Subscribe to notification channels
router.post('/subscribe',
  extractWalletAddress,
  validateRequiredFields(['type', 'events']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { type, endpoint, events } = req.body;

    if (!['email', 'push', 'sms'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be email, push, or sms'
      });
    }

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events must be a non-empty array'
      });
    }

    // Check if subscription already exists
    const existingSubscription = await NotificationSubscription.findOne({
      walletAddress: userWalletAddress,
      type: type,
      endpoint: endpoint
    });

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.events = events;
      existingSubscription.active = true;
      await existingSubscription.save();

      const response: ApiResponse = {
        success: true,
        data: existingSubscription,
        message: 'Subscription updated successfully'
      };

      res.status(200).json(response);
    } else {
      // Create new subscription
      const subscription = new NotificationSubscription({
        walletAddress: userWalletAddress,
        type: type,
        endpoint: endpoint,
        events: events,
        active: true
      });

      await subscription.save();

      const response: ApiResponse = {
        success: true,
        data: subscription,
        message: 'Subscription created successfully'
      };

      res.status(201).json(response);
    }
  })
);

// GET /api/notifications/subscriptions
// Description: Get user's notification subscriptions
router.get('/subscriptions',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;

    const subscriptions = await NotificationSubscription.find({
      walletAddress: userWalletAddress
    }).sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      data: subscriptions
    };

    res.status(200).json(response);
  })
);

// DELETE /api/notifications/subscriptions/:id
// Description: Unsubscribe from a notification channel
router.delete('/subscriptions/:id',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const subscriptionId = req.params.id;

    const subscription = await NotificationSubscription.findOneAndDelete({
      _id: subscriptionId,
      walletAddress: userWalletAddress
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Subscription deleted successfully'
    };

    res.status(200).json(response);
  })
);

// Helper function to create notifications
export const createNotification = async (
  walletAddress: string,
  type: string,
  title: string,
  message: string,
  data: any = {}
): Promise<void> => {
  try {
    const notification = new Notification({
      walletAddress: walletAddress,
      type: type,
      title: title,
      message: message,
      data: data,
      read: false
    });

    await notification.save();

    // Send push notification if user has push subscription
    const pushSubscriptions = await NotificationSubscription.find({
      walletAddress: walletAddress,
      type: 'push',
      active: true,
      events: { $in: [type, 'all'] }
    });

    for (const subscription of pushSubscriptions) {
      if (subscription.endpoint) {
        // Send push notification (mock implementation)
        console.log(`Sending push notification to ${subscription.endpoint}: ${title}`);
      }
    }

    // Send email notification if user has email subscription
    const emailSubscriptions = await NotificationSubscription.find({
      walletAddress: walletAddress,
      type: 'email',
      active: true,
      events: { $in: [type, 'all'] }
    });

    for (const subscription of emailSubscriptions) {
      if (subscription.endpoint) {
        // Send email notification (mock implementation)
        console.log(`Sending email notification to ${subscription.endpoint}: ${title}`);
      }
    }

  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export default router;
