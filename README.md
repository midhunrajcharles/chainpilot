# ChainPilot AI - Autonomous Web3 Security Agent

**ChainPilot AI** is an enterprise-grade AI-powered Web3 security and automation platform built for the Somnia Testnet.

Combining natural-language transaction interfaces with **autonomous smart contract security analysis**, ChainPilot AI provides comprehensive vulnerability detection, risk scoring, AI-powered explanations, transaction simulation, and continuous contract monitoring — all powered by GPT-4o and advanced blockchain analysis.

###  **What Makes ChainPilot AI Different**
- **AI Security Analyst**: GPT-4o powered vulnerability explanations in plain English
- **Transaction Simulation**: Preview risks before executing any transaction
- **Autonomous Monitoring**: Set-and-forget contract surveillance with alert system
- **On-Chain Audit Trail**: Immutable blockchain-logged security reports
- **Bytecode Analysis**: Deep inspection without requiring source code
- **Production-Grade Architecture**: Enterprise service layer, comprehensive error handling

## Features

###  **NEW: Security & Risk Analysis**
1. **Smart Contract Security Scanner**
   - Bytecode pattern detection (reentrancy, selfdestruct, delegatecall, tx.origin)
   - Source code analysis (13+ vulnerability patterns)
   - ABI function signature analysis
   - Weighted risk scoring (0-100) with CRITICAL/HIGH/MEDIUM/LOW severity
   - Unverified contract detection

2. **AI-Powered Vulnerability Explanations**
   - GPT-4o generated plain-English security reports
   - Technical summaries for developers
   - Actionable recommendations
   - Verdict classification (SAFE/CAUTION/DANGER/CRITICAL)
   - No hallucinations - grounded in actual findings

3. **Transaction Simulation Engine**
   - Pre-execution risk preview
   - Gas estimation with 20% safety buffer
   - Wallet drain risk detection (alerts if >80% balance at risk)
   - Unlimited approval detection
   - Asset impact analysis

4. **Autonomous Contract Monitoring**
   - Cron-based health checks (every 5 minutes)
   - User-triggered immediate scans
   - Configurable alert thresholds
   - Alert history with AI explanations
   - Push notification support

5. **Blockchain Immutable Audit Logging**
   - SHA-256 hash of security reports stored on-chain
   - AuditLog.sol smart contract (Solidity 0.8.20)
   - Public verification via block explorer
   - Backend-signed submissions for authenticity
   - MongoDB backup for offline access

### Core Transaction Features
- **Chat-based UI** for token swaps with Gemini AI
- **Natural language and voice command support**
- **Wallet connection and authentication** via Privy
- **Transaction confirmation and feedback**
- **Responsive design** for desktop and mobile
- **Error handling** for offline/unsupported browsers
- **Local chat history** and sidebar navigation

### Analytics & Insights
- **Analytics Dashboard**: "Show transaction analytics"
- **Spending Patterns**: "You spent 200 ETH this month"
- **Portfolio Tracking**: "Your ETH holdings increased 15%"
- **Transaction History Search**: "Show all payments to Alice"
- **Transaction Predictions**: "You usually send 50 ETH to Alice on Fridays"

### Contact Management
- **Contact Management**: Save frequent recipients as "Alice", "Bob", etc.
- **Smart Contact Suggestions**: "Add this address as 'Alice' for future use"
- **Contact Groups**: "Send 10 ETH to all 'Family' contacts"
- **Contact Verification**: "Verify Alice's address before saving"

### Team & Workspace
- **Team Creation**: Create teams with multiple members
- **Group Transactions**: "Send 10 ETH to each person in my team"
- **Approval Workflows**: "Require 2 approvals for >100 ETH"

### Advanced Transactions
- **Conditional Payments**: "Pay Bob 50 ETH if ETH price > $2000"
- **Schedule or Time-Locked Transactions**: "Send 100 ETH to Alice in 24 hours"
- **Quick Actions**: "Send 50 ETH to Alice" (one-click)

### Security & Risk
- **Risk Assessment**: "This address has suspicious activity"
- **Address Reputation**: "This address has 100+ successful transactions"
- **Scam Detection**: "Warning: This looks like a phishing attempt"
- **Transaction Validation**: "Double-check this amount before sending"

### Sharing & Integration
- **Transaction Sharing**: Share transaction details via QR codes
- **Social Sharing**: "Share transaction on social media"
- **Transaction Proofs**: "Generate payment receipt"
- **Email Integration**: "Send receipt to email"

### User Experience
- **Multi-Language UI**: Support for 10+ languages in settings
- **Offline Mode**: Queue transactions when offline
- **PWA Features**: Install as native app
- **Smart Suggestions**
- **Contextual Help**: "Try saying 'Send 50 ETH to Alice'"
- **Auto-complete**: "Complete your sentence..."
- **Recent Transactions**: "Repeat last transaction?"

##  Tech Stack

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **Tailwind CSS** - Styling
- **Privy** - Wallet authentication
- **Somnia testnet** - Blockchain network
- **Radix UI, Sonner, Framer Motion** - UI components
- **Google Gemini AI** - Natural language processing
- **Ethers.js** - Blockchain interactions

### Backend
- **Node.js** - JavaScript runtime
- **TypeScript** - Type-safe JavaScript
- **Express.js** - Web application framework
- **Mongoose** - MongoDB object data modeling
- **MongoDB** - NoSQL database
- **Cloudinary** - Cloud-based image and video management
- **Nodemailer** - Email sending
- **PDFKit** - PDF generation
- **QRCode** - QR code generation

##  Installation

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Environment Variables
Create `.env.local` in the frontend directory:
```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

Create `.env` in the backend directory:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chainpilot
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_pass
CORS_ORIGIN=http://localhost:3000
```

##  How to Use

1. **Connect your wallet** using the button in the top right
2. **Type or speak a command** (e.g., "Send 50 ETH to Alice")
3. **Confirm the transaction details** and submit
4. **View transaction status** and history in the sidebar

### Example Commands
- "Send 50 ETH to Alice"
- "Transfer 100 tokens to 0x123..."
- "Pay Bob 25 ETH"
- "Show my balance"
- "Send 10 ETH to all 'Family' contacts"

## Project Structure

```
ChainPilot AI/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/       # React components
│   │   ├── lib/            # Utilities and configurations
│   │   └── hooks/          # Custom React hooks
│   └── package.json
├── backend/                  # Node.js backend API
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── models/         # Mongoose schemas
│   │   ├── middleware/     # Express middleware
│   │   └── config/         # Database and service configs
│   └── package.json
└── README.md
```



## API Endpoints

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/preferences` - Get user preferences

### Contact Management
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Add new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/verify` - Verify contact address
- `POST /api/contacts/groups` - Create contact group
- `GET /api/contacts/groups` - Get contact groups

### Team & Workspace
- `POST /api/teams` - Create team
- `GET /api/teams` - Get user teams
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/members` - Add team member
- `DELETE /api/teams/:id/members/:memberId` - Remove team member
- `POST /api/teams/:id/approvals` - Create approval workflow
- `POST /api/teams/:id/approvals/:id/approve` - Approve transaction

### Analytics & Insights
- `GET /api/analytics/dashboard` - Get analytics dashboard
- `GET /api/analytics/spending-patterns` - Get spending patterns
- `GET /api/analytics/portfolio` - Get portfolio tracking
- `GET /api/analytics/transactions` - Get transaction history
- `GET /api/analytics/predictions` - Get transaction predictions

### Advanced Transactions
- `POST /api/transactions/conditional` - Create conditional payment
- `POST /api/transactions/scheduled` - Create scheduled transaction
- `GET /api/transactions/scheduled` - Get scheduled transactions
- `PUT /api/transactions/scheduled/:id` - Update scheduled transaction
- `DELETE /api/transactions/scheduled/:id` - Cancel scheduled transaction
- `POST /api/transactions/team` - Create team transaction
- `POST /api/transactions/queue` - Queue offline transaction

### Security & Risk
- `POST /api/security/risk-assessment` - Assess transaction risk
- `GET /api/security/address-reputation/:address` - Get address reputation
- `POST /api/security/scam-detection` - Detect potential scams
- `POST /api/security/validate-transaction` - Validate transaction

### Sharing & Integration
- `POST /api/sharing/generate-qr` - Generate QR code for transaction
- `POST /api/sharing/generate-receipt` - Generate transaction receipt
- `POST /api/sharing/social-share` - Create social media share
- `POST /api/sharing/send-email` - Send email notification

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read` - Mark notification as read
- `POST /api/notifications/subscribe` - Subscribe to notification type
- `DELETE /api/notifications/unsubscribe` - Unsubscribe from notification
- `GET /api/notifications/subscriptions` - Get notification subscriptions

### Health & Monitoring
- `GET /api/health` - Health check endpoint
- `GET /api/health/metrics` - Performance metrics

##  Contributing

Contributions are welcome! Please open an issue or submit a pull request.

##  License

MIT License - see LICENSE file for details

##  Support

For questions, reach out via GitHub Issues or the hackathon Discord.

---

**ChainPilot AI** - Powering the future of AI-driven crypto transactions 🚀

Built for the **Somnia AI Hackathon 2025**
