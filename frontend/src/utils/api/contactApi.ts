import { BaseApiClient } from './base';
import { Contact, ApiResponse } from '@/types/api';

export class ContactApiClient extends BaseApiClient {
  static async getContacts(walletAddress: string): Promise<ApiResponse<Contact[]>> {
    return this.get<Contact[]>('/contacts', walletAddress);
  }

  static async addContact(
    walletAddress: string, 
    data: { name: string; address: string; group?: string }
  ): Promise<ApiResponse<Contact>> {
    return this.post<Contact>('/contacts', walletAddress, data);
  }

  static async updateContact(
    walletAddress: string, 
    contactId: string, 
    data: { name?: string; address?: string; group?: string }
  ): Promise<ApiResponse<Contact>> {
    return this.put<Contact>(`/contacts/${contactId}`, walletAddress, data);
  }

  static async deleteContact(walletAddress: string, contactId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/contacts/${contactId}`, walletAddress);
  }

  static async verifyContact(
    walletAddress: string, 
    address: string
  ): Promise<ApiResponse<{ isValid: boolean; message: string }>> {
    return this.post<{ isValid: boolean; message: string }>('/contacts/verify', walletAddress, { address });
  }

  static async getContactGroups(walletAddress: string): Promise<ApiResponse<string[]>> {
    return this.get<string[]>('/contacts/groups', walletAddress);
  }

  static async getContactSuggestions(
    walletAddress: string, 
    query?: string
  ): Promise<ApiResponse<Contact[]>> {
    const params = query ? { query } : undefined;
    return this.get<Contact[]>('/contacts/suggestions', walletAddress, params);
  }
}
