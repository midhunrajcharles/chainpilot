"use client";

import { ChainPilotApiClient, Transaction } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaCalendar, FaClock, FaCopy, FaExternalLinkAlt, FaFilter, FaHistory, FaSearch, FaSort, FaTimes } from "react-icons/fa";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransactionItem extends Transaction {
  id: string;
}

interface FilterState {
  search: string;
  recipient: string;
  token: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function TransactionHistory() {
  const { user } = usePrivy();
  const address = user?.wallet?.address;
  
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "scheduled" | "conditional">("history");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    recipient: "",
    token: "all",
    startDate: "",
    endDate: "",
    status: "all"
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const isFetchingRef = useRef(false);

  const fetchTransactionHistory = useCallback(async () => {
    if (!address || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: 20
      };

      // Add filters
      if (filters.search) params.search = filters.search;
      if (filters.recipient) params.recipient = filters.recipient;
      if (filters.token && filters.token !== "all") params.token = filters.token;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await ChainPilotApiClient.transactions.getTransactionHistory(address, params);
      
      if (response.success && response.data) {
        const transactionData = Array.isArray(response.data) ? response.data : [];
        setTransactions(transactionData.map((item: any) => ({
          ...item,
          id: item._id || item.id
        })));
        
        // Update pagination info
        if (response.total) setTotalTransactions(response.total);
        if (response.totalPages) setTotalPages(response.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch transaction history:", err);
      setError("Failed to load transaction history");
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [address, currentPage, filters]);

  const fetchScheduledTransactions = useCallback(async () => {
    if (!address || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const response = await ChainPilotApiClient.transactions.getScheduledTransactions(address);
      
      if (response.success && response.data) {
        const transactionData = Array.isArray(response.data) ? response.data : [];
        setTransactions(transactionData.map((item: any) => ({
          ...item,
          id: item._id || item.id
        })));
      }
    } catch (err) {
      console.error("Failed to fetch scheduled transactions:", err);
      setError("Failed to load scheduled transactions");
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [address]);

  const fetchConditionalTransactions = useCallback(async () => {
    if (!address || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const response = await ChainPilotApiClient.transactions.getConditionalTransactions(address);
      
      if (response.success && response.data) {
        const transactionData = Array.isArray(response.data) ? response.data : [];
        setTransactions(transactionData.map((item: any) => ({
          ...item,
          id: item._id || item.id
        })));
      }
    } catch (err) {
      console.error("Failed to fetch conditional transactions:", err);
      setError("Failed to load conditional transactions");
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      switch (activeTab) {
        case "history":
          fetchTransactionHistory();
          break;
        case "scheduled":
          fetchScheduledTransactions();
          break;
        case "conditional":
          fetchConditionalTransactions();
          break;
      }
    }
  }, [address, activeTab, fetchTransactionHistory, fetchScheduledTransactions, fetchConditionalTransactions]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      recipient: "",
      token: "all",
      startDate: "",
      endDate: "",
      status: "all"
    });
    setCurrentPage(1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: string, token: string) => {
    const numAmount = parseFloat(amount);
    return `${numAmount.toLocaleString()} ${token}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400 bg-green-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'failed':
        return 'text-red-400 bg-red-500/20';
      case 'scheduled':
        return 'text-blue-400 bg-blue-500/20';
      case 'active':
        return 'text-purple-400 bg-purple-500/20';
      case 'cancelled':
        return 'text-gray-400 bg-gray-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sent':
        return '📤';
      case 'received':
        return '📥';
      case 'scheduled':
        return '⏰';
      case 'conditional':
        return '🔀';
      default:
        return '💸';
    }
  };

  const isSentTransaction = (transaction: TransactionItem) => {
    return transaction.from?.toLowerCase() === address?.toLowerCase();
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      case 'amount':
        aValue = parseFloat(a.amount);
        bValue = parseFloat(b.amount);
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Transaction History
            </h2>
            <p className="text-slate-400 mt-1 text-sm md:text-base">View and manage your transaction history</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Transaction History
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">View and manage your transaction history</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300"
          >
            <FaFilter className="text-sm" />
            Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
            activeTab === "history"
              ? "text-white border-b-2 border-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FaHistory className="inline mr-2" />
          History
        </button>
        <button
          onClick={() => setActiveTab("scheduled")}
          className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
            activeTab === "scheduled"
              ? "text-white border-b-2 border-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FaClock className="inline mr-2" />
          Scheduled
        </button>
        <button
          onClick={() => setActiveTab("conditional")}
          className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
            activeTab === "conditional"
              ? "text-white border-b-2 border-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FaCalendar className="inline mr-2" />
          Conditional
        </button>
      </div>

      {/* Filters */}
      {showFilters && activeTab === "history" && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-slate-400 hover:text-white transition-colors duration-300"
              title="Clear all filters"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Recipient</label>
              <input
                type="text"
                placeholder="Recipient address..."
                value={filters.recipient}
                onChange={(e) => handleFilterChange('recipient', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Token</label>
              <Select value={filters.token} onValueChange={(value) => handleFilterChange('token', value)}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-white/30">
                  <SelectValue placeholder="All Tokens" />
                </SelectTrigger>
                <SelectContent className="bg-slate-600 border-white/10">
                  <SelectItem value="all">All Tokens</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 transition-all duration-300"
                title="Select start date"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30 transition-all duration-300"
                title="Select end date"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-white/30">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">
            {totalTransactions} transactions found
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Sort by:</span>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as "date" | "amount" | "status")}>
            <SelectTrigger className="px-3 py-1 bg-white/5 border-white/10 text-white text-sm focus:border-white/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/10">
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1 text-slate-400 hover:text-white transition-colors duration-300"
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            <FaSort className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-12">
            <FaHistory className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No transactions found</h3>
            <p className="text-slate-400">
              {activeTab === "history" && "No transaction history available"}
              {activeTab === "scheduled" && "No scheduled transactions"}
              {activeTab === "conditional" && "No conditional transactions"}
            </p>
          </div>
        ) : (
          sortedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/30 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">
                    {getTransactionIcon(isSentTransaction(transaction) ? 'sent' : 'received')}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">
                        {isSentTransaction(transaction) ? 'Sent' : 'Received'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-slate-400 space-y-1">
                      <div>
                        <span className="font-medium">Amount:</span> {formatAmount(transaction.amount, transaction.token)}
                      </div>
                      <div>
                        <span className="font-medium">
                          {isSentTransaction(transaction) ? 'To:' : 'From:'}
                        </span> {transaction.to || transaction.from}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(transaction.createdAt)}
                      </div>
                      {transaction.txHash && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Hash:</span>
                          <button
                            onClick={() => copyToClipboard(transaction.txHash!)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-mono flex items-center gap-1"
                            title="Copy transaction hash"
                          >
                            {transaction.txHash.slice(0, 10)}...
                            <FaCopy className="w-3 h-3" />
                          </button>
                          <FaExternalLinkAlt className="w-3 h-3 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-semibold ${
                    isSentTransaction(transaction) ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {isSentTransaction(transaction) ? '-' : '+'}{formatAmount(transaction.amount, transaction.token)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {activeTab === "history" && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
