import { BaseApiClient } from './base';
import { Team, ApiResponse } from '@/types/api';

export class TeamApiClient extends BaseApiClient {
  static async getTeams(walletAddress: string): Promise<ApiResponse<Team[]>> {
    return this.get<Team[]>('/teams', walletAddress);
  }

  static async createTeam(
    walletAddress: string, 
    data: { 
      name: string; 
      description?: string; 
      members?: Array<{ walletAddress: string; name: string }> 
    }
  ): Promise<ApiResponse<Team>> {
    return this.post<Team>('/teams', walletAddress, data);
  }

  static async updateTeam(
    walletAddress: string, 
    teamId: string, 
    data: { 
      name?: string; 
      description?: string; 
      members?: Array<{ walletAddress: string; name: string }> 
    }
  ): Promise<ApiResponse<Team>> {
    return this.put<Team>(`/teams/${teamId}`, walletAddress, data);
  }

  static async deleteTeam(walletAddress: string, teamId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/teams/${teamId}`, walletAddress);
  }
}
