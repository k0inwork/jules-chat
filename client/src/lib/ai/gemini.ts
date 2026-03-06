import { GoogleGenAI } from '@google/genai';
import { executeJulesTool, geminiJulesTools } from './tools';
import { OnToolCallFn, OnToolCallCompleteFn } from './index';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

const FALLBACK_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
  'gemini-3-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash'
];

export class GeminiClient {
  private ai: GoogleGenAI;
  private julesApiKey: string;

  constructor(apiKey: string, julesApiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.julesApiKey = julesApiKey;
  }

  async testConnection(): Promise<boolean> {
    for (const model of FALLBACK_MODELS) {
      try {
        await this.ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        });
        return true;
      } catch (e: any) {
        if (e?.status === 429 || e?.message?.includes('quota')) {
          console.warn(`[GeminiClient] Quota exceeded for model ${model}, trying next...`);
          continue;
        }
        // If it's another type of error, we can still try the next model just in case,
        // or return false if we know it's a fatal error like invalid API key.
        // For now, let's keep it simple and try next on any error to be robust.
        console.warn(`[GeminiClient] Error testing model ${model}:`, e);
      }
    }
    return false;
  }

  async sendMessage(
    messages: ChatMessage[],
    appendResponse: (msg: string) => void,
    onToolCall?: OnToolCallFn,
    onToolCallComplete?: OnToolCallCompleteFn
  ): Promise<string> {
    // Gemini requires the history to start with a user message
    const filteredMessages = messages[0]?.role === 'model' ? messages.slice(1) : messages;

    const history = filteredMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const tools = [{
      functionDeclarations: geminiJulesTools
    }];

    let lastError: any;

    for (const model of FALLBACK_MODELS) {
      try {
        const response = await this.ai.models.generateContent({
          model,
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

          let logId: string | undefined;
          if (onToolCall) {
            logId = onToolCall({
              provider: 'gemini',
              functionName: fnName,
              args: fnArgs,
              status: 'pending'
            });
          }

          try {
            const result = await executeJulesTool(this.julesApiKey, fnName, fnArgs);
            appendResponse(`*Tool ${fnName} completed successfully.*\n`);
            if (onToolCallComplete && logId) {
              onToolCallComplete(logId, { status: 'success', result });
            }

              // Send the tool result back to Gemini to get a final response
              const continuationResponse = await this.ai.models.generateContent({
                 model,
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
              if (onToolCallComplete && logId) {
                onToolCallComplete(logId, { status: 'error', errorMessage: e.message });
              }
              finalContent += `Failed to execute ${fnName}: ${e.message}`;
            }
          } else if (part.text) {
            finalContent += part.text;
          }
        }

        return finalContent || response.text || "";

      } catch (e: any) {
        lastError = e;
        if (e?.status === 429 || e?.message?.includes('quota') || e?.message?.includes('429')) {
          const warnMsg = `\n*[GeminiClient] Quota exceeded for model ${model}, trying next...*\n`;
          console.warn(warnMsg);
          appendResponse(warnMsg);
          continue;
        }
        // If it's a completely different error, we should probably still try the next model just in case it's a model-specific issue (like preview model not available).
        const errMsg = `\n*[GeminiClient] Error with model ${model}, trying next...*\n`;
        console.warn(errMsg, e);
        appendResponse(errMsg);
      }
    }

    console.error("[GeminiClient] All fallback models failed. Last error:", lastError);
    throw lastError;
  }
}
