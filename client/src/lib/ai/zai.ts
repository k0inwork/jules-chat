import OpenAI from 'openai';
import { executeJulesTool, julesTools } from './tools';
import { ChatMessage } from './gemini';

export class ZAiClient {
  private openai: OpenAI;
  private julesApiKey: string;

  constructor(apiKey: string, julesApiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.z.ai/api/coding/paas/v4',
      dangerouslyAllowBrowser: true // This is required for calling OpenAI from the client-side
    });
    this.julesApiKey = julesApiKey;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.openai.chat.completions.create({
        model: 'glm-4.7',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      });
      return true;
    } catch {
      return false;
    }
  }

  async sendMessage(messages: ChatMessage[], appendResponse: (msg: string) => void): Promise<string> {
    const openaiMessages: any[] = messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.content
    }));

    try {
      const response = await this.openai.chat.completions.create({
        model: 'glm-4.7',
        messages: openaiMessages,
        tools: julesTools as any,
        tool_choice: 'auto'
      });

      const choice = response.choices[0];
      const message = choice.message;
      let finalContent = message.content || "";

      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolResponses: any[] = [];
        for (const toolCall of message.tool_calls) {
          const fnName = (toolCall as any).function.name;
          const fnArgs = JSON.parse((toolCall as any).function.arguments);

          appendResponse(`\n*Calling tool ${fnName}...*\n`);

          try {
            const result = await executeJulesTool(this.julesApiKey, fnName, fnArgs);
            appendResponse(`*Tool ${fnName} completed successfully.*\n`);
            toolResponses.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (e: any) {
            appendResponse(`*Tool ${fnName} failed: ${e.message}*\n`);
            toolResponses.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${e.message}`
            });
          }
        }

        // Send back all results to the model
        const toolResponse = await this.openai.chat.completions.create({
          model: 'glm-4.7',
          messages: [
            ...openaiMessages,
            message,
            ...toolResponses
          ]
        });

        if (toolResponse.choices[0].message.content) {
           finalContent += toolResponse.choices[0].message.content;
        }
      }

      return finalContent;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }
}