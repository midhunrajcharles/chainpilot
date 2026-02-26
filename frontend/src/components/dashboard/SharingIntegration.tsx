"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChainPilotApiClient } from "@/utils/api";
import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";
import { FaDownload, FaEnvelope, FaFacebook, FaFilePdf, FaImage, FaLinkedin, FaQrcode, FaShare, FaTwitter } from "react-icons/fa";

export default function SharingIntegration() {
  const { user } = usePrivy();
  const [activeTab, setActiveTab] = useState<'qr-code' | 'receipt' | 'social-share' | 'email'>('qr-code');
  
  // QR Code State
  const [qrTransactionId, setQrTransactionId] = useState('');
  const [qrResult, setQrResult] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Receipt State
  const [receiptForm, setReceiptForm] = useState({
    transactionId: '',
    format: 'pdf' as 'pdf' | 'image'
  });
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Social Share State
  const [socialForm, setSocialForm] = useState({
    transactionId: '',
    platform: 'twitter' as 'twitter' | 'linkedin' | 'facebook',
    message: ''
  });
  const [socialResult, setSocialResult] = useState<any>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  // Email State
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    template: 'receipt' as 'receipt' | 'notification' | 'custom',
    transactionId: '',
    customData: ''
  });
  const [emailResult, setEmailResult] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const walletAddress = user?.wallet?.address || '';

  const handleGenerateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress || !qrTransactionId) return;

    setQrLoading(true);
    try {
      const result = await ChainPilotApiClient.sharing.generateQR(walletAddress, qrTransactionId);
      if (result.success) {
        setQrResult(result.data);
      } else {
        console.error('QR generation failed:', result.error);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setQrLoading(false);
    }
  };

  const handleGenerateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;

    setReceiptLoading(true);
    try {
      const result = await ChainPilotApiClient.sharing.generateReceipt(walletAddress, receiptForm.transactionId, receiptForm.format);
      if (result.success) {
        setReceiptResult(result.data);
      } else {
        console.error('Receipt generation failed:', result.error);
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleSocialShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;

    setSocialLoading(true);
    try {
      const result = await ChainPilotApiClient.sharing.createSocialShare(walletAddress, socialForm);
      if (result.success) {
        setSocialResult(result.data);
      } else {
        console.error('Social share failed:', result.error);
      }
    } catch (error) {
      console.error('Error creating social share:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;

    setEmailLoading(true);
    try {
      const emailData = {
        to: emailForm.to,
        subject: emailForm.subject,
        template: emailForm.template,
        data: emailForm.template === 'custom' ? { html: emailForm.customData } : { transactionId: emailForm.transactionId }
      };
      
      const result = await ChainPilotApiClient.sharing.sendEmail(walletAddress, emailData);
      if (result.success) {
        setEmailResult(result.data);
      } else {
        console.error('Email sending failed:', result.error);
      }
    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setEmailLoading(false);
    }
  };

  const tabs = [
    { id: 'qr-code', label: 'QR Code', icon: FaQrcode },
    { id: 'receipt', label: 'Receipt', icon: FaFilePdf },
    { id: 'social-share', label: 'Social Share', icon: FaShare },
    { id: 'email', label: 'Email', icon: FaEnvelope }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Sharing & Integration</h2>
          <p className="text-slate-400 mt-1">Share transactions and integrate with external services</p>
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

      {/* QR Code Tab */}
      {activeTab === 'qr-code' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaQrcode className="text-blue-400" />
              Generate QR Code
            </h3>
            
            <form onSubmit={handleGenerateQR} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Transaction ID</label>
                <input
                  type="text"
                  value={qrTransactionId}
                  onChange={(e) => setQrTransactionId(e.target.value)}
                  placeholder="Enter transaction ID..."
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={qrLoading}
                className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 rounded-xl text-blue-400 hover:text-blue-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {qrLoading ? 'Generating...' : 'Generate QR Code'}
              </button>
            </form>
          </div>

          {/* QR Results */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">QR Code</h3>
            
            {qrResult ? (
              <div className="space-y-4">
                <div className="text-center">
                  <img 
                    src={qrResult.qrCode} 
                    alt="Transaction QR Code" 
                    className="mx-auto w-48 h-48 bg-white rounded-lg p-4"
                  />
                </div>
                
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Share URL</div>
                  <div className="text-white text-sm break-all">{qrResult.shareUrl}</div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(qrResult.shareUrl)}
                    className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/30 hover:border-slate-500/50 rounded-xl text-slate-300 hover:text-white transition-all duration-300"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => window.open(qrResult.qrCode, '_blank')}
                    className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 rounded-xl text-blue-400 hover:text-blue-300 transition-all duration-300"
                  >
                    <FaDownload className="inline mr-2" />
                    Download
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaQrcode className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Enter a transaction ID to generate QR code</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt Tab */}
      {activeTab === 'receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaFilePdf className="text-red-400" />
              Generate Receipt
            </h3>
            
            <form onSubmit={handleGenerateReceipt} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Transaction ID</label>
                <input
                  type="text"
                  value={receiptForm.transactionId}
                  onChange={(e) => setReceiptForm({ ...receiptForm, transactionId: e.target.value })}
                  placeholder="Enter transaction ID..."
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-red-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-2">Format</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReceiptForm({ ...receiptForm, format: 'pdf' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      receiptForm.format === 'pdf'
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                    }`}
                  >
                    <FaFilePdf />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptForm({ ...receiptForm, format: 'image' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      receiptForm.format === 'image'
                        ? 'bg-red-500/20 text-red-400 border border-red-400/30'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                    }`}
                  >
                    <FaImage />
                    Image
                  </button>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={receiptLoading}
                className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 rounded-xl text-red-400 hover:text-red-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {receiptLoading ? 'Generating...' : 'Generate Receipt'}
              </button>
            </form>
          </div>

          {/* Receipt Results */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Receipt</h3>
            
            {receiptResult ? (
              <div className="space-y-4">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Receipt URL</div>
                  <div className="text-white text-sm break-all">{receiptResult.url}</div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(receiptResult.url, '_blank')}
                    className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 rounded-xl text-red-400 hover:text-red-300 transition-all duration-300"
                  >
                    <FaDownload className="inline mr-2" />
                    Download
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(receiptResult.url)}
                    className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/30 hover:border-slate-500/50 rounded-xl text-slate-300 hover:text-white transition-all duration-300"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaFilePdf className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Enter a transaction ID to generate receipt</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Social Share Tab */}
      {activeTab === 'social-share' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaShare className="text-blue-400" />
              Social Media Share
            </h3>
            
            <form onSubmit={handleSocialShare} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Transaction ID</label>
                <input
                  type="text"
                  value={socialForm.transactionId}
                  onChange={(e) => setSocialForm({ ...socialForm, transactionId: e.target.value })}
                  placeholder="Enter transaction ID..."
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-2">Platform</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSocialForm({ ...socialForm, platform: 'twitter' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      socialForm.platform === 'twitter'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                    }`}
                  >
                    <FaTwitter />
                    Twitter
                  </button>
                  <button
                    type="button"
                    onClick={() => setSocialForm({ ...socialForm, platform: 'linkedin' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      socialForm.platform === 'linkedin'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                    }`}
                  >
                    <FaLinkedin />
                    LinkedIn
                  </button>
                  <button
                    type="button"
                    onClick={() => setSocialForm({ ...socialForm, platform: 'facebook' })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      socialForm.platform === 'facebook'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/30'
                    }`}
                  >
                    <FaFacebook />
                    Facebook
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-2">Custom Message (Optional)</label>
                <textarea
                  value={socialForm.message}
                  onChange={(e) => setSocialForm({ ...socialForm, message: e.target.value })}
                  placeholder="Enter your custom message..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none transition-colors resize-none"
                />
              </div>
              
              <button
                type="submit"
                disabled={socialLoading}
                className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 rounded-xl text-blue-400 hover:text-blue-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {socialLoading ? 'Creating...' : 'Create Share'}
              </button>
            </form>
          </div>

          {/* Social Share Results */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Share Content</h3>
            
            {socialResult ? (
              <div className="space-y-4">
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Share URL</div>
                  <div className="text-white text-sm break-all">{socialResult.shareUrl}</div>
                </div>
                
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Content Preview</div>
                  <div className="text-white text-sm">{socialResult.content}</div>
                </div>
                
                <button
                  onClick={() => window.open(socialResult.shareUrl, '_blank')}
                  className="w-full px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 rounded-xl text-blue-400 hover:text-blue-300 transition-all duration-300"
                >
                  Share on {socialForm.platform.charAt(0).toUpperCase() + socialForm.platform.slice(1)}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaShare className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Create social media content for your transaction</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FaEnvelope className="text-green-400" />
              Send Email
            </h3>
            
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Recipient Email</label>
                <input
                  type="email"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-green-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-2">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Email subject..."
                  className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-green-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-slate-400 text-sm mb-2">Template</label>
                <Select value={emailForm.template} onValueChange={(value) => setEmailForm({ ...emailForm, template: value as any })}>
                  <SelectTrigger className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white focus:border-green-400 transition-colors">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10">
                    <SelectItem value="receipt">Transaction Receipt</SelectItem>
                    <SelectItem value="notification">Transaction Notification</SelectItem>
                    <SelectItem value="custom">Custom Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {emailForm.template !== 'custom' && (
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={emailForm.transactionId}
                    onChange={(e) => setEmailForm({ ...emailForm, transactionId: e.target.value })}
                    placeholder="Enter transaction ID..."
                    className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-green-400 focus:outline-none transition-colors"
                    required={emailForm.template !== 'custom'}
                  />
                </div>
              )}
              
              {emailForm.template === 'custom' && (
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Custom Content</label>
                  <textarea
                    value={emailForm.customData}
                    onChange={(e) => setEmailForm({ ...emailForm, customData: e.target.value })}
                    placeholder="Enter your custom email content..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-800/30 border border-slate-600/30 rounded-xl text-white placeholder-slate-400 focus:border-green-400 focus:outline-none transition-colors resize-none"
                    required={emailForm.template === 'custom'}
                  />
                </div>
              )}
              
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 hover:border-green-400/50 rounded-xl text-green-400 hover:text-green-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailLoading ? 'Sending...' : 'Send Email'}
              </button>
            </form>
          </div>

          {/* Email Results */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Email Status</h3>
            
            {emailResult ? (
              <div className="space-y-4">
                <div className="bg-green-800/20 border border-green-400/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                    <FaEnvelope />
                    Email Sent Successfully
                  </div>
                  <div className="text-slate-400 text-sm">Message ID: {emailResult.messageId}</div>
                </div>
                
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Recipient</div>
                  <div className="text-white">{emailForm.to}</div>
                </div>
                
                <div className="bg-slate-800/30 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Subject</div>
                  <div className="text-white">{emailForm.subject}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaEnvelope className="text-4xl text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Send transaction receipts and notifications via email</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}