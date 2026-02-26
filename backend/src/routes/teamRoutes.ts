import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { extractWalletAddress, validateRequiredFields, validateObjectId } from '../middleware/authMiddleware';
import { Team } from '../models/Team';
import { TeamTransaction } from '../models/TeamTransaction';
import { ApiResponse } from '../types';
import { validateWalletAddress, formatWalletAddress } from '../utils/helpers';

const router = Router();

// GET /api/teams
// Description: Get all teams the user is a member of
router.get('/',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;

    const teams = await Team.find({
      $or: [
        { ownerWalletAddress: userWalletAddress },
        { 'members.walletAddress': userWalletAddress }
      ]
    }).sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      data: teams
    };

    res.status(200).json(response);
  })
);

// POST /api/teams
// Description: Create a new team workspace
router.post('/',
  extractWalletAddress,
  validateRequiredFields(['name']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { name, description, members = [] } = req.body;

    // Validate members array if provided
    if (members && !Array.isArray(members)) {
      return res.status(400).json({
        success: false,
        error: 'Members must be an array'
      });
    }

    // Validate each member if provided
    if (members.length > 0) {
      for (const member of members) {
        if (!member.walletAddress || !member.name) {
          return res.status(400).json({
            success: false,
            error: 'Each member must have walletAddress and name'
          });
        }

        if (!validateWalletAddress(member.walletAddress)) {
          return res.status(400).json({
            success: false,
            error: `Invalid wallet address: ${member.walletAddress}`
          });
        }
      }

      // Check for duplicate members
      const uniqueAddresses = new Set(members.map((m: any) => m.walletAddress.toLowerCase()));
      if (uniqueAddresses.size !== members.length) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate members not allowed'
        });
      }

      // Check if owner is in members list
      const ownerInMembers = members.some((m: any) => 
        m.walletAddress.toLowerCase() === userWalletAddress
      );

      if (!ownerInMembers) {
        members.unshift({
          walletAddress: userWalletAddress,
          name: 'Team Owner'
        });
      }
    } else {
      // If no members provided, add owner as the only member
      members.push({
        walletAddress: userWalletAddress,
        name: 'Team Owner'
      });
    }

    const team = new Team({
      name: name.trim(),
      description: description?.trim() || '',
      ownerWalletAddress: userWalletAddress,
      members: members.map((member: any) => ({
        walletAddress: formatWalletAddress(member.walletAddress),
        name: member.name.trim(),
        joinedAt: new Date()
      })),
      settings: {}
    });

    await team.save();

    const response: ApiResponse = {
      success: true,
      data: team,
      message: 'Team created successfully'
    };

    res.status(201).json(response);
  })
);

// PUT /api/teams/:id
// Description: Update team information and settings
router.put('/:id',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const teamId = req.params.id;
    const { name, description, members } = req.body;

    const team = await Team.findOne({
      _id: teamId,
      ownerWalletAddress: userWalletAddress
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found or you are not the owner'
      });
    }

    // Update team fields
    if (name !== undefined) team.name = name.trim();
    if (description !== undefined) team.description = description.trim();

    // Update members if provided
    if (members !== undefined) {
      if (!Array.isArray(members)) {
        return res.status(400).json({
          success: false,
          error: 'Members must be an array'
        });
      }

      // Validate each member
      for (const member of members) {
        if (!member.walletAddress || !member.name) {
          return res.status(400).json({
            success: false,
            error: 'Each member must have walletAddress and name'
          });
        }

        if (!validateWalletAddress(member.walletAddress)) {
          return res.status(400).json({
            success: false,
            error: `Invalid wallet address: ${member.walletAddress}`
          });
        }
      }

      // Check for duplicate members
      const uniqueAddresses = new Set(members.map((m: any) => m.walletAddress.toLowerCase()));
      if (uniqueAddresses.size !== members.length) {
        return res.status(400).json({
          success: false,
          error: 'Duplicate members not allowed'
        });
      }

      team.members = members.map((member: any) => ({
        walletAddress: formatWalletAddress(member.walletAddress),
        name: member.name.trim(),
        joinedAt: new Date()
      }));
    }

    await team.save();

    const response: ApiResponse = {
      success: true,
      data: team,
      message: 'Team updated successfully'
    };

    res.status(200).json(response);
  })
);

// DELETE /api/teams/:id
// Description: Delete a team workspace
router.delete('/:id',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const teamId = req.params.id;

    const team = await Team.findOneAndDelete({
      _id: teamId,
      ownerWalletAddress: userWalletAddress
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found or you are not the owner'
      });
    }

    // Delete all team transactions
    await TeamTransaction.deleteMany({ teamId: teamId });

    const response: ApiResponse = {
      success: true,
      message: 'Team deleted successfully'
    };

    res.status(200).json(response);
  })
);

// POST /api/teams/:id/members
// Description: Add a new member to the team
router.post('/:id/members',
  extractWalletAddress,
  validateObjectId('id'),
  validateRequiredFields(['walletAddress', 'name']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const teamId = req.params.id;
    const { walletAddress, name } = req.body;

    const team = await Team.findOne({
      _id: teamId,
      ownerWalletAddress: userWalletAddress
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found or you are not the owner'
      });
    }

    if (!validateWalletAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    const formattedAddress = formatWalletAddress(walletAddress);

    // Check if member already exists
    const existingMember = team.members.find(
      member => member.walletAddress === formattedAddress
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'Member already exists in the team'
      });
    }

    const newMember = {
      walletAddress: formattedAddress,
      name: name.trim(),
      joinedAt: new Date()
    };

    team.members.push(newMember);
    await team.save();

    const response: ApiResponse = {
      success: true,
      data: newMember,
      message: 'Member added successfully'
    };

    res.status(201).json(response);
  })
);

// DELETE /api/teams/:id/members/:memberId
// Description: Remove a member from the team
router.delete('/:id/members/:memberId',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const teamId = req.params.id;
    const memberWalletAddress = req.params.memberId;

    const team = await Team.findOne({
      _id: teamId,
      ownerWalletAddress: userWalletAddress
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found or you are not the owner'
      });
    }

    const memberIndex = team.members.findIndex(
      member => member.walletAddress.toLowerCase() === memberWalletAddress.toLowerCase()
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in the team'
      });
    }

    // Cannot remove the owner
    if (team.members[memberIndex].walletAddress === userWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove team owner'
      });
    }

    team.members.splice(memberIndex, 1);
    await team.save();

    const response: ApiResponse = {
      success: true,
      message: 'Member removed successfully'
    };

    res.status(200).json(response);
  })
);

// POST /api/teams/:id/transactions
// Description: Create a team transaction requiring approval
router.post('/:id/transactions',
  extractWalletAddress,
  validateObjectId('id'),
  validateRequiredFields(['amount', 'token', 'recipients']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const teamId = req.params.id;
    const { amount, token, recipients, requiresApproval } = req.body;

    const team = await Team.findOne({
      _id: teamId,
      $or: [
        { ownerWalletAddress: userWalletAddress },
        { 'members.walletAddress': userWalletAddress }
      ]
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found or you are not a member'
      });
    }

    // Validate recipients
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients must be a non-empty array'
      });
    }

    for (const recipient of recipients) {
      if (!validateWalletAddress(recipient)) {
        return res.status(400).json({
          success: false,
          error: `Invalid recipient address: ${recipient}`
        });
      }
    }

    const teamTransaction = new TeamTransaction({
      teamId: teamId,
      walletAddress: userWalletAddress,
      amount: amount.toString(),
      token: token.toUpperCase(),
      recipients: recipients.map((r: string) => formatWalletAddress(r)),
      requiresApproval: requiresApproval !== false,
      approvals: [],
      status: 'pending'
    });

    await teamTransaction.save();

    const response: ApiResponse = {
      success: true,
      data: teamTransaction,
      message: 'Team transaction created successfully'
    };

    res.status(201).json(response);
  })
);

// GET /api/teams/:id/approvals
// Description: Get pending approvals for team transactions
router.get('/:id/approvals',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const teamId = req.params.id;

    const team = await Team.findOne({
      _id: teamId,
      $or: [
        { ownerWalletAddress: userWalletAddress },
        { 'members.walletAddress': userWalletAddress }
      ]
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found or you are not a member'
      });
    }

    const approvals = await TeamTransaction.find({
      teamId: teamId,
      status: 'pending',
      requiresApproval: true
    }).sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      data: approvals
    };

    res.status(200).json(response);
  })
);

// POST /api/teams/:id/approvals/:approvalId
// Description: Approve or reject a team transaction
router.post('/:id/approvals/:approvalId',
  extractWalletAddress,
  validateObjectId('id'),
  validateObjectId('approvalId'),
  validateRequiredFields(['action', 'signature']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const teamId = req.params.id;
    const approvalId = req.params.approvalId;
    const { action, signature } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "approve" or "reject"'
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      $or: [
        { ownerWalletAddress: userWalletAddress },
        { 'members.walletAddress': userWalletAddress }
      ]
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found or you are not a member'
      });
    }

    const teamTransaction = await TeamTransaction.findOne({
      _id: approvalId,
      teamId: teamId,
      status: 'pending'
    });

    if (!teamTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or not pending approval'
      });
    }

    // Check if user already approved/rejected
    const existingApproval = teamTransaction.approvals.find(
      approval => approval.walletAddress === userWalletAddress
    );

    if (existingApproval) {
      return res.status(400).json({
        success: false,
        error: 'You have already provided approval for this transaction'
      });
    }

    // Add approval
    teamTransaction.approvals.push({
      walletAddress: userWalletAddress,
      action: action,
      signature: signature,
      timestamp: new Date()
    });

    // Check if transaction should be approved (simple majority)
    const approvals = teamTransaction.approvals.filter(a => a.action === 'approve');
    const rejections = teamTransaction.approvals.filter(a => a.action === 'reject');
    
    if (approvals.length > rejections.length) {
      teamTransaction.status = 'approved';
    } else if (rejections.length > approvals.length) {
      teamTransaction.status = 'rejected';
    }

    await teamTransaction.save();

    const response: ApiResponse = {
      success: true,
      message: `Transaction ${action}d successfully`
    };

    res.status(200).json(response);
  })
);

export default router;
