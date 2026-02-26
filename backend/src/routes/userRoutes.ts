import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { extractWalletAddress, validateRequiredFields } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { ApiResponse } from '../types';

const router = Router();

// POST /api/user/create-or-update
// Description: Create or update user profile based on wallet address
router.post('/create-or-update', 
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const { walletAddress, name, preferences } = req.body;
    const userWalletAddress = req.walletAddress;

    // Validate wallet address matches header
    if (walletAddress.toLowerCase() !== userWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address mismatch'
      });
    }

    // Find existing user or create new one
    let user = await User.findOne({ walletAddress: userWalletAddress });
    
    if (user) {
      // Update existing user
      if (name !== undefined) user.name = name;
      if (preferences !== undefined) user.preferences = { ...user.preferences, ...preferences };
      user.updatedAt = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        walletAddress: userWalletAddress,
        name: name || '',
        preferences: preferences || {}
      });
      await user.save();
    }

    const response: ApiResponse = {
      success: true,
      data: user,
      message: user.name ? 'User updated successfully' : 'User created successfully'
    };

    res.status(200).json(response);
  })
);

// GET /api/user/profile
// Description: Get user profile by wallet address
router.get('/profile',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;

    const user = await User.findOne({ walletAddress: userWalletAddress });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      data: user
    };

    res.status(200).json(response);
  })
);

// PUT /api/user/profile
// Description: Update user profile and preferences
router.put('/profile',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { name, preferences } = req.body;

    const user = await User.findOne({ walletAddress: userWalletAddress });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user fields
    if (name !== undefined) user.name = name;
    if (preferences !== undefined) user.preferences = { ...user.preferences, ...preferences };
    user.updatedAt = new Date();

    await user.save();

    const response: ApiResponse = {
      success: true,
      data: user,
      message: 'Profile updated successfully'
    };

    res.status(200).json(response);
  })
);

export default router;
