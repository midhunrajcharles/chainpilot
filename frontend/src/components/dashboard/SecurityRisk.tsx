"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChainPilotApiClient } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { FaBan, FaCheckCircle, FaExclamationTriangle, FaEye, FaShieldAlt, FaTimesCircle } from "react-icons/fa";

export default function SecurityRisk() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [activeTab, setActiveTab] = useState<'risk-assessment' | 'address-reputation' | 'scam-detection' | 'transaction-validation'>('risk-assessment');
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Risk Assessment State
  const [riskForm, setRiskForm] = useState({
    address: '',
    amount: '',
    token: 'ETH'
  });
  const [riskResult, setRiskResult] = useState<any>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  // Address Reputation State
  const [reputationAddress, setReputationAddress] = useState('');
  const [reputationResult, setReputationResult] = useState<any>(null);
  const [reputationLoading, setReputationLoading] = useState(false);

  // Scam Detection State
  const [scamForm, setScamForm] = useState({
    address: '',
    message: ''
  });
  const [scamResult, setScamResult] = useState<any>(null);
  const [scamLoading, setScamLoading] = useState(false);

  // Transaction Validation State
  const [validationForm, setValidationForm] = useState({
    from: '',
    to: '',
    amount: '',
    token: 'ETH',
    gasEstimate: ''
  });
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  const walletAddress = user?.wallet?.address || wallets?.[0]?.address || '';

  const handleRiskAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!walletAddress) {
      setActionError('Connect a wallet before running risk assessment.');
      return;
    }

    setRiskLoading(true);
    try {
      const result = await ChainPilotApiClient.security.assessRisk(walletAddress, riskForm);
      if (result.success && result.data) {
        setRiskResult(result.data);
      } else {
        setRiskResult(null);
        setActionError(result.error || 'Risk assessment failed.');
        console.error('Risk assessment failed:', result.error);
      }
    } catch (error) {
      setRiskResult(null);
      setActionError(error instanceof Error ? error.message : 'Error assessing risk.');
      console.error('Error assessing risk:', error);
    } finally {
      setRiskLoading(false);
    }
  };

  const handleAddressReputation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!walletAddress) {
      setActionError('Connect a wallet before checking reputation.');
      return;
    }

    if (!reputationAddress) {
      setActionError('Enter an address to check reputation.');
      return;
    }

    setReputationLoading(true);
    try {
      const result = await ChainPilotApiClient.security.getAddressReputation(walletAddress, reputationAddress);
      if (result.success && result.data) {
        setReputationResult(result.data);
      } else {
        setReputationResult(null);
        setActionError(result.error || 'Address reputation check failed.');
        console.error('Address reputation failed:', result.error);
      }
    } catch (error) {
      setReputationResult(null);
      setActionError(error instanceof Error ? error.message : 'Error fetching address reputation.');
      console.error('Error fetching address reputation:', error);
    } finally {
      setReputationLoading(false);
    }
  };

  const handleScamDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!walletAddress) {
      setActionError('Connect a wallet before scam detection.');
      return;
    }

    setScamLoading(true);
    try {
      const result = await ChainPilotApiClient.security.detectScam(walletAddress, scamForm);
      if (result.success && result.data) {
        setScamResult(result.data);
      } else {
        setScamResult(null);
        setActionError(result.error || 'Scam detection failed.');
        console.error('Scam detection failed:', result.error);
      }
    } catch (error) {
      setScamResult(null);
      setActionError(error instanceof Error ? error.message : 'Error detecting scam.');
      console.error('Error detecting scam:', error);
    } finally {
      setScamLoading(false);
    }
  };

  const handleTransactionValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!walletAddress) {
      setActionError('Connect a wallet before transaction validation.');
      return;
    }

    setValidationLoading(true);
    try {
      const result = await ChainPilotApiClient.security.validateTransaction(walletAddress, {
        ...validationForm,
        from: walletAddress
      });
      if (result.success && result.data) {
        setValidationResult(result.data);
      } else {
        setValidationResult(null);
        setActionError(result.error || 'Transaction validation failed.');
        console.error('Transaction validation failed:', result.error);
      }
    } catch (error) {
      setValidationResult(null);
      setActionError(error instanceof Error ? error.message : 'Error validating transaction.');
      console.error('Error validating transaction:', error);
    } finally {
      setValidationLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'Low Risk';
    if (score >= 40) return 'Medium Risk';
    return 'High Risk';
  };

  const tabs = [
    { id: 'risk-assessment', label: 'Risk Assessment', icon: FaShieldAlt },
    { id: 'address-reputation', label: 'Address Reputation', icon: FaEye },
    { id: 'scam-detection', label: 'Scam Detection', icon: FaBan },
    { id: 'transaction-validation', label: 'Transaction Validation', icon: FaCheckCircle }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Security & Risk Management</h2>
          <p className="text-slate-400 mt-1">Protect your transactions with advanced security features</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-800/30 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="text-sm" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm">
          {actionError}
        </div>
      )}

      {/* Risk Assessment Tab */}
      {activeTab === 'risk-assessment' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaShieldAlt className="text-blue-400" />
              Risk Assessment
            </h3>
            
            <form onSubmit={handleRiskAssessment} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={riskForm.address}
                  onChange={(e) => setRiskForm({ ...riskForm, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Amount</label>
                  <input
                    type="number"
                    value={riskForm.amount}
                    onChange={(e) => setRiskForm({ ...riskForm, amount: e.target.value })}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Token</label>
                  <Select value={riskForm.token} onValueChange={(value) => setRiskForm({ ...riskForm, token: value })}>
                    <SelectTrigger className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white focus:border-blue-400 transition-colors">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10">
                      <SelectItem value="ETH">ETH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={riskLoading}
                className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 rounded-xl text-blue-400 hover:text-blue-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {riskLoading ? 'Assessing...' : 'Assess Risk'}
              </button>
            </form>
          </div>

          {/* Risk Results */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Risk Assessment Results</h3>
            
            {riskResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Risk Score</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getRiskColor(riskResult.riskScore)}`}>
                      {riskResult.riskScore}
                    </span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getRiskColor(riskResult.riskScore)} bg-slate-800/30`}>
                      {getRiskLabel(riskResult.riskScore)}
                    </span>
                  </div>
                </div>

                {riskResult.warnings.length > 0 && (
                  <div>
                    <h4 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                      <FaExclamationTriangle />
                      Warnings
                    </h4>
                    <ul className="space-y-1">
                      {riskResult.warnings.map((warning: string, index: number) => (
                        <li key={index} className="text-red-300 text-sm">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {riskResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                      <FaCheckCircle />
                      Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {riskResult.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-blue-300 text-sm">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Address Reputation</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Transactions:</span>
                      <span className="text-white ml-2">{riskResult.addressReputation.transactionCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Volume:</span>
                      <span className="text-white ml-2">{riskResult.addressReputation.totalVolume.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Last Seen:</span>
                      <span className="text-white ml-2">{new Date(riskResult.addressReputation.lastSeen).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Tags:</span>
                      <span className="text-white ml-2">{riskResult.addressReputation.tags.join(', ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaShieldAlt className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Enter transaction details to assess risk</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address Reputation Tab */}
      {activeTab === 'address-reputation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaEye className="text-green-400" />
              Address Reputation Check
            </h3>
            
            <form onSubmit={handleAddressReputation} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={reputationAddress}
                  onChange={(e) => setReputationAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-green-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={reputationLoading}
                className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 hover:border-green-400/50 rounded-xl text-green-400 hover:text-green-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reputationLoading ? 'Checking...' : 'Check Reputation'}
              </button>
            </form>
          </div>

          {/* Reputation Results */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Reputation Analysis</h3>
            
            {reputationResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Risk Score</span>
                  <span className={`text-2xl font-bold ${getRiskColor(reputationResult.riskScore)}`}>
                    {reputationResult.riskScore}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <div className="text-slate-400 text-sm">Transaction Count</div>
                    <div className="text-white text-lg font-semibold">{reputationResult.transactionCount}</div>
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <div className="text-slate-400 text-sm">Total Volume</div>
                    <div className="text-white text-lg font-semibold">{reputationResult.totalVolume.toFixed(2)}</div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Last Activity</div>
                  <div className="text-white">{new Date(reputationResult.lastSeen).toLocaleString()}</div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Address Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {reputationResult.tags.map((tag: string, index: number) => (
                      <span key={index} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaEye className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Enter an address to check its reputation</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scam Detection Tab */}
      {activeTab === 'scam-detection' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaBan className="text-red-400" />
              Scam Detection
            </h3>
            
            <form onSubmit={handleScamDetection} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Suspicious Address</label>
                <input
                  type="text"
                  value={scamForm.address}
                  onChange={(e) => setScamForm({ ...scamForm, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-red-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-2">Message (Optional)</label>
                <textarea
                  value={scamForm.message}
                  onChange={(e) => setScamForm({ ...scamForm, message: e.target.value })}
                  placeholder="Enter any suspicious message..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-red-400 focus:outline-none transition-colors resize-none"
                />
              </div>
              
              <button
                type="submit"
                disabled={scamLoading}
                className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 rounded-xl text-red-400 hover:text-red-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scamLoading ? 'Analyzing...' : 'Detect Scam'}
              </button>
            </form>
          </div>

          {/* Scam Detection Results */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Detection Results</h3>
            
            {scamResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Scam Status</span>
                  <div className="flex items-center gap-2">
                    {scamResult.isScam ? (
                      <>
                        <FaTimesCircle className="text-red-400" />
                        <span className="text-red-400 font-semibold">SCAM DETECTED</span>
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="text-green-400" />
                        <span className="text-green-400 font-semibold">SAFE</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Confidence</span>
                  <span className={`text-lg font-semibold ${scamResult.isScam ? 'text-red-400' : 'text-green-400'}`}>
                    {scamResult.confidence}%
                  </span>
                </div>

                {scamResult.reasons.length > 0 && (
                  <div>
                    <h4 className="text-red-400 font-medium mb-2">Detection Reasons</h4>
                    <ul className="space-y-1">
                      {scamResult.reasons.map((reason: string, index: number) => (
                        <li key={index} className="text-red-300 text-sm">• {reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {scamResult.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-blue-400 font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1">
                      {scamResult.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="text-blue-300 text-sm">• {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaBan className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Enter an address to check for scams</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Validation Tab */}
      {activeTab === 'transaction-validation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaCheckCircle className="text-blue-400" />
              Transaction Validation
            </h3>
            
            <form onSubmit={handleTransactionValidation} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={validationForm.to}
                  onChange={(e) => setValidationForm({ ...validationForm, to: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Amount</label>
                  <input
                    type="number"
                    value={validationForm.amount}
                    onChange={(e) => setValidationForm({ ...validationForm, amount: e.target.value })}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Token</label>
                  <Select value={validationForm.token} onValueChange={(value) => setValidationForm({ ...validationForm, token: value })}>
                    <SelectTrigger className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white focus:border-blue-400 transition-colors">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/10">
                      <SelectItem value="ETH">ETH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-2">Gas Estimate (Optional)</label>
                <input
                  type="text"
                  value={validationForm.gasEstimate}
                  onChange={(e) => setValidationForm({ ...validationForm, gasEstimate: e.target.value })}
                  placeholder="21000"
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none transition-colors"
                />
              </div>
              
              <button
                type="submit"
                disabled={validationLoading}
                className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 rounded-xl text-blue-400 hover:text-blue-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validationLoading ? 'Validating...' : 'Validate Transaction'}
              </button>
            </form>
          </div>

          {/* Validation Results */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Validation Results</h3>
            
            {validationResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Transaction Status</span>
                  <div className="flex items-center gap-2">
                    {validationResult.isValid ? (
                      <>
                        <FaCheckCircle className="text-green-400" />
                        <span className="text-green-400 font-semibold">VALID</span>
                      </>
                    ) : (
                      <>
                        <FaTimesCircle className="text-red-400" />
                        <span className="text-red-400 font-semibold">INVALID</span>
                      </>
                    )}
                  </div>
                </div>

                {validationResult.warnings.length > 0 && (
                  <div>
                    <h4 className="text-yellow-400 font-medium mb-2">Warnings</h4>
                    <ul className="space-y-1">
                      {validationResult.warnings.map((warning: string, index: number) => (
                        <li key={index} className="text-yellow-300 text-sm">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <div className="text-slate-400 text-sm">Gas Estimate</div>
                    <div className="text-white text-lg font-semibold">{validationResult.gasEstimate}</div>
                  </div>
                  <div className="bg-slate-800/30 rounded-lg p-3">
                    <div className="text-slate-400 text-sm">Total Cost</div>
                    <div className="text-white text-lg font-semibold">{validationResult.totalCost}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaCheckCircle className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Enter transaction details to validate</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}