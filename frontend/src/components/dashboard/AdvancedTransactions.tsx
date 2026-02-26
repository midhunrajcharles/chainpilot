"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChainPilotApiClient } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaClock, FaEdit, FaPause, FaPlay, FaPlus, FaTrash } from "react-icons/fa";
import { SOMNIA_CONFIG, TOKEN_ADDRESSES } from "@/lib/blockchain/config";
import { ethers } from "ethers";

interface ScheduledTransaction {
  id: string;
  amount: string;
  token: string;
  recipient: string;
  scheduledFor: string;
  recurring?: {
    frequency: string;
    endDate?: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdvancedTransactions() {
  const { user } = usePrivy();
  const [transactions, setTransactions] = useState<ScheduledTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ScheduledTransaction | null>(null);
  const isFetchingRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    token: "ETH",
    recipient: "",
    scheduledFor: "",
    recurring: {
      frequency: "",
      endDate: "",
    },
  });

  const walletAddress = user?.wallet?.address || "";

  const fetchTransactions = useCallback(async () => {
    if (isFetchingRef.current || !walletAddress) return;
    
    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const response = await ChainPilotApiClient.transactions.getScheduledTransactions(walletAddress);
      
      if (response.success && response.data) {
        setTransactions(response.data);
      } else {
        setError(response.error || "Failed to fetch transactions");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [walletAddress, fetchTransactions]);



// Helper to send a real blockchain transaction (same as ChatInterface)
const sendRealTransaction = async ({
  recipient,
  amount,
  token,
}: {
  recipient: string;
  amount: string;
  token: string;
}) => {
  if (!window.ethereum) throw new Error("Wallet not connected.");

  const provider = new ethers.BrowserProvider(window.ethereum as any);
  const network = await provider.getNetwork();

  // Ensure we're on the Somnia network
  if (Number(network.chainId) !== SOMNIA_CONFIG.chainId) {
    const hex = "0x" + SOMNIA_CONFIG.chainId.toString(16);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hex }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [SOMNIA_CONFIG],
        });
      } else throw err;
    }
  }

  const signer = await provider.getSigner();

  let to = recipient;
  if (!ethers.isAddress(to)) {
    const res = await fetch("/api/resolve-address", {
      method: "POST",
      body: JSON.stringify({ nameOrAddress: to }),
    });
    const data = await res.json();
    if (!data?.address || !ethers.isAddress(data.address))
      throw new Error("Invalid recipient");
    to = data.address;
  }

  // Native ETH (Sepolia ETH)
  if (token === "ETH") {
    const tx = await signer.sendTransaction({
      to,
      value: ethers.parseEther(amount),
    });
    return tx.hash;
  }

  // ERC20 transfer
  const tokenAddr = TOKEN_ADDRESSES[token as keyof typeof TOKEN_ADDRESSES];
  if (!tokenAddr) throw new Error("Token not supported");

  const abi = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
  ];
  const contract = new ethers.Contract(tokenAddr, abi, signer);
  const decimals = await contract.decimals();
  const tx = await contract.transfer(to, ethers.parseUnits(amount, decimals));
  return tx.hash;
};

// === Replace your old handleCreateTransaction with this ===
const handleCreateTransaction = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  try {
    if (!window.ethereum) {
      alert("Please connect your wallet.");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    // 🔹 Send payment to AI Agent wallet using same sendRealTransaction logic
    const AI_AGENT_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    console.log("🚀 Sending transaction to Agent wallet...");
    const txHash = await sendRealTransaction({
      recipient: AI_AGENT_WALLET,
      amount: formData.amount,
      token: formData.token,
    });

    alert("Transaction sent! Waiting for confirmation...");

    // Wait for confirmation
    const receipt = await provider.waitForTransaction(txHash);
    console.log("✅ Transaction confirmed:", receipt.transactionHash);

    // 🔹 Save scheduled transaction to backend
    const payload = {
      amount: formData.amount,
      token: formData.token,
      recipient: formData.recipient,
      scheduledFor: formData.scheduledFor,
      recurring:
        formData.recurring.frequency && formData.recurring.frequency !== "none"
          ? formData.recurring
          : undefined,
      paymentTxHash: txHash,
      paidToAgent: true,
    };

    const response = await ChainPilotApiClient.transactions.createScheduledTransaction(
      userAddress,
      payload
    );

    if (response.success) {
      alert("✅ Schedule created successfully! Payment sent to Agent wallet.");
      setShowCreateModal(false);
      setFormData({
        amount: "",
        token: "ETH",
        recipient: "",
        scheduledFor: "",
        recurring: { frequency: "", endDate: "" },
      });
      fetchTransactions();
    } else {
      setError(response.error || "Failed to create scheduled transaction.");
    }
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes("user rejected")) {
      setError("Transaction rejected by user.");
    } else {
      setError(err.message || "Error sending transaction.");
    }
  }
};



  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      const payload = {
        scheduledFor: formData.scheduledFor,
        recurring: formData.recurring.frequency ? formData.recurring : undefined,
      };

      const response = await ChainPilotApiClient.transactions.updateScheduledTransaction(walletAddress, editingTransaction.id, payload);
      
      if (response.success) {
        setEditingTransaction(null);
        setFormData({
          amount: "",
          token: "ETH",
          recipient: "",
          scheduledFor: "",
          recurring: { frequency: "", endDate: "" },
        });
        fetchTransactions();
      } else {
        setError(response.error || "Failed to update transaction");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Are you sure you want to cancel this transaction?")) return;

    try {
      const response = await ChainPilotApiClient.transactions.deleteScheduledTransaction(walletAddress, transactionId);
      
      if (response.success) {
        fetchTransactions();
      } else {
        setError(response.error || "Failed to cancel transaction");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const openEditModal = (transaction: ScheduledTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount,
      token: transaction.token,
      recipient: transaction.recipient,
      scheduledFor: transaction.scheduledFor,
      recurring: transaction.recurring || { frequency: "", endDate: "" },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "text-blue-400 bg-blue-500/20";
      case "pending":
        return "text-yellow-400 bg-yellow-500/20";
      case "completed":
        return "text-green-400 bg-green-500/20";
      case "cancelled":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-slate-400 bg-slate-500/20";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Advanced Transactions
          </h2>
          <p className="text-slate-400 mt-1">Schedule payments and create conditional transactions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300"
        >
          <FaPlus className="text-sm" />
          Schedule Transaction
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Transactions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <FaClock className="text-white text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">
                    {transaction.amount} {transaction.token}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    to {transaction.recipient.slice(0, 6)}...{transaction.recipient.slice(-4)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(transaction)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg transition-all duration-300"
                  title="Edit transaction"
                >
                  <FaEdit className="text-slate-400 hover:text-white text-sm" />
                </button>
                <button
                  onClick={() => handleDeleteTransaction(transaction._id)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-lg transition-all duration-300"
                  title="Delete transaction"
                >
                  <FaTrash className="text-red-400 hover:text-red-300 text-sm" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Scheduled For</span>
                <span className="text-white text-sm font-medium">
                  {formatDate(transaction.scheduledFor)}
                </span>
              </div>

              {transaction.recurring && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Recurring</span>
                  <span className="text-white text-sm font-medium">
                    {transaction.recurring.frequency}
                    {transaction.recurring.endDate && ` until ${formatDate(transaction.recurring.endDate)}`}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-lg text-white transition-all duration-300">
                  <FaPlay className="text-sm" />
                  Execute Now
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/20 hover:bg-slate-700/40 border border-slate-600/30 hover:border-slate-500/50 rounded-lg text-slate-300 hover:text-white transition-all duration-300">
                  <FaPause className="text-sm" />
                  Pause
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {transactions.length === 0 && (
        <div className="text-center py-12">
          <FaClock className="text-6xl text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Scheduled Transactions</h3>
          <p className="text-slate-400 mb-6">
            Schedule your first transaction to automate your payments and transfers.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300"
          >
            Schedule Your First Transaction
          </button>
        </div>
      )}

      {/* Create/Edit Transaction Modal */}
      {(showCreateModal || editingTransaction) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-6">
              {editingTransaction ? "Edit Transaction" : "Schedule New Transaction"}
            </h3>
            
            <form onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction} className="space-y-4">
              {!editingTransaction && (
                <>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Amount</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300"
                      placeholder="Enter amount"
                      title="Transaction amount"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Token</label>
                    <Select value={formData.token} onValueChange={(value) => setFormData({ ...formData, token: value })}>
                      <SelectTrigger className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white focus:border-white/30 transition-all duration-300">
                        <SelectValue placeholder="Select token" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10">
                        <SelectItem value="ETH">ETH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Recipient Address</label>
                    <input
                      type="text"
                      value={formData.recipient}
                      onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300"
                      placeholder="0x..."
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-400 text-sm mb-2">Schedule Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 transition-all duration-300"
                  title="Schedule date and time"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Recurring (Optional)</label>
                <div className="space-y-2">
                    <Select 
                      value={formData.recurring.frequency} 
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        recurring: { ...formData.recurring, frequency: value }
                      })}
                    >
                      <SelectTrigger className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white focus:border-white/30 transition-all duration-300">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-white/10">
                        <SelectItem value="none">No Recurring</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  
                  {formData.recurring.frequency && formData.recurring.frequency !== "none" && (
                    <input
                      type="date"
                      value={formData.recurring.endDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurring: { ...formData.recurring, endDate: e.target.value }
                      })}
                      className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30 transition-all duration-300"
                      placeholder="End date (optional)"
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300"
                >
                  {editingTransaction ? "Update Transaction" : "Schedule Transaction"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTransaction(null);
                    setFormData({
                      amount: "",
                      token: "ETH",
                      recipient: "",
                      scheduledFor: "",
                      recurring: { frequency: "", endDate: "" },
                    });
                  }}
                  className="px-4 py-3 bg-slate-800/20 hover:bg-slate-700/40 border border-slate-600/30 hover:border-slate-500/50 rounded-xl text-slate-300 hover:text-white transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
