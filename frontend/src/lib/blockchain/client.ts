import { ethers } from "ethers";
import { SOMNIA_CONFIG, ERC20_ABI, TOKEN_ADDRESSES } from "./config";

export class BlockchainClient {
  private provider: ethers.JsonRpcProvider;
  private backupRPCs = [
    "https://somnia.rpc.testnet", // fallback example
    "https://rpc.ankr.com/eth_sepolia" // optional secondary fallback
  ];

  constructor() {
    this.provider = new ethers.JsonRpcProvider(SOMNIA_CONFIG.rpcUrl, undefined, {
      polling: false,
      staticNetwork: true,
    });
  }

  async getProvider() {
    return this.provider;
  }

  async getTokenContract(tokenAddress: string) {
    return new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
  }

  async getBalance(address: string, tokenAddress?: string): Promise<string> {
    try {
      if (!tokenAddress || tokenAddress === TOKEN_ADDRESSES.ETH) {
        // Native balance (ETH)
        const balance = await this.provider.getBalance(address);
        return ethers.formatEther(balance);
      } else {
        // ERC20 balance
        const token = await this.getTokenContract(tokenAddress);
        const balance = await token.balanceOf(address);
        return ethers.formatEther(balance);
      }
    } catch (error) {
      console.error("❌ Error getting balance:", error);
      throw error;
    }
  }

  async estimateGas(
    from: string,
    to: string,
    amount: string,
    tokenAddress?: string
  ): Promise<string> {
    try {
      const numericAmount = amount.replace(/[^\d.]/g, ""); // strip symbols
      const amountWei = ethers.parseUnits(numericAmount || "0", 18);

      let gasEstimate: bigint;

      // ✅ Native transfer
      if (!tokenAddress || tokenAddress === TOKEN_ADDRESSES.ETH) {
        gasEstimate = await this.provider.estimateGas({
          from,
          to,
          value: amountWei
        });
      } 
      // ✅ ERC20 transfer
      else {
        const token = await this.getTokenContract(tokenAddress);
        const tx = await token.transfer.populateTransaction(to, amountWei);

        gasEstimate = await this.provider.estimateGas({
          from,
          to: tokenAddress,
          data: tx.data
        });
      }

      const feeData = await this.provider.getFeeData();
      const pricePerGas =
        feeData.gasPrice ?? feeData.maxFeePerGas ?? BigInt(0);

      const totalCostWei = gasEstimate * pricePerGas;
      return ethers.formatEther(totalCostWei);
    } catch (error: any) {
      console.warn("⚠️ Gas estimation failed:", error?.reason || error?.message);

      // graceful fallback if estimate fails
      return "0.001";
    }
  }

  async getTransactionStatus(txHash: string): Promise<{
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { status: "pending", confirmations: 0 };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        status: receipt.status === 1 ? "confirmed" : "failed",
        confirmations
      };
    } catch (error) {
      console.error("❌ Error getting transaction status:", error);
      return { status: "pending", confirmations: 0 };
    }
  }

  async resolveAddress(nameOrAddress: string): Promise<string | null> {
    try {
      if (ethers.isAddress(nameOrAddress)) return nameOrAddress;
      // No ENS or AI resolution available yet
      return null;
    } catch (error) {
      console.error("❌ Error resolving address:", error);
      return null;
    }
  }

  // 🔁 Optional: fallback provider if RPC fails
  async switchToBackupRPC(): Promise<void> {
    for (const url of this.backupRPCs) {
      try {
        const newProvider = new ethers.JsonRpcProvider(url);
        await newProvider.getBlockNumber(); // test connectivity
        this.provider = newProvider;
        console.log(`✅ Switched to backup RPC: ${url}`);
        return;
      } catch {
        continue;
      }
    }
    console.warn("⚠️ No backup RPC available.");
  }
}
