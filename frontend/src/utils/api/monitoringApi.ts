/**
 * Monitoring API Client
 * Frontend API calls for contract monitoring
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface CreateMonitorRequest {
  contractAddress: string;
  chainId?: number;
  thresholds?: {
    riskScoreIncrease?: number;
    liquidityChangePercent?: number;
    largeTransferAmount?: string;
    checkIntervalMinutes?: number;
  };
  userAddress: string;
}

export interface Monitor {
  _id: string;
  userId: string;
  contractAddress: string;
  chainId: number;
  thresholds: {
    riskScoreIncrease?: number;
    liquidityChangePercent?: number;
    largeTransferAmount?: string;
    checkIntervalMinutes: number;
  };
  isActive: boolean;
  lastChecked?: string;
  lastRiskScore?: number;
  alertHistory: Alert[];
  notificationSettings: {
    pushNotifications: boolean;
    email: boolean;
    webhook?: string;
  };
  createdAt: string;
  updatedAt: string;
  unacknowledgedAlertsCount?: number;
  recentAlerts?: Alert[];
}

export interface Alert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: any;
  timestamp: string;
  acknowledged: boolean;
  aiExplanation?: string;
}

/**
 * Create a new monitor
 */
export async function createMonitor(
  params: CreateMonitorRequest
): Promise<Monitor> {
  try {
    const response = await axios.post(`${API_BASE_URL}/monitors`, params);
    return response.data.data;
  } catch (error: any) {
    console.error('Create monitor API error:', error);
    const validationMessage = error.response?.data?.errors?.[0]?.msg;
    throw new Error(
      validationMessage ||
      error.response?.data?.error ||
      'Failed to create monitor'
    );
  }
}

/**
 * Get user's monitors
 */
export async function getMonitors(
  userAddress: string,
  isActive?: boolean
): Promise<Monitor[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/monitors`, {
      params: { userAddress, isActive },
      timeout: 15000,
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Get monitors API error:', error);
    const validationMessage = error.response?.data?.errors?.[0]?.msg;
    throw new Error(
      validationMessage ||
      error.response?.data?.error ||
      'Failed to fetch monitors'
    );
  }
}

/**
 * Get monitor details
 */
export async function getMonitor(monitorId: string): Promise<Monitor> {
  try {
    const response = await axios.get(`${API_BASE_URL}/monitors/${monitorId}`, {
      timeout: 15000,
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Get monitor API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to fetch monitor'
    );
  }
}

/**
 * Trigger immediate check
 */
export async function triggerMonitorCheck(monitorId: string): Promise<{
  checkCompleted: boolean;
  newAlertsCount: number;
  alerts: Alert[];
}> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/monitors/${monitorId}/check`,
      undefined,
      { timeout: 45000 }
    );
    return response.data.data;
  } catch (error: any) {
    console.error('Trigger check API error:', error);
    const validationMessage = error.response?.data?.errors?.[0]?.msg;
    throw new Error(
      validationMessage ||
      error.response?.data?.error ||
      (error.code === 'ECONNABORTED' ? 'Check request timed out. Try again.' : 'Failed to trigger monitor check')
    );
  }
}

/**
 * Update monitor settings
 */
export async function updateMonitor(
  monitorId: string,
  updates: Partial<Monitor>
): Promise<Monitor> {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/monitors/${monitorId}`,
      updates
    );
    return response.data.data;
  } catch (error: any) {
    console.error('Update monitor API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to update monitor'
    );
  }
}

/**
 * Delete monitor
 */
export async function deleteMonitor(monitorId: string): Promise<void> {
  try {
    await axios.delete(`${API_BASE_URL}/monitors/${monitorId}`, {
      timeout: 15000,
    });
  } catch (error: any) {
    console.error('Delete monitor API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to delete monitor'
    );
  }
}

/**
 * Acknowledge alert
 */
export async function acknowledgeAlert(
  monitorId: string,
  alertId: string
): Promise<void> {
  try {
    await axios.post(
      `${API_BASE_URL}/monitors/${monitorId}/alerts/${alertId}/acknowledge`
    );
  } catch (error: any) {
    console.error('Acknowledge alert API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to acknowledge alert'
    );
  }
}

export default {
  createMonitor,
  getMonitors,
  getMonitor,
  triggerMonitorCheck,
  updateMonitor,
  deleteMonitor,
  acknowledgeAlert,
};
