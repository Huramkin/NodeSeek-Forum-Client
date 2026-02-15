import keytar from 'keytar';
import { ConfigService } from '../services/configService';

export interface CredentialPayload {
  id: string;
  username: string;
  password: string;
  displayName?: string;
}

const SERVICE_NAME = 'NodeSeekDeepFlood';

export class AuthManager {
  constructor(private readonly configService: ConfigService) {}

  private get config() {
    return this.configService.getConfig();
  }

  async saveCredential(payload: CredentialPayload): Promise<void> {
    if (!this.config.security.encryptLocalData) {
      throw new Error('加密已被禁用，無法安全存儲憑證');
    }
    await keytar.setPassword(SERVICE_NAME, payload.id, JSON.stringify(payload));
  }

  async getCredential(accountId: string): Promise<CredentialPayload | null> {
    const result = await keytar.getPassword(SERVICE_NAME, accountId);
    if (!result) {
      return null;
    }
    return JSON.parse(result) as CredentialPayload;
  }

  async deleteCredential(accountId: string): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, accountId);
  }

  async listCredentials(): Promise<CredentialPayload[]> {
    const credentials = await keytar.findCredentials(SERVICE_NAME);
    return credentials.map((entry) => JSON.parse(entry.password));
  }
}
