import OpenAI from 'openai';
import { executeJulesTool, julesTools, parseInlineToolCalls } from './tools';
import { ChatMessage } from './gemini';
import { OnToolCallFn, OnToolCallCompleteFn } from './index';

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

  async sendMessage(
    messages: ChatMessage[],
    appendResponse: (msg: string) => void,
    onToolCall?: OnToolCallFn,
    onToolCallComplete?: OnToolCallCompleteFn
  ): Promise<string> {
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

      // 1. Check for standard JSON tool_calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolResponses: any[] = [];
        for (const toolCall of message.tool_calls) {
          const fnName = (toolCall as any).function.name;
          const fnArgs = JSON.parse((toolCall as any).function.arguments);

          appendResponse(`\n*Calling tool ${fnName}...*\n`);

          let logId: string | undefined;
          if (onToolCall) {
            logId = onToolCall({
              provider: 'zai',
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
            toolResponses.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          } catch (e: any) {
            appendResponse(`*Tool ${fnName} failed: ${e.message}*\n`);
            if (onToolCallComplete && logId) {
              onToolCallComplete(logId, { status: 'error', errorMessage: e.message });
            }
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
      } else if (finalContent) {
        // 2. Fallback: check if the model output a raw <tool_call> string instead of using the API
        const inlineCalls = parseInlineToolCalls(finalContent);
        if (inlineCalls.length > 0) {
          const toolResponses: any[] = [];
          const runId = Date.now();

          for (let i = 0; i < inlineCalls.length; i++) {
            const call = inlineCalls[i];

            // Remove the raw string from the output to not show the ugly XML to the user
            finalContent = finalContent.replace(call.rawText, '');

            const fnName = call.name;
            const fnArgs = call.args;
            const fakeToolCallId = `call_inline_${runId}_${i}`;

            appendResponse(`\n*Calling tool ${fnName}...*\n`);

            let logId: string | undefined;
            if (onToolCall) {
              logId = onToolCall({
                provider: 'zai',
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
              toolResponses.push({
                role: 'tool',
                tool_call_id: fakeToolCallId,
                content: JSON.stringify(result)
              });
            } catch (e: any) {
              appendResponse(`*Tool ${fnName} failed: ${e.message}*\n`);
              if (onToolCallComplete && logId) {
                onToolCallComplete(logId, { status: 'error', errorMessage: e.message });
              }
              toolResponses.push({
                role: 'tool',
                tool_call_id: fakeToolCallId,
                content: `Error: ${e.message}`
              });
            }
          }

          // We need to simulate the message structure for the fake tool calls so the API accepts the tool responses
          const fakeAssistantMessage = {
            role: 'assistant',
            content: finalContent,
            tool_calls: inlineCalls.map((call, i) => ({
              id: `call_inline_${runId}_${i}`,
              type: 'function',
              function: {
                name: call.name,
                arguments: JSON.stringify(call.args)
              }
            }))
          };

          const toolResponse = await this.openai.chat.completions.create({
            model: 'glm-4.7',
            messages: [
              ...openaiMessages,
              fakeAssistantMessage as any,
              ...toolResponses
            ]
          });

          if (toolResponse.choices[0].message.content) {
             finalContent += toolResponse.choices[0].message.content;
          }
        }
      }

      return finalContent;
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }
}