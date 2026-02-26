/**
 * Multi-Chain Configuration
 * Defines supported EVM chains with RPC endpoints, explorer URLs and metadata.
 * Adding a new chain is as simple as inserting an entry here.
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  shortName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrl: string;
  isTestnet: boolean;
  logoColor: string; // CSS colour for UI badges
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  // ── Testnets ──────────────────────────────────────────────────────────────
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    shortName: 'SEP',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.drpc.org',
      'https://rpc.ankr.com/eth_sepolia',
    ],
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
    logoColor: '#627eea',
  },
  80002: {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    shortName: 'AMOY',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: [
      'https://rpc-amoy.polygon.technology',
      'https://polygon-amoy-bor-rpc.publicnode.com',
    ],
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    isTestnet: true,
    logoColor: '#8247e5',
  },
  97: {
    chainId: 97,
    name: 'BNB Testnet',
    shortName: 'tBNB',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: ['https://bsc-testnet-rpc.publicnode.com'],
    blockExplorerUrl: 'https://testnet.bscscan.com',
    isTestnet: true,
    logoColor: '#f0b90b',
  },

  // ── Mainnets ──────────────────────────────────────────────────────────────
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    shortName: 'ETH',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [
      'https://eth.drpc.org',
      'https://eth.llamarpc.com',
      'https://ethereum-rpc.publicnode.com',
    ],
    blockExplorerUrl: 'https://etherscan.io',
    isTestnet: false,
    logoColor: '#627eea',
  },
  137: {
    chainId: 137,
    name: 'Polygon',
    shortName: 'POL',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com', 'https://polygon-bor-rpc.publicnode.com'],
    blockExplorerUrl: 'https://polygonscan.com',
    isTestnet: false,
    logoColor: '#8247e5',
  },
  56: {
    chainId: 56,
    name: 'BNB Chain',
    shortName: 'BNB',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.binance.org'],
    blockExplorerUrl: 'https://bscscan.com',
    isTestnet: false,
    logoColor: '#f0b90b',
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-one-rpc.publicnode.com'],
    blockExplorerUrl: 'https://arbiscan.io',
    isTestnet: false,
    logoColor: '#28a0f0',
  },
  10: {
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io', 'https://optimism-rpc.publicnode.com'],
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    isTestnet: false,
    logoColor: '#ff0420',
  },
  8453: {
    chainId: 8453,
    name: 'Base',
    shortName: 'BASE',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
    blockExplorerUrl: 'https://basescan.org',
    isTestnet: false,
    logoColor: '#0052ff',
  },
};

export const DEFAULT_CHAIN_ID = 11155111; // Sepolia

export function getChainConfig(chainId: number): ChainConfig {
  return SUPPORTED_CHAINS[chainId] ?? SUPPORTED_CHAINS[DEFAULT_CHAIN_ID];
}

export function getRpcUrl(chainId: number): string {
  return getChainConfig(chainId).rpcUrls[0];
}

export function getAllChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS);
}

export function getTestnetChains(): ChainConfig[] {
  return getAllChains().filter((c) => c.isTestnet);
}

export function getMainnetChains(): ChainConfig[] {
  return getAllChains().filter((c) => !c.isTestnet);
}
