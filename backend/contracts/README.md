# Smart Contracts

This directory contains the smart contracts for ChainPilot AI security infrastructure.

## AuditLog.sol

Immutable on-chain registry for AI-generated security audit report hashes.

### Features
- Stores SHA-256 hashes of risk assessment reports
- Immutable audit trail (cannot be modified or deleted)
- Access-controlled logging (only trusted backend wallet)
- Event emission for transparency
- Paginated hash retrieval

### Deployment

#### Prerequisites
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

#### Hardhat Configuration

Create `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    somnia: {
      url: process.env.SOMNIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      somnia: process.env.SOMNIA_EXPLORER_API_KEY || "placeholder",
    },
    customChains: [
      {
        network: "somnia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io",
        },
      },
    ],
  },
};
```

#### Deployment Script

Create `scripts/deploy-audit-log.js`:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deploying AuditLog contract...");

  // Get deployer wallet
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Set trusted logger address (backend wallet)
  const trustedLogger = process.env.BACKEND_WALLET_ADDRESS;
  if (!trustedLogger) {
    throw new Error("BACKEND_WALLET_ADDRESS not set in .env");
  }

  console.log("Trusted Logger:", trustedLogger);

  // Deploy contract
  const AuditLog = await hre.ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy(trustedLogger);

  await auditLog.waitForDeployment();

  const address = await auditLog.getAddress();
  console.log("✅ AuditLog deployed to:", address);

  // Wait for block confirmations before verification
  console.log("Waiting for 5 block confirmations...");
  await auditLog.deploymentTransaction().wait(5);

  // Verify contract on explorer
  try {
    console.log("Verifying contract on block explorer...");
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [trustedLogger],
    });
    console.log("✅ Contract verified!");
  } catch (error) {
    console.log("⚠️  Verification failed:", error.message);
  }

  console.log("\n📝 Update your .env file:");
  console.log(`AUDIT_LOG_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### Deploy to Somnia Testnet

```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY="your_deployer_private_key"
export BACKEND_WALLET_ADDRESS="your_backend_wallet_address"
export SOMNIA_RPC_URL="https://dream-rpc.somnia.network"

# Deploy
npx hardhat run scripts/deploy-audit-log.js --network somnia
```

#### Post-Deployment

1. **Update Backend Environment Variables**:
   ```bash
   AUDIT_LOG_CONTRACT_ADDRESS=<deployed_contract_address>
   BACKEND_WALLET_PRIVATE_KEY=<backend_wallet_private_key>
   ```

2. **Fund Backend Wallet**:
   - Send ETH to backend wallet for gas fees
   - Recommended: 0.1 ETH for testing

3. **Test Contract**:
   ```bash
   # Test logging an audit
   curl -X POST http://localhost:5000/api/contracts/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "contractAddress": "0x...",
       "userAddress": "0x..."
     }'
   ```

### Contract Addresses

**Somnia Testnet**:
- Not yet deployed (run deployment script above)

**Mainnet**:
- TBD

### Security Considerations

1. **Trusted Logger**: Only the backend wallet can log audits
2. **Immutability**: Audit entries cannot be modified or deleted
3. **Gas Optimization**: Contract uses efficient storage patterns
4. **Access Control**: Constructor-initialized trusted logger cannot be changed

### Future Enhancements

- Multi-signature trusted logger
- Audit entry metadata (IPFS hash for full report)
- Time-locked emergency pause mechanism
- Governance for logger rotation
