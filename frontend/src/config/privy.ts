import { type Chain } from "viem";

// Custom chains for Somnia
export const somniaTestnet: Chain = {
  id: 11155111,
  name: "Sepolia Testnet",
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Sepolia Etherscan",
      url: "https://sepolia.etherscan.io/",
    },
  },
  testnet: true,
};

export const anvil: Chain = {
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  blockExplorers: {
    default: { name: "Anvil Explorer", url: "" },
  },
  testnet: true,
};

export const supportedChains = [somniaTestnet];

// Privy App ID
export const privyAppId = "cmh36ui0r00o8kz0cx6a8tmt1";
