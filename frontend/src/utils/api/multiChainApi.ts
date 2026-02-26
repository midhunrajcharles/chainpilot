import { BaseApiClient } from './base';
import { ApiResponse } from '@/types/api';

export interface ChainInfo {
  chainId: number;
  name: string;
  shortName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorerUrl: string;
  isTestnet: boolean;
  logoColor: string;
}

export interface ChainBalance {
  chainId: number;
  chainName: string;
  symbol: string;
  balance: string;
  balanceWei: string;
  error?: string;
}

export class MultiChainApiClient extends BaseApiClient {
  static async getChains(): Promise<ApiResponse<ChainInfo[]>> {
    return this.get<ChainInfo[]>('/multichain/chains', '');
  }

  static async getBalance(
    walletAddress: string,
    chainId: number
  ): Promise<ApiResponse<ChainBalance>> {
    return this.post<ChainBalance>('/multichain/balance', walletAddress, {
      address: walletAddress,
      chainId,
    });
  }

  static async getAllBalances(
    walletAddress: string,
    chainIds?: number[]
  ): Promise<ApiResponse<ChainBalance[]>> {
    return this.post<ChainBalance[]>('/multichain/balances', walletAddress, {
      address: walletAddress,
      ...(chainIds ? { chainIds } : {}),
    });
  }

  static getExplorerUrl(chainId: number, address: string): string {
    return `/api/multichain/explorer/${chainId}/${address}`;
  }
}
