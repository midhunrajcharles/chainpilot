"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChainPilotApiClient, Notification, NotificationSubscription } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaBell, FaCheck, FaCog, FaEnvelope, FaEyeSlash, FaMobile, FaPlus, FaSms, FaTrash } from "react-icons/fa";

interface NotificationItem extends Notification {
  id: string;
}

export default function NotificationManagement() {
  const { user } = usePrivy();
  const address = user?.wallet?.address;
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notifications" | "subscriptions">("notifications");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  
  // New subscription form state
  const [newSubscription, setNewSubscription] = useState({
    type: "email" as "email" | "push" | "sms",
    endpoint: "",
    events: [] as string[]
  });

  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!address || isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    try {
      const params = filter === "unread" ? { unread: true } : {};
      const response = await ChainPilotApiClient.notifications.getNotifications(address, params);
      
      if (response.success && response.data) {
        const notificationData = Array.isArray(response.data) ? response.data : [];
        setNotifications(notificationData.map((item: any) => ({
          ...item,
          id: item._id || item.id
        })));
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications");
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [address, filter]);

  const fetchSubscriptions = useCallback(async () => {
    if (!address || isFetchingRef.current) return;
    
    try {
      const response = await ChainPilotApiClient.notifications.getNotificationSubscriptions(address);
      
      if (response.success && response.data) {
        setSubscriptions(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setError("Failed to load notification subscriptions");
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchNotifications();
      fetchSubscriptions();
    }
  }, [address, fetchNotifications, fetchSubscriptions]);

  const handleMarkAsRead = async (notificationIds: string[]) => {
    if (!address || notificationIds.length === 0) return;
    
    try {
      const response = await ChainPilotApiClient.notifications.markNotificationsAsRead(address, notificationIds);
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notificationIds.includes(notification.id) 
              ? { ...notification, read: true }
              : notification
          )
        );
        setSelectedNotifications([]);
      }
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
      setError("Failed to mark notifications as read");
    }
  };

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (!address) return;
    
    try {
      const response = await ChainPilotApiClient.notifications.deleteNotificationSubscription(address, subscriptionId);
      
      if (response.success) {
        setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId));
      }
    } catch (err) {
      console.error("Failed to delete subscription:", err);
      setError("Failed to delete subscription");
    }
  };

  const handleCreateSubscription = async () => {
    if (!address || !newSubscription.endpoint || newSubscription.events.length === 0) return;
    
    try {
      const response = await ChainPilotApiClient.notifications.subscribeToNotifications(address, newSubscription);
      
      if (response.success) {
        setSubscriptions(prev => [...prev, response.data]);
        setShowSubscriptionModal(false);
        setNewSubscription({
          type: "email",
          endpoint: "",
          events: []
        });
      }
    } catch (err) {
      console.error("Failed to create subscription:", err);
      setError("Failed to create subscription");
    }
  };

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAllNotifications = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setSelectedNotifications(unreadIds);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return "💰";
      case "security":
        return "🔒";
      case "team":
        return "👥";
      case "system":
        return "⚙️";
      default:
        return "🔔";
    }
  };

  const getSubscriptionIcon = (type: string) => {
    switch (type) {
      case "email":
        return <FaEnvelope className="text-blue-400" />;
      case "push":
        return <FaMobile className="text-green-400" />;
      case "sms":
        return <FaSms className="text-purple-400" />;
      default:
        return <FaBell className="text-slate-400" />;
    }
  };

  const availableEvents = [
    "transaction_completed",
    "transaction_failed",
    "security_alert",
    "team_invitation",
    "balance_low",
    "system_update"
  ];

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "unread") return !notification.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Notifications
            </h2>
            <p className="text-slate-400 mt-1 text-sm md:text-base">Manage your notifications and subscriptions</p>
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
            Notifications
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Manage your notifications and subscriptions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300"
          >
            <FaPlus className="text-sm" />
            Add Subscription
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
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
            activeTab === "notifications"
              ? "text-white border-b-2 border-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Notifications {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
            activeTab === "subscriptions"
              ? "text-white border-b-2 border-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Subscriptions
        </button>
      </div>

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          {/* Filter and Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
                  filter === "all"
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 py-1 rounded-lg text-sm transition-all duration-300 ${
                  filter === "unread"
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Unread
              </button>
            </div>
            
            {selectedNotifications.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={selectAllNotifications}
                  className="px-3 py-1 text-sm text-slate-400 hover:text-white transition-all duration-300"
                >
                  Select All
                </button>
                <button
                  onClick={() => handleMarkAsRead(selectedNotifications)}
                  className="flex items-center gap-2 px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 text-sm transition-all duration-300"
                >
                  <FaCheck className="text-xs" />
                  Mark as Read
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <FaBell className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No notifications</h3>
                <p className="text-slate-400">You're all caught up!</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white/5 backdrop-blur-xl border rounded-2xl p-4 hover:border-white/30 transition-all duration-300 ${
                    notification.read ? "border-white/10" : "border-blue-500/30 bg-blue-500/5"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleNotificationSelection(notification.id)}
                      className="mt-1 w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                      title={`Select notification: ${notification.title}`}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <h3 className={`font-medium ${notification.read ? "text-slate-300" : "text-white"}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm ${notification.read ? "text-slate-400" : "text-slate-300"}`}>
                        {notification.message}
                      </p>
                      {notification.data && Object.keys(notification.data).length > 0 && (
                        <div className="mt-2 p-2 bg-black/20 rounded-lg">
                          <pre className="text-xs text-slate-400 overflow-x-auto">
                            {JSON.stringify(notification.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <FaCog className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No subscriptions</h3>
              <p className="text-slate-400 mb-4">Set up notification subscriptions to stay informed</p>
              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-xl text-white transition-all duration-300"
              >
                Create Subscription
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/30 transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getSubscriptionIcon(subscription.type)}
                      <span className="font-medium text-white capitalize">{subscription.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subscription.active 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {subscription.active ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => handleDeleteSubscription(subscription.id)}
                        className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200"
                        title="Delete subscription"
                      >
                        <FaTrash className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  {subscription.endpoint && (
                    <p className="text-sm text-slate-400 mb-2 break-all">
                      {subscription.endpoint}
                    </p>
                  )}
                  
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">Events:</p>
                    <div className="flex flex-wrap gap-1">
                      {subscription.events.map((event, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 text-xs text-slate-300 rounded">
                          {event.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create Subscription</h3>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
                title="Close modal"
              >
                <FaEyeSlash className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                <Select 
                  value={newSubscription.type} 
                  onValueChange={(value) => setNewSubscription(prev => ({ ...prev, type: value as "email" | "push" | "sms" }))}
                >
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-white/30">
                    <SelectValue placeholder="Select notification type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10">
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push">Push Notification</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {newSubscription.type === "email" ? "Email Address" : 
                   newSubscription.type === "push" ? "Device Token" : "Phone Number"}
                </label>
                <input
                  type="text"
                  value={newSubscription.endpoint}
                  onChange={(e) => setNewSubscription(prev => ({ ...prev, endpoint: e.target.value }))}
                  placeholder={newSubscription.type === "email" ? "user@example.com" : 
                             newSubscription.type === "push" ? "Device token..." : "+1234567890"}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-white/30 transition-all duration-300"
                  title={`Enter ${newSubscription.type === "email" ? "email address" : 
                             newSubscription.type === "push" ? "device token" : "phone number"}`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Events</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableEvents.map((event) => (
                    <label key={event} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newSubscription.events.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewSubscription(prev => ({ ...prev, events: [...prev.events, event] }));
                          } else {
                            setNewSubscription(prev => ({ ...prev, events: prev.events.filter(ev => ev !== event) }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                        title={`Subscribe to ${event.replace(/_/g, ' ')} notifications`}
                      />
                      <span className="text-slate-300">{event.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubscription}
                  disabled={!newSubscription.endpoint || newSubscription.events.length === 0}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
