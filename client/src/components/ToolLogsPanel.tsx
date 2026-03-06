import { useState } from 'react';
import { useJules } from '@/contexts/JulesContext';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, XCircle, Loader2, Clock, Code2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToolCallLog } from '@/lib/ai';

function LogItem({ log }: { log: ToolCallLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "p-3 rounded-lg border text-sm font-mono-code flex flex-col gap-2 transition-colors",
        log.status === 'success' ? "bg-emerald-500/5 border-emerald-500/20" :
        log.status === 'error' ? "bg-red-500/5 border-red-500/20" :
        "bg-muted/30 border-border/50"
      )}
    >
      <div
        className="flex items-center justify-between gap-2 cursor-pointer group"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 font-semibold text-foreground break-all">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />}
          {log.functionName}
          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-sans tracking-wider hidden sm:inline-block">
            {log.provider}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {log.status === 'pending' && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />}
          {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
          {log.status === 'error' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-sans ml-5">
        <Clock className="w-2.5 h-2.5" />
        {new Date(log.timestamp).toLocaleTimeString()}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 ml-5 animate-fade-slide-up">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide font-sans">Arguments</div>
            <pre className="text-[10px] bg-black/40 p-2 rounded overflow-x-auto border border-border/50 text-indigo-300">
              {JSON.stringify(log.args, null, 2)}
            </pre>
          </div>

          {(log.status === 'success' || log.status === 'error') && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide font-sans">
                {log.status === 'success' ? 'Result' : 'Error'}
              </div>
              <pre className={cn(
                "text-[10px] bg-black/40 p-2 rounded overflow-x-auto border border-border/50 whitespace-pre-wrap max-h-64",
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
      )}
    </div>
  );
}

export function ToolLogsPanel() {
  const { toolLogs, isToolLogsOpen, toggleToolLogs } = useJules();

  if (!isToolLogsOpen) return null;

  return (
    <div className="flex flex-col h-full w-[360px] border-l border-border bg-background flex-shrink-0 relative overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-foreground">Debug Tool Logs</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleToolLogs}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {toolLogs.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground mt-8">
              No tool calls yet in this session.
            </div>
          ) : (
            <div className="space-y-3">
              {toolLogs.map((log) => (
                <LogItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
