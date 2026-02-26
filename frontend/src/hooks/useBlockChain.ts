import { useState } from "react";
import { ethers } from "ethers";
import { ERC20_ABI, TOKEN_ADDRESSES } from "@/lib/blockchain/config";

export function useBlockchain() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeTransfer = async (
    to: string,
    amount: string,
    token: string,
    signer: ethers.Signer
  ) => {
    setLoading(true);
    setError(null);

    try {
      const tokenAddress = TOKEN_ADDRESSES[token as keyof typeof TOKEN_ADDRESSES];
      
      if (!tokenAddress) {
        throw new Error("Unsupported token");
      }

      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);

      const tx = await contract.transfer(to, amountWei);
      const receipt = await tx.wait();

      setLoading(false);
      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (err: unknown) {
      setLoading(false);
      let errorMessage = "Transaction failed";
      if (err && typeof err === "object" && "message" in err) {
        errorMessage = (err as { message: string }).message;
      }
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  return {
    executeTransfer,
    loading,
    error,
  };
}