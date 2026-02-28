import { Router } from 'express';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { extractWalletAddress, validateRequiredFields } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';
import { Transaction } from '../models/Transaction';
import { ApiResponse } from '../types';

// Build a shareable URL for a transaction (no Cloudinary dependency)
const buildShareUrl = (transactionId: string): string => {
  const base = process.env.FRONTEND_URL || 'http://localhost:3001';
  return `${base}/dashboard/transaction/${transactionId}`;
};

const router = Router();

// POST /api/sharing/generate-qr
// Description: Generate QR code for transaction sharing
router.post('/generate-qr',
  extractWalletAddress,
  validateRequiredFields(['transactionId']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { transactionId } = req.body;

    // Validate ID format
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(transactionId);
    const isTxHash   = /^0x[a-fA-F0-9]{64}$/i.test(transactionId);
    const isAddress  = /^0x[a-fA-F0-9]{40}$/i.test(transactionId);

    if (!isObjectId && !isTxHash && !isAddress) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format. Provide a MongoDB ObjectId (24 hex chars), a transaction hash (0x + 64 hex chars), or a wallet address (0x + 40 hex chars).'
      });
    }

    // Try to enrich with DB data — but DO NOT fail if not found
    let transaction: any = null;
    try {
      if (isObjectId) {
        transaction = await Transaction.findOne({ _id: transactionId, walletAddress: userWalletAddress });
      } else if (isTxHash) {
        transaction = await Transaction.findOne({ txHash: transactionId, walletAddress: userWalletAddress });
      } else if (isAddress) {
        transaction = await Transaction.findOne({
          $or: [{ from: transactionId.toLowerCase() }, { to: transactionId.toLowerCase() }],
          walletAddress: userWalletAddress
        }).sort({ createdAt: -1 });
      }
    } catch (_) { /* ignore DB errors — QR gen continues */ }

    // Build share URL
    const shareUrl = buildShareUrl(transaction ? String(transaction._id) : transactionId);

    // Build QR payload — use DB data when available, fall back to the raw ID
    const qrData: Record<string, any> = { transactionId };
    if (transaction) {
      qrData.from    = transaction.from;
      qrData.to      = transaction.to;
      qrData.amount  = transaction.amount;
      qrData.token   = transaction.token;
      qrData.txHash  = transaction.txHash;
      qrData.status  = transaction.status;
    }
    qrData.shareUrl = shareUrl;

    // Generate QR code as base64 PNG data URL (no Cloudinary needed)
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    const response: ApiResponse = {
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        shareUrl: shareUrl,
        foundInDb: !!transaction
      }
    };

    res.status(200).json(response);
  })
);

// POST /api/sharing/generate-receipt
// Description: Generate transaction receipt in PDF or image format
router.post('/generate-receipt',
  extractWalletAddress,
  validateRequiredFields(['transactionId', 'format']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { transactionId, format } = req.body;

    if (!['pdf', 'image'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Format must be either "pdf" or "image"'
      });
    }

    // Find the transaction - handle ObjectId, txHash (66-char), and wallet address
    let transaction;
    if (transactionId.match(/^[0-9a-fA-F]{24}$/)) {
      transaction = await Transaction.findOne({
        _id: transactionId,
        walletAddress: userWalletAddress
      });
    } else if (transactionId.match(/^0x[a-fA-F0-9]{64}$/)) {
      transaction = await Transaction.findOne({
        txHash: transactionId,
        walletAddress: userWalletAddress
      });
    } else if (transactionId.match(/^0x[a-fA-F0-9]{40}$/)) {
      transaction = await Transaction.findOne({
        $or: [
          { from: transactionId.toLowerCase() },
          { to: transactionId.toLowerCase() }
        ],
        walletAddress: userWalletAddress
      }).sort({ createdAt: -1 });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format. Provide a MongoDB ObjectId (24 hex chars), a transaction hash (0x + 64 hex chars), or a wallet address (0x + 40 hex chars).'
      });
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    if (format === 'pdf') {
      // Generate PDF receipt
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfData = Buffer.concat(buffers);
        const pdfBase64 = pdfData.toString('base64');
        
        // Upload PDF to Cloudinary
        const result = await uploadToCloudinary(pdfBase64, 'pdf');
        
        const response: ApiResponse = {
          success: true,
          data: {
            url: result,
            data: pdfBase64
          }
        };
        
        res.status(200).json(response);
      });

      // Add content to PDF
      doc.fontSize(20).text('Transaction Receipt', 50, 50);
      doc.fontSize(12).text(`Transaction ID: ${transactionId}`, 50, 100);
      doc.text(`From: ${transaction.from}`, 50, 120);
      doc.text(`To: ${transaction.to}`, 50, 140);
      doc.text(`Amount: ${transaction.amount} ${transaction.token}`, 50, 160);
      doc.text(`Transaction Hash: ${transaction.txHash}`, 50, 180);
      doc.text(`Status: ${transaction.status}`, 50, 200);
      doc.text(`Date: ${transaction.createdAt.toISOString()}`, 50, 220);
      doc.text(`Gas Used: ${transaction.gasUsed}`, 50, 240);
      
      doc.end();
    } else {
      // Generate image receipt (simplified)
      const receiptData = {
        transactionId,
        from: transaction.from,
        to: transaction.to,
        amount: transaction.amount,
        token: transaction.token,
        txHash: transaction.txHash,
        status: transaction.status,
        date: transaction.createdAt.toISOString()
      };

      // For image format, we'll create a simple text-based image
      const imageData = `Transaction Receipt\n${JSON.stringify(receiptData, null, 2)}`;
      const imageBase64 = Buffer.from(imageData).toString('base64');
      
      // Upload image to Cloudinary
      const result = await uploadToCloudinary(imageBase64, 'image');
      
      const response: ApiResponse = {
        success: true,
        data: {
          url: result,
          data: imageBase64
        }
      };
      
      res.status(200).json(response);
    }
  })
);

// POST /api/sharing/social-share
// Description: Create social media shareable content for transactions
router.post('/social-share',
  extractWalletAddress,
  validateRequiredFields(['transactionId', 'platform']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { transactionId, platform, message } = req.body;

    if (!['twitter', 'linkedin', 'facebook'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: 'Platform must be twitter, linkedin, or facebook'
      });
    }

    // Find the transaction - handle ObjectId, txHash, and wallet address
    let transaction;
    if (transactionId.match(/^[0-9a-fA-F]{24}$/)) {
      transaction = await Transaction.findOne({
        _id: transactionId,
        walletAddress: userWalletAddress
      });
    } else if (transactionId.match(/^0x[a-fA-F0-9]{64}$/)) {
      transaction = await Transaction.findOne({
        txHash: transactionId,
        walletAddress: userWalletAddress
      });
    } else if (transactionId.match(/^0x[a-fA-F0-9]{40}$/)) {
      transaction = await Transaction.findOne({
        $or: [
          { from: transactionId.toLowerCase() },
          { to: transactionId.toLowerCase() }
        ],
        walletAddress: userWalletAddress
      }).sort({ createdAt: -1 });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format. Provide a MongoDB ObjectId (24 hex chars), a transaction hash (0x + 64 hex chars), or a wallet address (0x + 40 hex chars).'
      });
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Build share URL
    const shareUrl = buildShareUrl(String(transaction._id));
    
    // Create platform-specific content
    let shareContent = '';
    const baseMessage = message || `Just completed a ${transaction.amount} ${transaction.token} transaction!`;
    
    switch (platform) {
      case 'twitter':
        shareContent = `${baseMessage} ${shareUrl} #crypto #blockchain #chainpilot`;
        break;
      case 'linkedin':
        shareContent = `${baseMessage}\n\nView transaction details: ${shareUrl}`;
        break;
      case 'facebook':
        shareContent = `${baseMessage}\n\nCheck out the transaction: ${shareUrl}`;
        break;
    }

    // Generate share URL (mock implementation)
    const shareUrlGenerated = `https://${platform}.com/intent/tweet?text=${encodeURIComponent(shareContent)}`;

    const response: ApiResponse = {
      success: true,
      data: {
        shareUrl: shareUrlGenerated,
        content: shareContent
      }
    };

    res.status(200).json(response);
  })
);

// POST /api/integration/send-email
// Description: Send email notifications or receipts
router.post('/send-email',
  extractWalletAddress,
  validateRequiredFields(['to', 'subject', 'template', 'data']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { to, subject, template, data } = req.body;

    if (!['receipt', 'notification', 'custom'].includes(template)) {
      return res.status(400).json({
        success: false,
        error: 'Template must be receipt, notification, or custom'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Generate email content based on template
    let htmlContent = '';
    let textContent = '';

    switch (template) {
      case 'receipt':
        htmlContent = generateReceiptEmail(data);
        textContent = generateReceiptEmailText(data);
        break;
      case 'notification':
        htmlContent = generateNotificationEmail(data);
        textContent = generateNotificationEmailText(data);
        break;
      case 'custom':
        htmlContent = data.html || data.text || '';
        textContent = data.text || data.html || '';
        break;
    }

    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      
      const response: ApiResponse = {
        success: true,
        data: {
          messageId: info.messageId
        }
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send email'
      });
    }
  })
);

// Helper functions
async function uploadToCloudinary(data: string, type: string): Promise<string> {
  // Mock implementation - in real app, upload to Cloudinary
      return `https://cloudinary.com/chainpilot/${type}/${Date.now()}`;
}

function generateReceiptEmail(data: any): string {
  return `
    <html>
      <body>
        <h2>Transaction Receipt</h2>
        <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
        <p><strong>From:</strong> ${data.from}</p>
        <p><strong>To:</strong> ${data.to}</p>
        <p><strong>Amount:</strong> ${data.amount} ${data.token}</p>
        <p><strong>Status:</strong> ${data.status}</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p>Thank you for using ChainPilot AI!</p>
      </body>
    </html>
  `;
}

function generateReceiptEmailText(data: any): string {
  return `
Transaction Receipt

Transaction ID: ${data.transactionId}
From: ${data.from}
To: ${data.to}
Amount: ${data.amount} ${data.token}
Status: ${data.status}
Date: ${data.date}

Thank you for using ChainPilot AI!
  `;
}

function generateNotificationEmail(data: any): string {
  return `
    <html>
      <body>
        <h2>Transaction Notification</h2>
        <p>${data.message}</p>
        <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
        <p><strong>Amount:</strong> ${data.amount} ${data.token}</p>
        <p><strong>Status:</strong> ${data.status}</p>
      </body>
    </html>
  `;
}

function generateNotificationEmailText(data: any): string {
  return `
Transaction Notification

${data.message}

Transaction ID: ${data.transactionId}
Amount: ${data.amount} ${data.token}
Status: ${data.status}
  `;
}

export default router;
