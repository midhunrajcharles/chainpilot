/**
 * Monitoring Panel Component
 * Manage and view contract monitoring alerts
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radar, Plus, Trash2, Play, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { isAddress } from 'ethers';
import { toast } from 'sonner';
import {
  getMonitors,
  createMonitor,
  deleteMonitor,
  triggerMonitorCheck,
  Monitor,
} from '../../utils/api/monitoringApi';

export default function MonitoringPanel() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingMonitorId, setCheckingMonitorId] = useState<string | null>(null);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const walletAddress = user?.wallet?.address || wallets?.[0]?.address;
  
  useEffect(() => {
    if (walletAddress) {
      loadMonitors(walletAddress);
    } else {
      setIsLoading(false);
    }
  }, [walletAddress]);
  
  const loadMonitors = async (address: string) => {
    if (!address) return;
    
    try {
      const data = await getMonitors(address, true);
      setMonitors(data);
    } catch (error: any) {
      console.error('Failed to load monitors:', error);
      toast.error(error?.message || 'Failed to load monitors');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddMonitor = async () => {
    const normalizedAddress = newAddress.trim();

    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!normalizedAddress) {
      toast.error('Please enter a contract address');
      return;
    }

    if (!isAddress(normalizedAddress)) {
      toast.error('Please enter a valid contract address');
      return;
    }
    
    try {
      await createMonitor({
        contractAddress: normalizedAddress,
        userAddress: walletAddress,
        thresholds: {
          riskScoreIncrease: 20,
          checkIntervalMinutes: 5,
        },
      });
      
      toast.success('Monitor created successfully!');
      setNewAddress('');
      setShowAddForm(false);
      loadMonitors(walletAddress);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create monitor');
    }
  };
  
  const handleDelete = async (monitorId: string) => {
    try {
      await deleteMonitor(monitorId);
      toast.success('Monitor deleted');
      if (walletAddress) {
        loadMonitors(walletAddress);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete monitor');
    }
  };
  
  const handleCheckNow = async (monitorId: string) => {
    setCheckingMonitorId(monitorId);
    setCheckStatus(null);

    try {
      const result = await triggerMonitorCheck(monitorId);
      const statusMessage = `Check complete. ${result.newAlertsCount} new alerts.`;
      toast.success(statusMessage);
      setCheckStatus(statusMessage);
      if (walletAddress) {
        void loadMonitors(walletAddress);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Check failed';
      toast.error(errorMessage);
      setCheckStatus(errorMessage);
    } finally {
      setCheckingMonitorId(null);
    }
  };
  
  if (!walletAddress) {
    return (
      <div className="text-center py-12">
        <Radar className="w-16 h-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400">Connect your wallet to manage monitors</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radar className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Contract Monitoring</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </button>
      </div>
      
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 rounded-xl bg-white/5 border border-white/10"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Contract address (0x...)"
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddMonitor}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold transition-colors"
            >
              Create
            </button>
          </div>
        </motion.div>
      )}

      {checkStatus && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
          {checkStatus}
        </div>
      )}
      
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading monitors...</div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-400">No active monitors. Add one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {monitors.map((monitor) => (
            <motion.div
              key={monitor._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-mono text-white mb-2">{monitor.contractAddress}</div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Chain: Somnia</span>
                    <span>•</span>
                    <span>Checked: {monitor.lastChecked ? new Date(monitor.lastChecked).toLocaleString() : 'Never'}</span>
                    {monitor.unacknowledgedAlertsCount && monitor.unacknowledgedAlertsCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-500 font-semibold">
                          {monitor.unacknowledgedAlertsCount} new alerts
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCheckNow(monitor._id)}
                    disabled={checkingMonitorId === monitor._id}
                    className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                    title="Check now"
                  >
                    {checkingMonitorId === monitor._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(monitor._id)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {monitor.alertHistory && monitor.alertHistory.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-semibold text-gray-300">Recent Alerts:</div>
                  {monitor.alertHistory.slice(-3).reverse().map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg bg-black/20 border border-white/10 text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className={`font-semibold mb-1 ${
                            alert.severity === 'CRITICAL' ? 'text-red-500' :
                            alert.severity === 'HIGH' ? 'text-orange-500' :
                            alert.severity === 'MEDIUM' ? 'text-yellow-500' :
                            'text-blue-500'
                          }`}>
                            {alert.type.replace(/_/g,' ')}
                          </div>
                          <div className="text-gray-300">{alert.message}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                        {alert.acknowledged && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
