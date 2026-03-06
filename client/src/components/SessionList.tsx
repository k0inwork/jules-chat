import { useState } from 'react';
import { RefreshCw, Plus, Search, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SessionStateBadge } from './SessionStateBadge';
import { useJules } from '@/contexts/JulesContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/dateUtils';
import { NewSessionDialog } from './NewSessionDialog';
import type { Session } from '@/lib/julesApi';

function SessionCard({ session, isSelected, onClick }: { session: Session; isSelected: boolean; onClick: () => void }) {
  const timeAgo = formatDistanceToNow(session.updateTime);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-3 rounded-lg transition-all duration-150 group',
        'border border-transparent',
        isSelected
          ? 'bg-indigo-500/10 border-indigo-500/30 shadow-sm'
          : 'hover:bg-white/5 hover:border-white/8',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span
          className={cn(
            'text-sm font-medium leading-tight line-clamp-1',
            isSelected ? 'text-indigo-300' : 'text-foreground group-hover:text-indigo-300',
            'transition-colors',
          )}
        >
          {session.title || session.prompt?.slice(0, 50) || 'Untitled session'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <SessionStateBadge state={session.state} size="sm" />
        <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo}</span>
      </div>

      {session.prompt && (
        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
          {session.prompt}
        </p>
      )}
    </button>
  );
}

export function SessionList() {
  const { sessions, sessionsLoading, sessionsError, refreshSessions, selectedSessionId, selectSession, apiKey } =
    useJules();
  const [search, setSearch] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.prompt?.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.state.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sessions
            {sessions.length > 0 && (
              <span className="ml-1.5 text-indigo-400">({sessions.length})</span>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={refreshSessions}
              disabled={sessionsLoading || !apiKey}
              title="Refresh sessions"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', sessionsLoading && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-indigo-400"
              onClick={() => setShowNewDialog(true)}
              disabled={!apiKey}
              title="New session"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Filter sessions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-6 text-xs bg-background/40 border-border/50 focus:border-indigo-500/40"
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {!apiKey && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-400 font-display font-bold text-lg">J</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter your Jules API key above to load your sessions
            </p>
          </div>
        )}

        {apiKey && sessionsLoading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
        )}

        {apiKey && sessionsError && (
          <div className="flex flex-col items-center gap-2 py-6 px-3 text-center">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-xs text-red-400">{sessionsError}</p>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={refreshSessions}>
              Retry
            </Button>
          </div>
        )}

        {apiKey && !sessionsLoading && !sessionsError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Inbox className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {search ? 'No sessions match your filter' : 'No sessions yet'}
            </p>
            {!search && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-indigo-400"
                onClick={() => setShowNewDialog(true)}
              >
                Create one
              </Button>
            )}
          </div>
        )}

        {filtered.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isSelected={selectedSessionId === session.id}
            onClick={() => selectSession(session.id)}
          />
        ))}
      </div>

      {showNewDialog && <NewSessionDialog onClose={() => setShowNewDialog(false)} />}
    </div>
  );
}
