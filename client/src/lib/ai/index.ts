import { GeminiClient, ChatMessage } from './gemini';
import { ZAiClient } from './zai';
import { executeJulesTool, julesTools } from './tools';

export type AIProvider = 'gemini' | 'zai';

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export interface ToolCallLog {
  id: string;
  timestamp: number;
  provider: AIProvider;
  functionName: string;
  args: any;
  result?: any;
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
}

export type OnToolCallFn = (log: Omit<ToolCallLog, 'id' | 'timestamp'>) => string;
export type OnToolCallCompleteFn = (id: string, updates: Partial<ToolCallLog>) => void;

export class AIClient {
  private provider: AIProvider;
  private julesApiKey: string;
  private geminiKey: string;
  private zaiKey: string;

  constructor(provider: AIProvider, julesApiKey: string, geminiKey: string, zaiKey: string) {
    this.provider = provider;
    this.julesApiKey = julesApiKey;
    this.geminiKey = geminiKey;
    this.zaiKey = zaiKey;
  }

  setProvider(provider: AIProvider) {
    this.provider = provider;
  }

  async sendMessage(
    messages: AIChatMessage[],
    appendResponse: (msg: string) => void,
    onToolCall?: OnToolCallFn,
    onToolCallComplete?: OnToolCallCompleteFn
  ): Promise<string> {
    const rawMessages: ChatMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    if (this.provider === 'gemini') {
      const client = new GeminiClient(this.geminiKey, this.julesApiKey);
      return await client.sendMessage(rawMessages, appendResponse, onToolCall, onToolCallComplete);
    } else {
      const client = new ZAiClient(this.zaiKey, this.julesApiKey);
      return await client.sendMessage(rawMessages, appendResponse, onToolCall, onToolCallComplete);
    }
  }
}
