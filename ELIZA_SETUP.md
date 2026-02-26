# Eliza OS Integration Setup Guide

## ✅ Completed Implementation

### 1. **Core Infrastructure**
- ✅ Installed `@ai16z/eliza` and `@ai16z/plugin-evm` packages
- ✅ Created custom in-memory database adapter (replaced SQLite due to Windows compilation issues)
- ✅ Implemented ChainPilot AI character definition with personality, examples, and topics
- ✅ Built custom blockchain actions: `TRANSFER_TOKEN` and `CHECK_BALANCE`
- ✅ Created Eliza runtime manager with singleton pattern
- ✅ Added `/api/eliza-chat` endpoint mirroring `/api/chat` format

### 2. **Frontend Integration**
- ✅ Added Eliza mode toggle to ChatInterface component
- ✅ Implemented dual-mode routing (Gemini vs Eliza)
- ✅ Added UI toggle button in header with gradient styling
- ✅ Mode is persisted in localStorage for user preference

### 3. **Actions Implemented**
#### Transfer Token Action
- Validates transfer intent from natural language
- Extracts amount, recipient (address or contact name), and token
- Resolves contact names to wallet addresses via backend API
- Estimates gas fees and returns confirmation prompt
- Frontend wallet handles actual signing (security best practice)

#### Check Balance Action
- Queries Ethereum/token balances
- Uses ethers.js to connect to Sepolia RPC
- Returns formatted balance for user display

---

## 🔧 Configuration Required

### 1. **Environment Variables**
Add to `backend/.env`:

```env
# Eliza Configuration
ELIZA_ENABLED=true
ELIZA_MODEL_PROVIDER=anthropic
ELIZA_LOG_LEVEL=info
ELIZA_API_TOKEN=chainpilot-token

# AI Provider API Keys (required for Eliza to work)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# OR
OPENAI_API_KEY=your_openai_api_key_here

# Blockchain Configuration (already set)
CHAIN_ID=11155111
SOMNIA_RPC_URL=https://rpc.sepolia.org
```

### 2. **Get API Keys**
- **Anthropic (Claude)**: https://console.anthropic.com/
  - Sign up → Get API key → Add to `.env`
  - Recommended model: Claude 3.5 Sonnet
  
- **OpenAI (Alternative)**: https://platform.openai.com/
  - Sign up → Get API key → Add to `.env`
  - Recommended model: GPT-4

### 3. **Restart Backend Server**
After adding API keys:
```bash
cd backend
npm run dev
```

---

## 🚀 How to Use

### **Frontend UI Toggle**
1. Open ChainPilot AI dashboard
2. Navigate to "AI Chat Assistant"
3. Click the **"💬 Gemini"** button in the header to switch to **"🤖 Eliza"** mode
4. Toggle persists in localStorage - your preference is saved

### **Testing Eliza Actions**

#### Test Transfer Intent:
```
User: "Send 0.5 ETH to Alice"
Eliza: Validates → resolves contact → estimates gas → returns confirmation
```

#### Test Balance Check:
```
User: "What's my ETH balance?"
Eliza: Queries blockchain → returns formatted balance
```

#### Test Complex Queries:
```
User: "Transfer 100 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
User: "How much ETH do I have?"
```

---

## 🏗️ Architecture

### **Dual-Mode System**
```
User Input → ChatInterface
              ↓
       [useElizaMode state]
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
/api/chat         /api/eliza-chat
(Gemini)          (Eliza OS)
    ↓                   ↓
Response ← ───────────── Actions
```

### **Action Flow**
```
User Message → Eliza Runtime → Action Validation
                                     ↓
                              Extract Parameters
                                     ↓
                              Handler Logic
                                     ↓
                              Return Intent
                                     ↓
Frontend → Display → Wallet Signs → Blockchain
```

---

## 📁 File Structure

```
backend/src/eliza/
├── character.ts              # ChainPilot AI personality definition
├── runtime.ts                # Singleton runtime manager + in-memory DB adapter
└── actions/
    ├── index.ts              # Actions barrel export
    ├── transfer-token.action.ts
    └── check-balance.action.ts

frontend/src/
├── app/api/eliza-chat/route.ts  # Eliza API endpoint
└── components/dashboard/
    └── ChatInterface.tsx     # UI with Eliza toggle
```

---

## 🔮 Future Enhancements

### **Additional Actions** (Not Yet Implemented)
- `ADD_CONTACT` - Save wallet addresses with names
- `CREATE_TEAM` - Multi-sig team creation
- `ANALYZE_CONTRACT` - Smart contract security analysis
- `SCHEDULE_TRANSACTION` - Time-based transaction execution
- `CHECK_GAS` - Current gas price estimation

### **Custom Evaluators**
- `web3-intent` evaluator for enhanced intent detection
- Confidence scoring for action selection

### **Custom Providers**
- `walletProvider` - Inject user wallet balance/transactions
- `contactProvider` - Inject saved contacts for context
- `contractProvider` - Inject contract analysis results

### **Database Upgrade**
- Replace in-memory adapter with MongoDB adapter
- Persist conversation history and learn from interactions
- Implement long-term memory and context retention

---

## 🐛 Troubleshooting

### **"Cannot find module '@ai16z/eliza'" Error**
- TypeScript cache issue - restart TS server in VSCode: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
- Or rebuild: `npm run build`

### **Eliza Not Responding**
1. Check `ELIZA_ENABLED=true` in `.env`
2. Verify API key is set (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`)
3. Check backend logs for Eliza initialization errors
4. Ensure frontend is routing to `/api/eliza-chat` (check localStorage: `useElizaMode=true`)

### **Actions Not Working**
1. Verify Sepolia RPC URL is accessible: https://rpc.sepolia.org
2. Check wallet address is passed correctly to actions
3. Verify backend `/api/contacts` endpoint is available for contact resolution
4. Check action validation logic in browser console

### **Toggle Not Persisting**
- Clear localStorage and retry
- Check browser console for errors
- Verify `typeof window !== "undefined"` check is working (Next.js SSR)

---

## 📊 Comparison: Gemini vs Eliza

| Feature | Gemini (Original) | Eliza OS (New) |
|---------|-------------------|----------------|
| **Framework** | @google/generative-ai | @ai16z/eliza |
| **Architecture** | Regex intent parsing | Action-based agent |
| **Extensibility** | Manual regex updates | Plugin system + actions |
| **Memory** | Stateless | In-memory (upgradable to MongoDB) |
| **Context** | Message history only | Providers inject rich context |
| **Learning** | No | Yes (with database) |
| **Web3 Integration** | Custom implementation | Native EVM plugin |
| **Best For** | Simple intents | Complex agent behavior |

---

## 🎯 Next Steps

1. ✅ **Add API Keys** - Get Anthropic/OpenAI key and add to `.env`
2. ✅ **Test Basic Actions** - Try transfer and balance checks
3. 🔄 **Implement Additional Actions** - Add contact/team/contract actions
4. 🔄 **Build Custom Providers** - Inject wallet/contact/contract context
5. 🔄 **Upgrade Database** - Replace in-memory with MongoDB adapter
6. 🔄 **Add Evaluators** - Enhance intent detection with confidence scoring
7. 🔄 **Testing** - Unit tests for actions, integration tests for runtime

---

## 📝 Notes

- **Backward Compatibility**: Gemini mode still works - toggle anytime
- **Security**: Actions only generate intents; frontend wallet signs transactions
- **Feature Flag**: `ELIZA_ENABLED` defaults to `false` for gradual rollout
- **Database**: In-memory adapter used (no persistence) - upgrade to MongoDB for production
- **Token Costs**: Anthropic Claude API usage will incur costs based on tokens processed

---

**Implementation Status**: ✅ MVP Complete - Ready for Testing with API Keys
