import { GoogleGenAI } from '@google/genai';
import { executeJulesTool, geminiJulesTools } from './tools';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export class GeminiClient {
  private ai: GoogleGenAI;
  private julesApiKey: string;

  constructor(apiKey: string, julesApiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.julesApiKey = julesApiKey;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async sendMessage(messages: ChatMessage[], appendResponse: (msg: string) => void): Promise<string> {
    // Gemini requires the history to start with a user message
    const filteredMessages = messages[0]?.role === 'model' ? messages.slice(1) : messages;

    const history = filteredMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const tools = [{
      functionDeclarations: geminiJulesTools
    }];

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: history,
        config: {
          tools,
          systemInstruction: 'You are a helpful coding assistant. You can use the Jules API to manage sessions and fix bugs for the user.',
        },
      });

      let finalContent = "";

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.functionCall) {
          const fnName = part.functionCall.name || "unknown";
          const fnArgs = part.functionCall.args;

          appendResponse(`\n*Calling tool ${fnName}...*\n`);

          try {
            const result = await executeJulesTool(this.julesApiKey, fnName, fnArgs);
            appendResponse(`*Tool ${fnName} completed successfully.*\n`);

            // Send the tool result back to Gemini to get a final response
            const continuationResponse = await this.ai.models.generateContent({
               model: 'gemini-2.5-flash',
               contents: [
                 ...history,
                 { role: 'model', parts: [{ functionCall: part.functionCall }] },
                 { role: 'user', parts: [{ functionResponse: { name: fnName, response: result as Record<string, any> } }] }
               ]
            });

            if (continuationResponse.text) {
              finalContent += continuationResponse.text;
            }

          } catch (e: any) {
            appendResponse(`*Tool ${fnName} failed: ${e.message}*\n`);
            finalContent += `Failed to execute ${fnName}: ${e.message}`;
          }
        } else if (part.text) {
          finalContent += part.text;
        }
      }

      return finalContent || response.text || "";

    } catch (e: any) {
       console.error(e);
       throw e;
    }
  }
}
