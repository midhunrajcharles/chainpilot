import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

// Middleware to extract wallet address from headers
export const extractWalletAddress = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const walletAddress = req.headers['walletaddress'] as string;
  
  if (!walletAddress) {
    res.status(400).json({
      success: false,
      error: 'Wallet address is required in headers'
    });
    return;
  }

  // Basic wallet address validation (Ethereum format)
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    res.status(400).json({
      success: false,
      error: 'Invalid wallet address format'
    });
    return;
  }

  req.walletAddress = walletAddress.toLowerCase();
  next();
};

// src/middleware/authMiddleware.ts

export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure body exists
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({
        success: false,
        error: "Invalid request body",
      });
      return; // Exit early
    }

    const missing: string[] = [];
    for (const field of fields) {
      if (
        req.body[field] === undefined ||
        req.body[field] === null ||
        req.body[field] === ""
      ) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      });
      return;
    }

    next();
  };
};
// Middleware to validate MongoDB ObjectId
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = req.params[paramName];
    
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`
      });
      return;
    }

    next();
  };
};

// Middleware to check if user exists
export const checkUserExists = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { User } = await import('../models/User');
    
    const user = await User.findOne({ walletAddress: req.walletAddress });
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
