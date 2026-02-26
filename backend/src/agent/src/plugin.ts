/**
 * ChainPilot AI – ElizaOS Plugin
 * Real blockchain actions that call the ChainPilot backend API.
 *
 * Every message arriving from the frontend is prefixed with:
 *   [wallet:0x<address>]
 * so actions can extract the authenticated wallet without a separate auth layer.
 */
import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type Provider,
  type ProviderResult,
  type RouteRequest,
  type RouteResponse,
  Service,
  type State,
  logger,
} from '@elizaos/core';

// ── helpers ─────────────────────────────────────────────────────────────────

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:5000';

/** Extract wallet address embedded by the frontend as `[wallet:0x...]` */
function extractWallet(text: string): string {
  const m = text.match(/\[wallet:(0x[a-fA-F0-9]{40})\]/i);
  return m ? m[1] : '';
}

/** Strip the wallet prefix so the LLM sees a clean message */
function cleanText(text: string): string {
  return text.replace(/\[wallet:0x[a-fA-F0-9]{40}\]\s*/i, '').trim();
}

async function backendGet(path: string, wallet: string): Promise<any> {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { walletaddress: wallet, 'Content-Type': 'application/json' },
  });
  return res.json();
}

async function backendPost(path: string, wallet: string, body: object): Promise<any> {
  const res = await fetch(`${BACKEND}${path}`, {
    method: 'POST',
    headers: { walletaddress: wallet, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function addr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: CHECK_BALANCE
// ─────────────────────────────────────────────────────────────────────────────
const checkBalanceAction: Action = {
  name: 'CHECK_BALANCE',
  similes: ['GET_BALANCE', 'SHOW_BALANCE', 'WALLET_BALANCE', 'HOW_MUCH_ETH', 'WHAT_IS_MY_BALANCE'],
  description: 'Fetches the real on-chain ETH balance for the connected wallet.',

  validate: async (_rt: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content.text ?? '').toLowerCase();
    return /balance|how much|eth\s*left|funds|wallet value/i.test(text);
  },

  handler: async (_rt: IAgentRuntime, message: Memory, _state: State, _opts: any, callback: HandlerCallback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) {
      await callback({ text: '⚠️ No wallet address found. Please connect your wallet.' });
      return { success: false, text: 'No wallet' };
    }
    try {
      const res = await fetch('http://localhost:3000/api/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet, token: 'ETH' }),
      });
      const data = await res.json();
      const balance = data.balance ?? '0';
      const response = `💰 **Wallet Balance**\n\nAddress: \`${addr(wallet)}\`\nETH Balance: **${parseFloat(balance).toFixed(6)} ETH**\n\n_Live data from Sepolia testnet_`;
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('CHECK_BALANCE error:', err);
      await callback({ text: '❌ Failed to fetch balance. Please try again.' });
      return { success: false, text: 'Balance fetch failed' };
    }
  },

  examples: [[
    { name: '{{user}}', content: { text: "What's my ETH balance?" } },
    { name: 'ChainPilot AI', content: { text: '💰 Your ETH balance is **0.5421 ETH** on Sepolia testnet.' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: SHOW_HISTORY
// ─────────────────────────────────────────────────────────────────────────────
const showHistoryAction: Action = {
  name: 'SHOW_HISTORY',
  similes: ['GET_HISTORY', 'TRANSACTION_HISTORY', 'RECENT_TRANSACTIONS', 'MY_TRANSACTIONS'],
  description: "Retrieves the user's real transaction history from the database.",

  validate: async (_rt, message) => /history|transactions|recent|sent|received|activity/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }
    try {
      const data = await backendGet('/api/analytics/transaction-history?page=1&limit=10', wallet);
      const txs: any[] = data.data ?? [];
      if (!txs.length) {
        await callback({ text: '📭 No transactions found yet. Make your first transaction to see it here!' });
        return { success: true, text: 'No transactions' };
      }
      let response = `📜 **Recent Transactions** (${data.total ?? txs.length} total)\n\n`;
      txs.slice(0, 8).forEach((tx: any, i: number) => {
        const dir = tx.from?.toLowerCase() === wallet.toLowerCase() ? '🔴 Sent' : '🟢 Received';
        response += `${i + 1}. ${dir} **${parseFloat(tx.amount).toFixed(4)} ${tx.token}** → ${addr(tx.to)}  •  ${new Date(tx.createdAt).toLocaleDateString()}  •  ${tx.status}\n`;
      });
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('SHOW_HISTORY error:', err);
      await callback({ text: '❌ Failed to load transaction history.' });
      return { success: false, text: 'History failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Show my recent transactions' } },
    { name: 'ChainPilot AI', content: { text: '📜 **Recent Transactions**\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: SHOW_ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────
const showAnalyticsAction: Action = {
  name: 'SHOW_ANALYTICS',
  similes: ['GET_ANALYTICS', 'PORTFOLIO_STATS', 'MY_STATS', 'SPENDING_STATS'],
  description: "Shows the user's real portfolio analytics and spending breakdown.",

  validate: async (_rt, message) => /analytics|stats|spent|portfolio|spending|overview/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }
    try {
      const data = await backendGet('/api/analytics/dashboard?period=30d', wallet);
      const a = data.data;
      if (!a) { await callback({ text: '📊 No analytics data yet. Make some transactions first!' }); return { success: true, text: 'No data' }; }
      const response =
        `📊 **Portfolio Analytics (last 30 days)**\n\n` +
        `💼 Portfolio Net: **${parseFloat(a.portfolioValue).toFixed(6)} ETH**\n` +
        `📉 Total Spent: **${parseFloat(a.totalSpent).toFixed(6)} ETH**\n` +
        `📈 Total Received: **${parseFloat(a.totalReceived).toFixed(6)} ETH**\n` +
        `🔄 Transactions: **${a.transactionCount}**\n\n` +
        (a.topRecipients?.length ? `🎯 Top Recipients:\n` + a.topRecipients.slice(0, 3).map((r: any, i: number) =>
          `  ${i + 1}. ${addr(r.address)} — ${r.count} txs`).join('\n') : '');
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('SHOW_ANALYTICS error:', err);
      await callback({ text: '❌ Failed to load analytics.' });
      return { success: false, text: 'Analytics failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Show my portfolio stats' } },
    { name: 'ChainPilot AI', content: { text: '📊 **Portfolio Analytics**\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: SHOW_CONTACTS
// ─────────────────────────────────────────────────────────────────────────────
const showContactsAction: Action = {
  name: 'SHOW_CONTACTS',
  similes: ['LIST_CONTACTS', 'MY_CONTACTS', 'GET_CONTACTS', 'VIEW_CONTACTS'],
  description: "Lists all saved contacts for the connected wallet.",

  validate: async (_rt, message) => /contacts|my contacts|list contacts|show contacts|saved address/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }
    try {
      const data = await backendGet('/api/chat/contacts', wallet);
      const contacts: any[] = data.data ?? [];
      if (!contacts.length) {
        await callback({ text: '📒 No contacts saved yet. Say **"Add [name] as contact with address 0x..."** to add one.' });
        return { success: true, text: 'No contacts' };
      }
      let response = `📒 **Your Contacts** (${contacts.length})\n\n`;
      contacts.forEach((c: any, i: number) => {
        response += `${i + 1}. **${c.name}** — \`${addr(c.address)}\`\n`;
      });
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('SHOW_CONTACTS error:', err);
      await callback({ text: '❌ Failed to load contacts.' });
      return { success: false, text: 'Contacts failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Show my contacts' } },
    { name: 'ChainPilot AI', content: { text: '📒 **Your Contacts**\n1. Alice — 0x1234...abcd\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: ADD_CONTACT
// ─────────────────────────────────────────────────────────────────────────────
const addContactAction: Action = {
  name: 'ADD_CONTACT',
  similes: ['SAVE_CONTACT', 'CREATE_CONTACT', 'NEW_CONTACT', 'STORE_CONTACT'],
  description: "Saves a new contact (name + wallet address) to the user's contact list.",

  validate: async (_rt, message) => /add.+contact|save.+contact|add.+as contact|new contact|create contact/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    const text = cleanText(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }

    const addrMatch = text.match(/0x[a-fA-F0-9]{40}/);
    const recipientAddress = addrMatch?.[0];
    const nameMatch = text.match(/(?:add|save|create|store)\s+(.+?)\s+(?:as\s+(?:a\s+)?contact|with\s+address|contact\s+with)/i);
    const name = nameMatch?.[1]?.trim();

    if (!name || !recipientAddress) {
      await callback({ text: '❓ Please provide both a name and address.\nExample: _"Add Alice as contact with address 0x1234..."_' });
      return { success: false, text: 'Missing fields' };
    }
    try {
      const data = await backendPost('/api/chat/create-contact', wallet, { name, address: recipientAddress, group: 'default' });
      if (data.success) { await callback({ text: `✅ Contact **${name}** (${addr(recipientAddress)}) saved successfully!` }); return { success: true, text: `Saved ${name}` }; }
      if ((data.error ?? '').toLowerCase().includes('exists')) { await callback({ text: `ℹ️ Contact **${name}** already exists.` }); return { success: true, text: 'Already exists' }; }
      await callback({ text: `❌ Could not save: ${data.error}` });
      return { success: false, text: data.error };
    } catch (err: any) {
      logger.error('ADD_CONTACT error:', err);
      await callback({ text: '❌ Failed to save contact.' });
      return { success: false, text: 'Contact failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Add Alice as contact with address 0x71C7656EC7ab88b098defB751B7401B5f6d8976F' } },
    { name: 'ChainPilot AI', content: { text: '✅ Contact **Alice** saved successfully!' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: SHOW_TEAMS
// ─────────────────────────────────────────────────────────────────────────────
const showTeamsAction: Action = {
  name: 'SHOW_TEAMS',
  similes: ['LIST_TEAMS', 'MY_TEAMS', 'GET_TEAMS', 'VIEW_TEAMS'],
  description: "Lists all teams the connected wallet is a member of.",

  validate: async (_rt, message) => /(?:show|list|my|get|view)\s+teams|teams?\s+(?:list|i)/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }
    try {
      const data = await backendGet('/api/chat/teams', wallet);
      const teams: any[] = data.data ?? [];
      if (!teams.length) { await callback({ text: '👥 No teams yet. Say **"Create team Marketing"** to create one.' }); return { success: true, text: 'No teams' }; }
      let response = `👥 **Your Teams** (${teams.length})\n\n`;
      teams.forEach((t: any, i: number) => { response += `${i + 1}. **${t.name}** — ${t.members?.length ?? 0} members\n`; });
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('SHOW_TEAMS error:', err);
      await callback({ text: '❌ Failed to load teams.' });
      return { success: false, text: 'Teams failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Show my teams' } },
    { name: 'ChainPilot AI', content: { text: '👥 **Your Teams**\n1. Marketing — 3 members' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: CREATE_TEAM
// ─────────────────────────────────────────────────────────────────────────────
const createTeamAction: Action = {
  name: 'CREATE_TEAM',
  similes: ['NEW_TEAM', 'MAKE_TEAM', 'START_TEAM', 'BUILD_TEAM'],
  description: "Creates a new team with the given name.",

  validate: async (_rt, message) => /create\s+team|make\s+team|new\s+team|start\s+team/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    const text = cleanText(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }

    const nameMatch = text.match(/(?:create|make|start|build|new)\s+(?:a\s+)?(?:team\s+(?:called|named)?\s*)?(.+)/i);
    const teamName = nameMatch?.[1]?.replace(/^team\s*/i, '').trim();

    if (!teamName) { await callback({ text: '❓ Example: _"Create team Marketing"_' }); return { success: false, text: 'No team name' }; }
    try {
      const data = await backendPost('/api/chat/create-team', wallet, { name: teamName, description: '', members: [] });
      if (data.success) { await callback({ text: `✅ Team **${teamName}** created successfully!` }); return { success: true, text: `Created ${teamName}` }; }
      if ((data.error ?? '').toLowerCase().includes('exists')) { await callback({ text: `ℹ️ Team **${teamName}** already exists.` }); return { success: true, text: 'Already exists' }; }
      await callback({ text: `❌ Could not create team: ${data.error}` });
      return { success: false, text: data.error };
    } catch (err: any) {
      logger.error('CREATE_TEAM error:', err);
      await callback({ text: '❌ Failed to create team.' });
      return { success: false, text: 'Team create failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Create team Marketing' } },
    { name: 'ChainPilot AI', content: { text: '✅ Team **Marketing** created successfully!' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: ANALYZE_CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
const analyzeContractAction: Action = {
  name: 'ANALYZE_CONTRACT',
  similes: ['SCAN_CONTRACT', 'AUDIT_CONTRACT', 'CHECK_CONTRACT', 'CONTRACT_SECURITY'],
  description: 'Runs AI-powered security analysis on a smart contract.',

  validate: async (_rt, message) => {
    const text = message.content.text ?? '';
    return /(?:analyze|scan|audit|check|inspect)\s+(?:contract|0x)/i.test(text) && /0x[a-fA-F0-9]{40}/.test(text);
  },

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    const text = cleanText(message.content.text ?? '');
    const contractMatch = text.match(/0x[a-fA-F0-9]{40}/);
    if (!contractMatch) { await callback({ text: '❓ Provide a contract address (0x...).' }); return { success: false, text: 'No address' }; }
    const contractAddress = contractMatch[0];

    await callback({ text: `🔍 Analyzing \`${addr(contractAddress)}\`... this may take a moment.` });

    try {
      const data = await backendPost('/api/contracts/analyze', wallet || contractAddress, {
        contractAddress, chainId: 11155111, userAddress: wallet || contractAddress,
      });
      if (!data.success) { await callback({ text: `❌ Analysis failed: ${data.error}` }); return { success: false, text: 'Analysis failed' }; }
      const r = data.data;
      const emoji: Record<string, string> = { LOW: '🟢', MEDIUM: '🟡', HIGH: '🟠', CRITICAL: '🔴' };
      const response = `${emoji[r.severity] ?? '⚪'} **Contract Analysis**\n\n📍 \`${addr(contractAddress)}\`\n🎯 Risk: **${r.riskScore}/100** (${r.severity})\n🚨 Findings: **${r.findingsCount ?? 0}**\n\n${r.aiAnalysis?.verdict ?? ''}\n${r.aiAnalysis?.explanation?.substring(0, 300) ?? ''}`;
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('ANALYZE_CONTRACT error:', err);
      await callback({ text: '❌ Contract analysis failed.' });
      return { success: false, text: 'Analysis failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Analyze contract 0x71C7656EC7ab88b098defB751B7401B5f6d8976F' } },
    { name: 'ChainPilot AI', content: { text: '🟢 **Contract Analysis**\nRisk: 15/100 (LOW)\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: ASSESS_RISK
// ─────────────────────────────────────────────────────────────────────────────
const assessRiskAction: Action = {
  name: 'ASSESS_RISK',
  similes: ['CHECK_RISK', 'SECURITY_CHECK', 'IS_SAFE', 'ADDRESS_REPUTATION', 'SCAM_CHECK'],
  description: 'Performs a security risk assessment on an address.',

  validate: async (_rt, message) => /risk|safe|scam|reputation|trust|malicious|legit|check.*address/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    const text = cleanText(message.content.text ?? '');
    const addrMatch = text.match(/0x[a-fA-F0-9]{40}/);
    if (!addrMatch) { await callback({ text: '❓ Provide an address to check. Example: _"Is 0x1234... safe?"_' }); return { success: false, text: 'No address' }; }
    const targetAddress = addrMatch[0];

    try {
      const data = await backendPost('/api/security/assess-risk', wallet || targetAddress, { address: targetAddress, amount: '0', token: 'ETH' });
      const r = data.data;
      if (!data.success || !r) { await callback({ text: `⚠️ Could not assess \`${addr(targetAddress)}\`.` }); return { success: false, text: 'Risk unavailable' }; }
      const emoji: Record<string, string> = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };
      const response = `${emoji[(r.overallRisk ?? '').toLowerCase()] ?? '⚪'} **Risk Assessment: \`${addr(targetAddress)}\`**\n\nRisk: **${r.overallRisk ?? 'Unknown'}**\n${r.riskScore !== undefined ? `Score: **${r.riskScore}/100**\n` : ''}${r.flags?.length ? '\n⚠️ Flags:\n' + r.flags.map((f: string) => `  • ${f}`).join('\n') : ''}${r.recommendation ? '\n\n💡 ' + r.recommendation : ''}`;
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('ASSESS_RISK error:', err);
      await callback({ text: '❌ Risk assessment failed.' });
      return { success: false, text: 'Risk failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Is 0x71C7656EC7ab88b098defB751B7401B5f6d8976F safe?' } },
    { name: 'ChainPilot AI', content: { text: '🟢 **Risk Assessment**\nRisk: **Low**\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: PREPARE_TRANSFER
// ─────────────────────────────────────────────────────────────────────────────
const prepareTransferAction: Action = {
  name: 'PREPARE_TRANSFER',
  similes: ['SEND_ETH', 'TRANSFER_TOKEN', 'SEND_TOKEN', 'TRANSFER_ETH', 'PAY', 'SEND_FUNDS'],
  description: 'Prepares a token transfer — resolves recipient and returns confirmation details.',

  validate: async (_rt, message) => /(?:send|transfer|pay)\s+[\d.]+|send.*eth.*to|transfer.*to/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    const text = cleanText(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }

    const amountMatch = text.match(/(?:send|transfer|pay)\s+([\d.]+)\s*(\w+)?/i);
    const amount = amountMatch?.[1];
    const token = (amountMatch?.[2] ?? 'ETH').toUpperCase();

    const addrMatch = text.match(/to\s+(0x[a-fA-F0-9]{40})/i);
    let recipientAddress = addrMatch?.[1];

    if (!recipientAddress) {
      const nameMatch = text.match(/to\s+([A-Za-z][A-Za-z0-9\s]{0,20}?)(?:\s*$)/i);
      const recipientName = nameMatch?.[1]?.trim();
      if (recipientName) {
        try {
          const contacts = await backendGet('/api/chat/contacts', wallet);
          const match = (contacts.data ?? []).find((c: any) => c.name?.toLowerCase().startsWith(recipientName.toLowerCase()));
          if (match) recipientAddress = match.address;
        } catch { /* ignore */ }
      }
    }

    if (!amount) { await callback({ text: '❓ Specify an amount. Example: _"Send 0.5 ETH to 0x1234..."_' }); return { success: false, text: 'No amount' }; }
    if (!recipientAddress) { await callback({ text: `❓ Could not find recipient. Use a wallet address or saved contact name.` }); return { success: false, text: 'No recipient' }; }

    const response = `📤 **Transfer Ready for Confirmation**\n\nAmount: **${amount} ${token}**\nTo: \`${addr(recipientAddress)}\`\nFrom: \`${addr(wallet)}\`\n\n⚠️ Confirm in your wallet — the transfer will be signed by your connected wallet (MetaMask / Privy).`;
    await callback({ text: response, actions: ['PREPARE_TRANSFER'] });
    return { success: true, text: response, values: { amount, token, recipient: recipientAddress, from: wallet } };
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Send 0.5 ETH to 0x71C7656EC7ab88b098defB751B7401B5f6d8976F' } },
    { name: 'ChainPilot AI', content: { text: '📤 **Transfer Ready**\nAmount: **0.5 ETH**\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: SHOW_NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const showNotificationsAction: Action = {
  name: 'SHOW_NOTIFICATIONS',
  similes: ['GET_NOTIFICATIONS', 'MY_ALERTS', 'LIST_NOTIFICATIONS'],
  description: "Shows the user's recent notifications.",

  validate: async (_rt, message) => /notifications?|alerts?|updates?/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }
    try {
      const data = await backendGet('/api/notifications?page=1&limit=10', wallet);
      const notes: any[] = data.data ?? [];
      if (!notes.length) { await callback({ text: '🔔 No notifications yet.' }); return { success: true, text: 'No notifications' }; }
      const unread = notes.filter(n => !n.read).length;
      let response = `🔔 **Notifications** (${unread} unread)\n\n`;
      notes.slice(0, 8).forEach((n: any) => {
        response += `${n.read ? '○' : '●'} **${n.title}** — ${n.message} _(${new Date(n.createdAt).toLocaleDateString()})_\n`;
      });
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('SHOW_NOTIFICATIONS error:', err);
      await callback({ text: '❌ Failed to load notifications.' });
      return { success: false, text: 'Notifications failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Show my notifications' } },
    { name: 'ChainPilot AI', content: { text: '🔔 **Notifications** (2 unread)\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: SCAN_ANOMALIES
// ─────────────────────────────────────────────────────────────────────────────
const scanAnomaliesAction: Action = {
  name: 'SCAN_ANOMALIES',
  similes: ['CHECK_ANOMALIES', 'DETECT_ANOMALIES', 'SECURITY_SCAN', 'CHECK_SUSPICIOUS', 'ANOMALY_REPORT'],
  description: 'Runs a proactive anomaly scan on the wallet and returns detected threats.',

  validate: async (_rt, message) => /anomal|suspicious|threat|security scan|scan.*wallet|detect.*unusual|unusual.*activity|hack|compromised/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }
    await callback({ text: '🔎 Running anomaly scan on your wallet... please wait.' });
    try {
      const data = await backendPost('/api/anomaly/scan', wallet, { walletAddress: wallet });
      if (!data.success) { await callback({ text: `❌ Scan failed: ${data.error}` }); return { success: false, text: 'Scan failed' }; }
      const r = data.data;
      const riskEmoji: Record<string, string> = { SAFE: '✅', LOW: '🟡', MEDIUM: '🟠', HIGH: '🔴', CRITICAL: '🚨' };
      const anomalies: any[] = r.anomalies ?? [];
      let response = `${riskEmoji[r.overallRisk] ?? '⚪'} **Anomaly Scan Complete**\n\nOverall Risk: **${r.overallRisk}**\nDetected: **${anomalies.length}** anomal${anomalies.length === 1 ? 'y' : 'ies'}\n`;
      if (anomalies.length) {
        response += '\n**Findings:**\n';
        anomalies.slice(0, 5).forEach((a: any) => {
          const sev: Record<string, string> = { low: '🟡', medium: '🟠', high: '🔴', critical: '🚨' };
          response += `${sev[a.severity?.toLowerCase()] ?? '⚪'} **${a.title}** (${a.severity})\n   ${a.description}\n`;
        });
      } else {
        response += '\n✨ No suspicious activity detected. Your wallet looks clean!';
      }
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('SCAN_ANOMALIES error:', err);
      await callback({ text: '❌ Anomaly scan failed.' });
      return { success: false, text: 'Scan failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Scan my wallet for anomalies' } },
    { name: 'ChainPilot AI', content: { text: '✅ **Anomaly Scan Complete**\nOverall Risk: SAFE\n✨ No suspicious activity detected.' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: MULTICHAIN_BALANCE
// ─────────────────────────────────────────────────────────────────────────────
const multiChainBalanceAction: Action = {
  name: 'MULTICHAIN_BALANCE',
  similes: ['CROSS_CHAIN_BALANCE', 'ALL_CHAIN_BALANCE', 'BALANCE_ALL_CHAINS', 'MULTICHAIN_PORTFOLIO'],
  description: 'Fetches wallet balance across all supported blockchain networks.',

  validate: async (_rt, message) => /multi.?chain|cross.?chain|all chains?|balance.*chains?|chains?.*balance|polygon|arbitrum|optimism|base.*balance|binance/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }
    await callback({ text: '🌐 Fetching balances across all supported chains...' });
    try {
      const data = await backendPost('/api/multichain/balances', wallet, { address: wallet });
      if (!data.success) { await callback({ text: `❌ Failed to fetch multi-chain balances.` }); return { success: false, text: 'Multichain failed' }; }
      const balances: any[] = data.data ?? [];
      const active = balances.filter((b: any) => parseFloat(b.balance) > 0);
      let response = `🌐 **Multi-Chain Portfolio**\n\nAddress: \`${addr(wallet)}\`\n\n`;
      if (!active.length) {
        response += '📭 Zero balance detected on all monitored chains.';
      } else {
        response += `**Active Chains (${active.length}):**\n`;
        active.forEach((b: any) => {
          response += `• **${b.chainName}** — ${parseFloat(b.balance).toFixed(6)} ${b.symbol}\n`;
        });
      }
      const zero = balances.filter((b: any) => parseFloat(b.balance) === 0);
      if (zero.length) response += `\n_Zero balance on: ${zero.map((b: any) => b.chainName).join(', ')}_`;
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('MULTICHAIN_BALANCE error:', err);
      await callback({ text: '❌ Multi-chain balance check failed.' });
      return { success: false, text: 'Multichain failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: "What's my balance across all chains?" } },
    { name: 'ChainPilot AI', content: { text: '🌐 **Multi-Chain Portfolio**\n• Sepolia — 40.452 ETH\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: SHOW_POLICIES
// ─────────────────────────────────────────────────────────────────────────────
const showPoliciesAction: Action = {
  name: 'SHOW_POLICIES',
  similes: ['LIST_POLICIES', 'MY_POLICIES', 'VIEW_POLICIES', 'SECURITY_RULES', 'MY_RULES'],
  description: "Lists the user's active security policies.",

  validate: async (_rt, message) => /policies|policy|rules?|security rules?|spending limit|whitelist|block transactions?/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }
    try {
      const data = await backendGet(`/api/policies?wallet=${wallet}`, wallet);
      const policies: any[] = data.data ?? [];
      if (!policies.length) {
        await callback({ text: '🛡️ No security policies set.\n\nCreate one with: _"Create a policy that blocks transactions over 1 ETH"_' });
        return { success: true, text: 'No policies' };
      }
      let response = `🛡️ **Security Policies** (${policies.length})\n\n`;
      policies.forEach((p: any, i: number) => {
        const status = p.enabled ? '✅' : '⏸️';
        response += `${i + 1}. ${status} **${p.name}**\n   ${p.rules?.length ?? 0} rule(s) — ${p.description || 'No description'}\n`;
      });
      await callback({ text: response });
      return { success: true, text: response };
    } catch (err: any) {
      logger.error('SHOW_POLICIES error:', err);
      await callback({ text: '❌ Failed to load policies.' });
      return { success: false, text: 'Policies failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Show my security policies' } },
    { name: 'ChainPilot AI', content: { text: '🛡️ **Security Policies** (2)\n1. ✅ **Daily Limit**\n...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: CREATE_POLICY (Natural Language)
// ─────────────────────────────────────────────────────────────────────────────
const createPolicyAction: Action = {
  name: 'CREATE_POLICY',
  similes: ['NEW_POLICY', 'ADD_POLICY', 'SET_RULE', 'ADD_RULE', 'SET_LIMIT'],
  description: 'Creates a security policy from natural language (e.g., block transactions over 1 ETH).',

  validate: async (_rt, message) => /create.*policy|add.*policy|set.*(?:limit|rule|policy)|block.*transactions?.*over|alert.*transfers?|whitelist.*only|require.*cooldown|new.*security.*rule/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    const text = cleanText(message.content.text ?? '');
    if (!wallet) { await callback({ text: '⚠️ No wallet connected.' }); return { success: false, text: 'No wallet' }; }

    // Natural language → policy rule inference
    let ruleType = 'MAX_TRANSACTION_VALUE';
    let params: Record<string, any> = {};
    let action = 'ALERT';
    let policyName = 'Custom Policy';

    // Detect rule type from NL
    if (/block|deny/i.test(text)) action = 'BLOCK';

    const valueMatch = text.match(/([\d.]+)\s*(eth|matic|bnb|usdc)?/i);
    const value = valueMatch ? parseFloat(valueMatch[1]) : 1;

    if (/daily.*limit|limit.*daily|spend.*per.*day/i.test(text)) {
      ruleType = 'DAILY_SPEND_LIMIT';
      params = { limitEth: value };
      policyName = `Daily Spend Limit (${value} ETH)`;
    } else if (/whitelist|only.*allow|allow.*only/i.test(text)) {
      ruleType = 'WHITELIST_ONLY';
      params = {};
      policyName = 'Whitelist Only';
    } else if (/cooldown|cool.?down|wait.*between/i.test(text)) {
      ruleType = 'REQUIRE_COOL_DOWN';
      params = { cooldownMinutes: value || 60 };
      policyName = `${value || 60}-minute Cooldown`;
    } else if (/new.*address|alert.*new|unknown.*address/i.test(text)) {
      ruleType = 'ALERT_NEW_ADDRESS';
      params = {};
      policyName = 'Alert on New Address';
    } else if (/contract|unverified|unknown.*contract/i.test(text)) {
      ruleType = 'BLOCK_UNVERIFIED_CONTRACTS';
      params = {};
      policyName = 'Block Unverified Contracts';
      action = 'BLOCK';
    } else {
      // Default: max transaction value
      params = { maxEth: value };
      policyName = `Max ${value} ETH per Transaction`;
    }

    try {
      const data = await backendPost('/api/policies', wallet, {
        walletAddress: wallet,
        name: policyName,
        description: `Auto-created from: "${text.substring(0, 80)}"`,
        enabled: true,
        rules: [{ type: ruleType, enabled: true, params, action, notifyVia: ['email'] }],
      });
      if (data.success) {
        await callback({ text: `✅ **Policy Created: ${policyName}**\n\nRule: **${ruleType}**\nAction: **${action}**\n\nSay _"Show my policies"_ to view all policies.` });
        return { success: true, text: `Policy created: ${policyName}` };
      }
      await callback({ text: `❌ Could not create policy: ${data.error}` });
      return { success: false, text: data.error };
    } catch (err: any) {
      logger.error('CREATE_POLICY error:', err);
      await callback({ text: '❌ Failed to create policy.' });
      return { success: false, text: 'Policy create failed' };
    }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Block all transactions over 2 ETH' } },
    { name: 'ChainPilot AI', content: { text: '✅ **Policy Created: Max 2 ETH per Transaction**\nRule: MAX_TRANSACTION_VALUE\nAction: BLOCK' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: DEFI_STRATEGY_INFO
// ─────────────────────────────────────────────────────────────────────────────
const defiStrategyAction: Action = {
  name: 'DEFI_STRATEGY_INFO',
  similes: ['YIELD_FARMING', 'LIQUIDITY_INFO', 'DeFi_STRATEGIES', 'STAKING_OPTIONS', 'BEST_YIELD', 'APY_INFO'],
  description: 'Provides DeFi strategy information: yield farming, staking, liquidity pools, and arbitrage.',

  validate: async (_rt, message) => /yield|apy|apr|liquidity.*pool|defi|staking|stake|farming|earn.*crypto|interest|lp.*pool|uniswap|aave|compound|arbitrage|swap.*opportunities|best.*returns?/i.test(message.content.text ?? ''),

  handler: async (_rt, message, _state, _opts, callback): Promise<ActionResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    const text = cleanText(message.content.text ?? '').toLowerCase();

    // Determine which DeFi topic to address
    let response = '';

    if (/arbitrage|price diff|spread/i.test(text)) {
      response = `📊 **Arbitrage Opportunities**\n\n` +
        `Arbitrage involves buying an asset on one exchange where it's cheaper and selling on another where it's more expensive.\n\n` +
        `**Common strategies:**\n` +
        `• **DEX Arbitrage**: Price differentials between Uniswap, SushiSwap, Curve\n` +
        `• **Cross-chain Arbitrage**: Same token priced differently on ETH vs Polygon vs Arbitrum\n` +
        `• **Triangular Arbitrage**: ETH → USDC → DAI → ETH loops\n\n` +
        `⚠️ **Risks**: Gas costs, front-running bots, MEV, slippage\n` +
        `🛠️ **Tools**: Flashbots, MEV-Boost, 1inch aggregator\n\n` +
        `💡 I can analyze your wallet for cross-chain imbalances. Say _"Check my multichain balance"_.`;
    } else if (/staking|stake/i.test(text)) {
      response = `🥩 **Staking Options**\n\n` +
        `**Ethereum Staking:**\n` +
        `• Native ETH staking: ~3.5–4.5% APY (32 ETH minimum or use Lido/RocketPool)\n` +
        `• Lido stETH: ~3.8% APY, liquid, no minimum\n` +
        `• RocketPool rETH: ~3.5% APY, decentralized\n\n` +
        `**Stablecoin Staking:**\n` +
        `• Aave USDC supply: ~4–8% APY\n` +
        `• Compound USDT: ~3–6% APY\n\n` +
        `**DeFi Staking:**\n` +
        `• Uniswap LP tokens: Variable APY (5–100%+, carries impermanent loss)\n` +
        `• Curve pools: ~2–15% APY, lower impermanent loss risk\n\n` +
        `⚠️ Always verify current rates at defillama.com`;
    } else if (/yield|farming|apy|apr|earn/i.test(text)) {
      response = `🌾 **Yield Farming Strategies**\n\n` +
        `**Conservative (Low Risk):**\n` +
        `• Aave/Compound lending: 3–8% APY on stablecoins\n` +
        `• Curve 3pool (DAI/USDC/USDT): 2–5% APY + CRV rewards\n\n` +
        `**Moderate Risk:**\n` +
        `• Uniswap v3 ETH/USDC concentrated liquidity: 15–40% APY\n` +
        `• Convex Finance on Curve: Boosted CRV + CVX rewards\n\n` +
        `**High Risk / High Reward:**\n` +
        `• New protocol LPs with high emission rewards\n` +
        `• Leveraged yield farming (Alpaca, Gearbox)\n\n` +
        `📊 Track live yields at **DeFiLlama** (defillama.com)\n` +
        `⚠️ Risks: Smart contract bugs, impermanent loss, rug pulls`;
    } else if (/liquidity|lp|pool/i.test(text)) {
      response = `💧 **Liquidity Pool Guide**\n\n` +
        `**How LP works:**\n` +
        `Deposit 2 equal-value tokens → receive LP tokens → earn trading fees\n\n` +
        `**Top Pools by TVL:**\n` +
        `• Uniswap v3 ETH/USDC — fees: 0.05%, ~$1.2B TVL\n` +
        `• Curve 3pool — fees: 0.04%, very stable\n` +
        `• Balancer wBTC/ETH/USDC — weighted pools, lower IL\n\n` +
        `**Impermanent Loss:**\n` +
        `If ETH doubles in price, you lose ~5.7% vs just holding.\n` +
        `• 2x price move = 5.7% IL\n• 4x price move = 20% IL\n\n` +
        `💡 Stablecoin pairs (USDC/DAI) have near-zero IL\n` +
        `🔧 Use Uniswap v3's concentrated liquidity for higher capital efficiency`;
    } else {
      // General DeFi overview
      response = `📚 **DeFi Strategy Overview**\n\n` +
        `Here are the main DeFi strategies from lowest to highest risk:\n\n` +
        `1. 💰 **Lending** (1–8% APY)\n   Aave, Compound — deposit tokens, earn interest, no price risk\n\n` +
        `2. 🥩 **Staking** (3–15% APY)\n   ETH validators, Lido, RocketPool — secure the network, earn rewards\n\n` +
        `3. 💧 **Liquidity Pools** (5–50%+ APY)\n   Uniswap, Curve — earn trading fees, beware impermanent loss\n\n` +
        `4. 🌾 **Yield Farming** (10–200%+ APY)\n   Protocol incentives, auto-compounding, higher risk\n\n` +
        `5. 📊 **Arbitrage** (variable)\n   Exploit price differences, requires speed & capital\n\n` +
        `Ask me about any specific strategy:\n` +
        `_"Show staking options"_ | _"Explain yield farming"_ | _"Explain liquidity pools"_ | _"Show arbitrage opportunities"_`;
    }

    await callback({ text: response });
    return { success: true, text: response };
  },
  examples: [[
    { name: '{{user}}', content: { text: 'What are the best yield farming strategies?' } },
    { name: 'ChainPilot AI', content: { text: '🌾 **Yield Farming Strategies**\n\n**Conservative:** Aave/Compound 3–8% APY...' } },
  ], [
    { name: '{{user}}', content: { text: 'Explain staking options' } },
    { name: 'ChainPilot AI', content: { text: '🥩 **Staking Options**\n\n**Ethereum Staking:** ~3.5–4.5% APY...' } },
  ]],
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER: WALLET_CONTEXT
// Injects live blockchain data into the LLM context for every message.
// This ensures the LLM always has fresh, accurate data to include in responses.
// ─────────────────────────────────────────────────────────────────────────────
const walletContextProvider: Provider = {
  name: 'WALLET_CONTEXT',
  description: 'Provides real-time wallet balance and recent transactions from the blockchain.',
  position: -10, // run early so data is available

  get: async (_rt: IAgentRuntime, message: Memory, _state: State): Promise<ProviderResult> => {
    const wallet = extractWallet(message.content.text ?? '');
    if (!wallet) {
      return { text: '', values: {}, data: {} };
    }

    let balanceText = '';
    let historyText = '';
    let analyticsText = '';

    try {
      // 1. Fetch ETH balance directly from RPC
      const rpcUrls = [
        'https://ethereum-sepolia-rpc.publicnode.com',
        'https://sepolia.drpc.org',
        'https://rpc.ankr.com/eth_sepolia',
      ];
      let ethBalance = '';
      for (const rpcUrl of rpcUrls) {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 8000);
          const rpcRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [wallet, 'latest'], id: 1 }),
            signal: controller.signal,
          });
          clearTimeout(t);
          const rpcData = await rpcRes.json();
          if (rpcData.result) {
            const wei = BigInt(rpcData.result);
            ethBalance = (Number(wei) / 1e18).toFixed(6);
            break;
          }
        } catch {
          // try next RPC
        }
      }
      if (ethBalance) {
        balanceText = `## Wallet Balance\n- Address: \`${wallet}\`\n- ETH Balance: **${ethBalance} ETH** (live from Sepolia testnet)`;
      }
    } catch {
      // continue without balance
    }

    try {
      // 2. Fetch recent transactions from backend
      const data = await backendGet('/api/analytics/transaction-history?page=1&limit=5', wallet);
      const txs: any[] = data.data ?? [];
      if (txs.length) {
        historyText = `## Recent Transactions (last ${txs.length})\n` +
          txs.map((tx: any, i: number) => {
            const dir = tx.from?.toLowerCase() === wallet.toLowerCase() ? 'Sent' : 'Received';
            return `${i + 1}. ${dir} ${parseFloat(tx.amount).toFixed(4)} ${tx.token} → ${addr(tx.to)} on ${new Date(tx.createdAt).toLocaleDateString()} (${tx.status})`;
          }).join('\n');
      } else {
        historyText = '## Recent Transactions\nNo transactions yet.';
      }
    } catch {
      // continue
    }

    try {
      // 3. Quick analytics summary
      const stats = await backendGet('/api/analytics/stats', wallet);
      if (stats.totalTransactions !== undefined) {
        analyticsText = `## Analytics Summary\n- Total transactions: ${stats.totalTransactions}\n- Total sent: ${stats.totalSent} ETH\n- Total received: ${stats.totalReceived} ETH`;
      }
    } catch {
      // continue
    }

    const text = [balanceText, historyText, analyticsText].filter(Boolean).join('\n\n');

    return {
      text: text ? `# Live Wallet Data for ${addr(wallet)}\n\n${text}` : '',
      values: {
        walletAddress: wallet,
        ethBalance: balanceText,
      },
      data: { wallet },
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const chainPilotPlugin: Plugin = {
  name: 'chainpilot',
  description: 'ChainPilot AI — real blockchain actions: balance, transactions, contacts, teams, security, analytics, anomaly detection, multi-chain, policies & DeFi strategies.',
  priority: 100,

  // Explicitly register the wallet context provider during init so it's guaranteed to be in the runtime
  async init(_config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    logger.info('*** ChainPilot plugin init — registering WALLET_CONTEXT provider ***');
    runtime.registerProvider(walletContextProvider);
    logger.info('*** WALLET_CONTEXT provider registered ***');
  },

  providers: [walletContextProvider],
  actions: [
    checkBalanceAction,
    showHistoryAction,
    showAnalyticsAction,
    showContactsAction,
    addContactAction,
    showTeamsAction,
    createTeamAction,
    analyzeContractAction,
    assessRiskAction,
    prepareTransferAction,
    showNotificationsAction,
    // New Feature Actions
    scanAnomaliesAction,
    multiChainBalanceAction,
    showPoliciesAction,
    createPolicyAction,
    defiStrategyAction,
  ],
};


export default chainPilotPlugin;
