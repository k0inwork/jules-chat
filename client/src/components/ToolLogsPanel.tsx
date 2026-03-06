import { useJules } from '@/contexts/JulesContext';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, XCircle, Loader2, Clock, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ToolLogsPanel() {
  const { toolLogs, isToolLogsOpen, toggleToolLogs } = useJules();

  if (!isToolLogsOpen) return null;

  return (
    <div className="flex flex-col h-full w-[360px] border-l border-border bg-background flex-shrink-0 relative">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-foreground">Debug Tool Logs</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleToolLogs}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        {toolLogs.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground mt-8">
            No tool calls yet in this session.
          </div>
        ) : (
          <div className="space-y-4">
            {toolLogs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "p-3 rounded-lg border text-sm font-mono-code flex flex-col gap-2",
                  log.status === 'success' ? "bg-emerald-500/5 border-emerald-500/20" :
                  log.status === 'error' ? "bg-red-500/5 border-red-500/20" :
                  "bg-muted/30 border-border/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-foreground break-all">
                    {log.functionName}
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-sans tracking-wider">
                      {log.provider}
                    </span>
                  </div>
                  {log.status === 'pending' && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />}
                  {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                  {log.status === 'error' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-sans">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>

                <div className="mt-1">
                  <div className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide font-sans">Arguments</div>
                  <pre className="text-xs bg-black/40 p-2 rounded overflow-x-auto border border-border/50 text-indigo-300">
                    {JSON.stringify(log.args, null, 2)}
                  </pre>
                </div>

                {(log.status === 'success' || log.status === 'error') && (
                  <div className="mt-1">
                    <div className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide font-sans">
                      {log.status === 'success' ? 'Result' : 'Error'}
                    </div>
                    <pre className={cn(
                      "text-xs bg-black/40 p-2 rounded overflow-x-auto border border-border/50 whitespace-pre-wrap",
                      log.status === 'success' ? "text-emerald-300" : "text-red-300"
                    )}>
                      {log.status === 'success'
                        ? (typeof log.result === 'object' ? JSON.stringify(log.result, null, 2) : String(log.result))
                        : log.errorMessage
                      }
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
