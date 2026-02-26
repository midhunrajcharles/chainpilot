"use client";
import { ChainPilotApiClient, AnalyticsData } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaAddressBook,
  FaArrowDown,
  FaArrowUp,
  FaChartLine,
  FaChartPie,
  FaComments,
  FaExchangeAlt,
  FaShieldAlt,
  FaWallet,
} from "react-icons/fa";

export default function AnalyticsDashboard({setActiveSection}) {
  const { user } = usePrivy();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "7d" | "30d" | "90d" | "1y"
  >("30d");
  const isFetchingRef = useRef(false);

  const walletAddress = user?.wallet?.address || "";

  const fetchAnalytics = useCallback(async () => {
    if (isFetchingRef.current || !walletAddress) return;

    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const response = await ChainPilotApiClient.analytics.getAnalyticsDashboard(
        walletAddress,
        selectedPeriod
      );

      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        setError(response.error || "Failed to fetch analytics");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [walletAddress, selectedPeriod]);

  useEffect(() => {
    if (walletAddress) {
      fetchAnalytics();
    }
  }, [walletAddress, fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-pulse"
            >
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-colors duration-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <FaChartLine className="text-6xl text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          No Analytics Data
        </h3>
        <p className="text-slate-400">
          Start making transactions to see your analytics dashboard.
        </p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <FaArrowUp className="text-green-400" />
    ) : (
      <FaArrowDown className="text-red-400" />
    );
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? "text-green-400" : "text-red-400";
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
          Analytics Dashboard
        </h2>
        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "90d", "1y"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                selectedPeriod === period
                  ? "bg-white/10 border border-white/20 text-white"
                  : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <FaWallet className="text-blue-400 text-xl" />
            </div>
            <div className="flex items-center gap-1">
              {getChangeIcon(analytics.portfolioChange)}
              <span
                className={`text-sm font-medium ${getChangeColor(
                  analytics.portfolioChange
                )}`}
              >
                {Math.abs(analytics.portfolioChange).toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">
            Portfolio Value
          </h3>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(analytics.portfolioValue)}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <FaChartPie className="text-red-400 text-xl" />
            </div>
            <div className="flex items-center gap-1">
              <FaArrowDown className="text-red-400" />
              <span className="text-sm font-medium text-red-400">Outgoing</span>
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">
            Total Spent
          </h3>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(analytics.totalSpent)}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <FaChartPie className="text-green-400 text-xl" />
            </div>
            <div className="flex items-center gap-1">
              <FaArrowUp className="text-green-400" />
              <span className="text-sm font-medium text-green-400">
                Incoming
              </span>
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">
            Total Received
          </h3>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(analytics.totalReceived)}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <FaExchangeAlt className="text-purple-400 text-xl" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-slate-400">Count</span>
            </div>
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">
            Transactions
          </h3>
          <p className="text-2xl font-bold text-white">
            {formatNumber(analytics.transactionCount)}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Patterns Chart */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Spending Patterns
          </h3>
          <div className="space-y-3">
            {analytics.spendingByDay.slice(0, 7).map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">{day.date}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (day.amount /
                            Math.max(
                              ...analytics.spendingByDay.map((d) => d.amount)
                            )) *
                            100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {formatCurrency(day.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Recipients */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Top Recipients
          </h3>
          <div className="space-y-4">
            {analytics.topRecipients.slice(0, 5).map((recipient, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {recipient.address.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {recipient.address.slice(0, 6)}...
                      {recipient.address.slice(-4)}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {recipient.count} transactions
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">
                    {formatCurrency(recipient.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chat with Kyro */}
          <button 
                  onClick={() => setActiveSection("chat")} className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-300">
            <FaComments className="text-blue-400 text-xl" />
            <div className="text-left">
              <p className="text-white font-medium">Chat with Kyro</p>
              <p className="text-slate-400 text-sm">Start a new conversation</p>
            </div>
          </button>

          {/* Contact List */}
          <button 
          
          onClick={() => setActiveSection("contacts")}
          className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-300">
            <FaAddressBook className="text-green-400 text-xl" />
            <div className="text-left">
              <p className="text-white font-medium">Contact List</p>
              <p className="text-slate-400 text-sm">View or manage contacts</p>
            </div>
          </button>

          {/* Security */}
          <button 
                  onClick={() => setActiveSection("security")} className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-300">
            <FaShieldAlt className="text-purple-400 text-xl" />
            <div className="text-left">
              <p className="text-white font-medium">Security</p>
              <p className="text-slate-400 text-sm">Manage access & privacy</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
