import OpenAI from 'openai';
import { executeJulesTool, julesTools } from './tools';
import { ChatMessage } from './gemini';

export class ZAiClient {
  private openai: OpenAI;
  private julesApiKey: string;
  private model: string;

  constructor(apiKey: string, julesApiKey: string, model: string = 'glm-5') {
    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.z.ai/api/coding/paas/v4',
      dangerouslyAllowBrowser: true // This is required for calling OpenAI from the client-side
    });
    this.julesApiKey = julesApiKey;
    this.model = model;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.openai.chat.completions.create({
        model: this.model,
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
        model: this.model,
        messages: openaiMessages,
        tools: julesTools as any,
        tool_choice: 'auto'
      });

      const choice = response.choices[0];
      const message = choice.message;
      let finalContent = message.content || "";

      // Check for hallucinated tool calls like `<tool_call>getActivities sessionId=137...`
      const toolCallRegex = /<tool_call>\s*([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s*=\s*"?([^"<\n\r]+)/g;
      const parsedToolCalls: any[] = [];

      finalContent = finalContent.replace(toolCallRegex, (match, fnName, argKey, argValue) => {
         parsedToolCalls.push({
            function: {
               name: fnName,
               arguments: JSON.stringify({ [argKey]: argValue })
            },
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type: 'function'
         });

         return `\n*[Tool Call: ${fnName}]*\n`;
      });

      // Clean up any dangling closing tags left behind by the simpler regex
      finalContent = finalContent.replace(/<\/tool_call>|<\/arg_value>/g, '');

      const allToolCalls = [
        ...(message.tool_calls || []),
        ...parsedToolCalls
      ];

      if (allToolCalls.length > 0) {
        const toolResponses: any[] = [];

        // Ensure message content is a string
        const clonedMessage = { ...message, content: finalContent, tool_calls: allToolCalls };

        for (const toolCall of allToolCalls) {
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
          model: this.model,
          messages: [
            ...openaiMessages,
            clonedMessage,
            ...toolResponses
          ]
        });

        if (toolResponse.choices[0].message.content) {
           finalContent += "\n\n" + toolResponse.choices[0].message.content;
        }
      }

      return finalContent;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }
}