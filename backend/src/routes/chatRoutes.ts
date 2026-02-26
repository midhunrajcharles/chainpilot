// backend/routes/chat.ts
import { Router } from "express";
import {
  extractWalletAddress,
  validateRequiredFields,
} from "../middleware/authMiddleware";
import { asyncHandler } from "../middleware/errorMiddleware";
import { ChatActivity } from "../models/ChatActivity";
import { Contact } from "../models/Contact";
import { Notification } from "../models/Notification";
import { Team } from "../models/Team";
import { Transaction } from "../models/Transaction";
import { ApiResponse } from "../types";
import { formatWalletAddress, validateWalletAddress } from "../utils/helpers";

const router = Router();

/* --------------------------------------------------------------
   RECORD TRANSACTION
   -------------------------------------------------------------- */
router.post(
  "/record-transaction",
  extractWalletAddress,
  validateRequiredFields(["from", "to", "amount", "token", "txHash"]),
  asyncHandler(async (req: any, res: any) => {
    const user = req.walletAddress;
    const { from, to, amount, token, txHash, gasUsed, status = "pending" } = req.body;

    if (!validateWalletAddress(from) || !validateWalletAddress(to))
      return res.status(400).json({ success: false, error: "Invalid address" });

    const exists = await Transaction.findOne({ txHash });
    if (exists)
      return res.status(400).json({ success: false, error: "Tx already recorded" });

    const tx = new Transaction({
      walletAddress: user,
      from: formatWalletAddress(from),
      to: formatWalletAddress(to),
      amount: amount.toString(),
      token: token.toUpperCase(),
      txHash: txHash.toLowerCase(),
      status,
      gasUsed: gasUsed || "0",
    });
    await tx.save();

    // notification
    await new Notification({
      walletAddress: user,
      type: "transaction",
      title: "Transaction Sent",
      message: `Sent ${amount} ${token} → ${to.slice(0, 6)}…`,
      data: { txHash, amount, token, to },
    }).save();

    // activity log (optional)
    try {
      await new ChatActivity({
        walletAddress: user,
        sessionId: req.body.sessionId || "unknown",
        action: "transaction_confirmed",
        intent: { type: "transfer", amount, token, recipient: to },
        result: { success: true, data: { txHash, status } },
      }).save();
    } catch {}

    res.status(201).json({ success: true, data: tx, message: "Recorded" });
  })
);

/* --------------------------------------------------------------
   CREATE CONTACT (auto-save)
   -------------------------------------------------------------- */
router.post(
  "/create-contact",
  extractWalletAddress,
  validateRequiredFields(["name", "address"]),
  asyncHandler(async (req: any, res: any) => {
    const user = req.walletAddress;
    const { name, address, group = "default" } = req.body;

    if (!validateWalletAddress(address))
      return res.status(400).json({ success: false, error: "Invalid address" });

    const exists = await Contact.findOne({
      walletAddress: user,
      address: formatWalletAddress(address),
    });
    if (exists)
      return res.status(400).json({ success: false, error: "Contact exists" });

    const contact = new Contact({
      walletAddress: user,
      name: name.trim(),
      address: formatWalletAddress(address),
      group,
      verified: true,
      reputation: {},
    });
    await contact.save();

    await new Notification({
      walletAddress: user,
      type: "contact",
      title: "Contact Added",
      message: `Added ${name}`,
      data: { contactId: contact._id, name, address },
    }).save();

    // optional activity log
    try {
      await new ChatActivity({
        walletAddress: user,
        sessionId: req.body.sessionId || "unknown",
        action: "contact_created",
        intent: { type: "add_contact", name, address, group },
        result: { success: true, data: { contactId: contact._id } },
      }).save();
    } catch {}

    res.status(201).json({ success: true, data: contact, message: "Contact saved" });
  })
);

/* --------------------------------------------------------------
   CREATE TEAM (auto-create)
   -------------------------------------------------------------- */
router.post(
  "/create-team",
  extractWalletAddress,
  validateRequiredFields(["name"]),
  asyncHandler(async (req: any, res: any) => {
    const user = req.walletAddress;
    const { name, description = "", members = [] } = req.body;

    // ---- validate members (if any) ----
    if (!Array.isArray(members))
      return res.status(400).json({ success: false, error: "members must be array" });

    for (const m of members) {
      if (!m.walletAddress || !m.name)
        return res.status(400).json({ success: false, error: "member missing name/address" });
      if (!validateWalletAddress(m.walletAddress))
        return res.status(400).json({ success: false, error: `Bad address: ${m.walletAddress}` });
    }

    // ---- add owner if not present ----
    const all = [...members];
    const ownerPresent = all.some(
      (m: any) => m.walletAddress.toLowerCase() === user.toLowerCase()
    );
    if (!ownerPresent) {
      all.unshift({ walletAddress: user, name: "Owner" });
    }

    const team = new Team({
      name: name.trim(),
      description: description.trim(),
      ownerWalletAddress: user,
      members: all.map((m: any) => ({
        walletAddress: formatWalletAddress(m.walletAddress),
        name: m.name.trim(),
      })),
    });
    await team.save();

    await new Notification({
      walletAddress: user,
      type: "team",
      title: "Team Created",
      message: `Team "${name}" – ${all.length} members`,
      data: { teamId: team._id, name, memberCount: all.length },
    }).save();

    // optional log
    try {
      await new ChatActivity({
        walletAddress: user,
        sessionId: req.body.sessionId || "unknown",
        action: "team_created",
        intent: { type: "create_team", teamName: name },
        result: { success: true, data: { teamId: team._id } },
      }).save();
    } catch {}

    res.status(201).json({ success: true, data: team, message: "Team created" });
  })
);

/* --------------------------------------------------------------
   GET USER'S CONTACTS (for autocomplete)
   -------------------------------------------------------------- */
router.get(
  "/contacts",
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const contacts = await Contact.find({ walletAddress: req.walletAddress })
      .sort({ name: 1 })
      .select("name address group");
    res.json({ success: true, data: contacts });
  })
);

/* --------------------------------------------------------------
   GET USER'S TEAMS
   -------------------------------------------------------------- */
router.get(
  "/teams",
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const teams = await Team.find({
      $or: [
        { ownerWalletAddress: req.walletAddress },
        { "members.walletAddress": req.walletAddress },
      ],
    })
      .sort({ createdAt: -1 })
      .sort({ name: 1 })
      .select("name description members");
    res.json({ success: true, data: teams });
  })
);

/* --------------------------------------------------------------
   LOG ACTIVITY (optional – never breaks the flow)
   -------------------------------------------------------------- */
router.post(
  "/log-activity",
  extractWalletAddress,
  validateRequiredFields(["action", "sessionId"]),
  asyncHandler(async (req: any, res: any) => {
    const { action, sessionId, message, intent, result } = req.body;
    await new ChatActivity({
      walletAddress: req.walletAddress,
      sessionId,
      action,
      message,
      intent,
      result,
    }).save();
    res.json({ success: true, message: "logged" });
  })
);

export default router;