import { Router } from 'express';
import { extractWalletAddress, validateObjectId, validateRequiredFields } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';
import { Contact } from '../models/Contact';
import { Transaction } from '../models/Transaction';
import { ApiResponse } from '../types';
import { formatWalletAddress, validateWalletAddress } from '../utils/helpers';

const router = Router();

// GET /api/contacts
// Description: Get all saved contacts for the user
router.get('/',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { group } = req.query;

    let query: any = { walletAddress: userWalletAddress };
    if (group) {
      query.group = group;
    }

    const contacts = await Contact.find(query).sort({ createdAt: -1 });

    // Transform _id to id for frontend compatibility
    const transformedContacts = contacts.map(contact => ({
      ...contact.toObject(),
      id: contact._id.toString()
    }));

    const response: ApiResponse = {
      success: true,
      data: transformedContacts
    };

    res.status(200).json(response);
  })
);

// POST /api/contacts
// Description: Add a new contact to the user's address book
router.post('/',
  extractWalletAddress,
  validateRequiredFields(['name', 'address']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { name, address, group, verified } = req.body;

    // Validate wallet address format
    if (!validateWalletAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    // Check if contact already exists
    const existingContact = await Contact.findOne({
      walletAddress: userWalletAddress,
      address: formatWalletAddress(address)
    });

    if (existingContact) {
      return res.status(400).json({
        success: false,
        error: 'Contact already exists'
      });
    }

    const contact = new Contact({
      walletAddress: userWalletAddress,
      name: name.trim(),
      address: formatWalletAddress(address),
      group: group || 'default',
      verified: true, // Always set to true
      reputation: {}
    });

    await contact.save();

    // Transform _id to id for frontend compatibility
    const transformedContact = {
      ...contact.toObject(),
      id: contact._id.toString()
    };

    const response: ApiResponse = {
      success: true,
      data: transformedContact,
      message: 'Contact added successfully'
    };

    res.status(201).json(response);
  })
);

// PUT /api/contacts/:id
// Description: Update an existing contact's information
router.put('/:id',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const contactId = req.params.id;
    const { name, address, group, verified } = req.body;

    const contact = await Contact.findOne({
      _id: contactId,
      walletAddress: userWalletAddress
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Validate wallet address if provided
    if (address && !validateWalletAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    // Check for duplicate address if changing address
    if (address && formatWalletAddress(address) !== contact.address) {
      const existingContact = await Contact.findOne({
        walletAddress: userWalletAddress,
        address: formatWalletAddress(address),
        _id: { $ne: contactId }
      });

      if (existingContact) {
        return res.status(400).json({
          success: false,
          error: 'Contact with this address already exists'
        });
      }
    }

    // Update contact fields
    if (name !== undefined) contact.name = name.trim();
    if (address !== undefined) contact.address = formatWalletAddress(address);
    if (group !== undefined) contact.group = group;
    // Always keep verified as true
    contact.verified = true;

    await contact.save();

    // Transform _id to id for frontend compatibility
    const transformedContact = {
      ...contact.toObject(),
      id: contact._id.toString()
    };

    const response: ApiResponse = {
      success: true,
      data: transformedContact,
      message: 'Contact updated successfully'
    };

    res.status(200).json(response);
  })
);

// DELETE /api/contacts/:id
// Description: Remove a contact from the address book
router.delete('/:id',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const contactId = req.params.id;

    const contact = await Contact.findOneAndDelete({
      _id: contactId,
      walletAddress: userWalletAddress
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Contact deleted successfully'
    };

    res.status(200).json(response);
  })
);

// GET /api/contacts/groups
// Description: Get all contact groups created by the user
router.get('/groups',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;

    const groups = await Contact.distinct('group', { walletAddress: userWalletAddress });

    const response: ApiResponse = {
      success: true,
      data: groups
    };

    res.status(200).json(response);
  })
);

// POST /api/contacts/verify
// Description: Verify and check reputation of a wallet address
router.post('/verify',
  extractWalletAddress,
  validateRequiredFields(['address']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { address } = req.body;

    if (!validateWalletAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    const formattedAddress = formatWalletAddress(address);

    // Get transaction history for reputation analysis
    const transactions = await Transaction.find({
      $or: [
        { from: formattedAddress },
        { to: formattedAddress }
      ]
    }).sort({ createdAt: -1 });

    // Calculate reputation metrics
    const transactionCount = transactions.length;
    const totalVolume = transactions.reduce((sum, tx) => {
      return sum + parseFloat(tx.amount);
    }, 0);

    const lastSeen = transactions.length > 0 ? transactions[0].createdAt : new Date();
    const riskScore = Math.max(0, 100 - (transactionCount * 2) - (totalVolume / 1000));

    const reputation = {
      transactionCount,
      totalVolume,
      riskScore: Math.round(riskScore),
      lastSeen: lastSeen.toISOString(),
      tags: transactionCount > 10 ? ['frequent_user'] : ['new_user']
    };

    const response: ApiResponse = {
      success: true,
      data: {
        verified: transactionCount > 0,
        reputation
      }
    };

    res.status(200).json(response);
  })
);

// GET /api/contacts/suggestions
// Description: Get smart contact suggestions based on query
router.get('/suggestions',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters long'
      });
    }

    // Search contacts by name or address
    const contacts = await Contact.find({
      walletAddress: userWalletAddress,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);

    const response: ApiResponse = {
      success: true,
      data: contacts
    };

    res.status(200).json(response);
  })
);

export default router;
