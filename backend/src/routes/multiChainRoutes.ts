/**
 * Multi-Chain Routes
 * GET  /api/multichain/chains           — list all supported chains
 * POST /api/multichain/balance          — fetch native balance on any chain
 * POST /api/multichain/balances         — fetch balances across all (or selected) chains
 * GET  /api/multichain/explorer/:chainId/:address — get explorer URL for address
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { SUPPORTED_CHAINS, getAllChains, getChainConfig } from '../config/chains';

const router = Router();

// Helper: JSON-RPC call with fallback across multiple endpoints
async function rpcCall(rpcUrls: string[], method: string, params: any[]): Promise<any> {
  for (const url of rpcUrls) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
        signal: controller.signal,
      });
      clearTimeout(t);
      const data = await res.json() as any;
      if (data.result !== undefined) return data.result;
    } catch {
      // try next
    }
  }
  return null;
}

// GET /api/multichain/chains
router.get(
  '/chains',
  asyncHandler(async (_req: any, res: any) => {
    const chains = getAllChains().map((c) => ({
      chainId: c.chainId,
      name: c.name,
      shortName: c.shortName,
      symbol: c.nativeCurrency.symbol,
      blockExplorerUrl: c.blockExplorerUrl,
      isTestnet: c.isTestnet,
      logoColor: c.logoColor,
    }));
    res.json({ success: true, data: chains });
  })
);

// POST /api/multichain/balance  { address, chainId }
router.post(
  '/balance',
  asyncHandler(async (req: any, res: any) => {
    const { address, chainId } = req.body;
    if (!address || !chainId) {
      return res.status(400).json({ success: false, error: 'address and chainId are required' });
    }

    const chain = getChainConfig(parseInt(chainId));
    const raw   = await rpcCall(chain.rpcUrls, 'eth_getBalance', [address, 'latest']);

    if (raw === null) {
      return res.json({ success: false, error: 'RPC call failed', balance: '0' });
    }

    const wei     = BigInt(raw);
    const balance = (Number(wei) / 1e18).toFixed(6);

    res.json({
      success: true,
      data: {
        address,
        chainId: chain.chainId,
        chainName: chain.name,
        symbol: chain.nativeCurrency.symbol,
        balance,
        balanceWei: raw,
      },
    });
  })
);

// POST /api/multichain/balances  { address, chainIds?: number[] }
router.post(
  '/balances',
  asyncHandler(async (req: any, res: any) => {
    const { address, chainIds } = req.body;
    if (!address) {
      return res.status(400).json({ success: false, error: 'address is required' });
    }

    const targetChainIds: number[] = Array.isArray(chainIds) && chainIds.length
      ? chainIds.map(Number)
      : Object.keys(SUPPORTED_CHAINS).map(Number);

    const results = await Promise.allSettled(
      targetChainIds.map(async (id) => {
        const chain = getChainConfig(id);
        const raw   = await rpcCall(chain.rpcUrls, 'eth_getBalance', [address, 'latest']);
        const balance = raw !== null ? (Number(BigInt(raw)) / 1e18).toFixed(6) : '0';
        return {
          chainId:   chain.chainId,
          chainName: chain.name,
          shortName: chain.shortName,
          symbol:    chain.nativeCurrency.symbol,
          balance,
          isTestnet: chain.isTestnet,
          logoColor: chain.logoColor,
          explorerUrl: `${chain.blockExplorerUrl}/address/${address}`,
        };
      })
    );

    const data = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const totalNonZero = data.filter((d) => parseFloat(d.balance) > 0).length;

    res.json({ success: true, data, totalNonZero });
  })
);

// GET /api/multichain/explorer/:chainId/:address
router.get(
  '/explorer/:chainId/:address',
  asyncHandler(async (req: any, res: any) => {
    const chainId = parseInt(req.params.chainId);
    const chain   = getChainConfig(chainId);
    const url     = `${chain.blockExplorerUrl}/address/${req.params.address}`;
    res.json({ success: true, data: { url, chainName: chain.name } });
  })
);

export default router;
