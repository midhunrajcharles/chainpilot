# ChainPilot AI - Deployment Guide

## 📋 Prerequisites

- **Node.js**: v18 or higher
- **MongoDB**: v6.0 or higher (local or Atlas)
- **Wallet**: MetaMask or compatible Web3 wallet
- **RPC Access**: Sepolia Testnet RPC URL (Chain ID: 11155111)
- **API Keys**:
  - OpenAI API key(s) for GPT-4o security analysis
  - Gemini API key(s) for chat interface
  - Privy App ID for wallet authentication
  - Cloudinary credentials (optional, for media)

---

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/chainpilot
# OR use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chainpilot?retryWrites=true&w=majority

# Blockchain
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
CHAIN_ID=50312
BACKEND_WALLET_PRIVATE_KEY=your_private_key_here

# OpenAI (GPT-4o for Security Analysis)
OPENAI_API_KEY=sk-...
# Optional: Add multiple keys for rate limit rotation
OPENAI_API_KEY_1=sk-...
OPENAI_API_KEY_2=sk-...
OPENAI_API_KEY_3=sk-...

# Cloudinary (Optional - for media uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Secret (for authentication)
JWT_SECRET=your_random_secret_key_here

# Smart Contract (Optional - deployed AuditLog contract)
AUDIT_LOG_CONTRACT_ADDRESS=0x...
```

### 3. Build Backend

```bash
npm run build
```

### 4. Run Backend

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Backend runs on: `http://localhost:5000`

---

## 🎨 Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Create `frontend/.env.local`:

```env
# Backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Blockchain
NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_CHAIN_ID=11155111

# Privy (Wallet Authentication)
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# Gemini AI (Chat Interface)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
# Optional: Multiple keys for rotation
NEXT_PUBLIC_GEMINI_API_KEY_1=your_gemini_key_1
NEXT_PUBLIC_GEMINI_API_KEY_2=your_gemini_key_2

# Token Addresses (Sepolia Testnet)
NEXT_PUBLIC_ETH_ADDRESS=0x0000000000000000000000000000000000000000
```

### 3. Build Frontend

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

Frontend runs on: `http://localhost:3000`

---

## 🚀 Smart Contract Deployment (Optional)

The AuditLog smart contract enables on-chain immutable audit trails.

### 1. Setup Hardhat

```bash
cd backend/contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

### 2. Configure Hardhat

Edit `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
};
```

### 3. Create Deployment Script

Create `scripts/deploy.js`:

```javascript
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const backendAddress = process.env.BACKEND_WALLET_ADDRESS;
  const AuditLog = await ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy(backendAddress);
  await auditLog.waitForDeployment();

  console.log("AuditLog deployed to:", await auditLog.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 4. Deploy

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the deployed contract address to `backend/.env` as `AUDIT_LOG_CONTRACT_ADDRESS`.

---

## 📊 Database Setup

### Local MongoDB

1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   mongod --dbpath /path/to/data
   ```
3. Use connection string: `mongodb://localhost:27017/chainpilot`

### MongoDB Atlas (Cloud)

1. Create free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Whitelist your IP address
3. Create database user
4. Get connection string and add to `MONGODB_URI`

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Manual Testing Checklist

- [ ] Connect wallet via Privy
- [ ] Send transaction (ETH)
- [ ] Add contact
- [ ] Create team
- [ ] Analyze smart contract (try: `0x274C3795dadfEbf562932992bF241ae087e0a98C`)
- [ ] Create contract monitor
- [ ] Check AI chat responses
- [ ] View analytics dashboard
- [ ] Test transaction history
- [ ] Verify notifications work

---

## 🐛 Troubleshooting

### Backend Issues

**MongoDB Connection Failed**
- Check `MONGODB_URI` in `.env`
- Ensure MongoDB is running
- For Atlas: verify IP whitelist and credentials

**OpenAI API Errors**
- Verify API key is valid and has credits
- Check rate limits (add multiple keys for rotation)
- Review logs in `backend/logs/`

**Port Already in Use**
- Change `PORT` in `.env`
- Or kill process: `lsof -ti:5000 | xargs kill -9` (Mac/Linux) or `Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess` (Windows)

### Frontend Issues

**Wallet Connection Failed**
- Verify `NEXT_PUBLIC_PRIVY_APP_ID` is correct
- Check MetaMask is installed
- Ensure correct network (Sepolia Testnet, Chain ID: 11155111)

**API Calls Failing**
- Verify `NEXT_PUBLIC_BACKEND_URL` points to running backend
- Check CORS settings in backend `.env`
- Open browser console for error details

**Gemini Chat Not Working**
- Verify `NEXT_PUBLIC_GEMINI_API_KEY` is set
- Check API key quotas at [aistudio.google.com](https://aistudio.google.com)

---

## 📦 Production Deployment

### Backend (Railway/Render/DigitalOcean)

1. Build: `npm run build`
2. Start command: `npm start`
3. Set all environment variables in dashboard
4. Enable persistent disk for SQLite (if not using MongoDB Atlas)

### Frontend (Vercel/Netlify)

1. Connect GitHub repository
2. Framework: Next.js
3. Build command: `npm run build`
4. Output directory: `.next`
5. Set all `NEXT_PUBLIC_*` environment variables

### Database

Use **MongoDB Atlas** for production (free tier available).

---

## 🔒 Security Checklist

- [ ] Change all default secrets (`JWT_SECRET`, private keys)
- [ ] Use strong MongoDB credentials
- [ ] Enable MongoDB authentication
- [ ] Store API keys in environment variables (never in code)
- [ ] Use HTTPS in production
- [ ] Enable rate limiting on backend routes
- [ ] Whitelist frontend domain in CORS
- [ ] Regular dependency updates: `npm audit fix`
- [ ] Keep private keys secure (never commit to Git)

---

## 📝 API Endpoints

### Security Analysis
- `POST /api/contracts/analyze` - Analyze smart contract
- `GET /api/contracts/:address/history` - Get analysis history
- `GET /api/contracts/stats` - Get analysis statistics

### Monitoring
- `POST /api/monitors` - Create monitor
- `GET /api/monitors` - List monitors
- `POST /api/monitors/:id/check` - Trigger immediate check
- `DELETE /api/monitors/:id` - Delete monitor

### Audit Logs
- `GET /api/audits/recent` - Recent audits
- `GET /api/audits/verify/:hash` - Verify audit on-chain
- `GET /api/audits/stats` - Audit statistics

### Transactions
- `POST /api/transactions/send` - Send transaction
- `GET /api/transactions/history` - Transaction history

### Contacts & Teams
- `POST /api/contacts` - Add contact
- `GET /api/contacts` - List contacts
- `POST /api/teams` - Create team
- `GET /api/teams` - List teams

---

## 🎯 Key Features

✅ **Smart Contract Analysis** - GPT-4o powered vulnerability detection  
✅ **Risk Scoring** - Weighted risk engine (0-100 scale)  
✅ **AI Explanations** - Natural language security insights  
✅ **Autonomous Monitoring** - Cron-based contract surveillance  
✅ **On-Chain Audit Logs** - Immutable security records  
✅ **Transaction Simulation** - Preview risks before execution  
✅ **AI Chat Interface** - Gemini-powered natural language commands  

---

## 📞 Support

For issues or questions:
- GitHub Issues: [repo-link]
- Documentation: See README.md
- Logs: Check `backend/logs/` for detailed error traces

---

**ChainPilot AI** - Autonomous Web3 Security Agent 🛡️
