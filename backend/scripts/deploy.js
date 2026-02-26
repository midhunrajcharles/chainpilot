/**
 * Deployment script for AuditLog contract
 * Deploy to Somnia Testnet
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting AuditLog deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Get trusted logger address (backend wallet)
  const trustedLogger = process.env.BACKEND_WALLET_ADDRESS || deployer.address;
  console.log("Trusted Logger Address:", trustedLogger);
  
  if (!trustedLogger || trustedLogger === "0x0000000000000000000000000000000000000000") {
    throw new Error("❌ BACKEND_WALLET_ADDRESS not set in .env file");
  }

  // Deploy AuditLog contract
  console.log("\n📝 Deploying AuditLog contract...");
  const AuditLog = await hre.ethers.getContractFactory("AuditLog");
  const auditLog = await AuditLog.deploy(trustedLogger);

  await auditLog.waitForDeployment();
  const contractAddress = await auditLog.getAddress();

  console.log("\n✅ AuditLog deployed successfully!");
  console.log("Contract Address:", contractAddress);
  console.log("Trusted Logger:", trustedLogger);
  console.log("\n📌 Add this to your backend .env file:");
  console.log(`AUDIT_LOG_CONTRACT_ADDRESS=${contractAddress}`);
  
  // Verify the deployment
  console.log("\n🔍 Verifying deployment...");
  const totalAudits = await auditLog.totalAudits();
  console.log("Total audits:", totalAudits.toString());
  
  const storedTrustedLogger = await auditLog.trustedLogger();
  console.log("Stored trusted logger:", storedTrustedLogger);

  if (storedTrustedLogger.toLowerCase() !== trustedLogger.toLowerCase()) {
    console.error("❌ Warning: Stored trusted logger doesn't match");
  } else {
    console.log("✅ Trusted logger verified");
  }

  console.log("\n🎉 Deployment completed successfully!");
  
  // Wait for block confirmations before verifying on explorer
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for 5 block confirmations...");
    await auditLog.deploymentTransaction().wait(5);
    
    console.log("\n📋 To verify the contract on block explorer, run:");
    console.log(`npx hardhat verify --network ${hre.network.name} ${contractAddress} ${trustedLogger}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
