import { useState } from 'react';
import { KeyRound, CheckCircle2, XCircle, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJules } from '@/contexts/JulesContext';
import { cn } from '@/lib/utils';

export function ApiKeyBar() {
  const { apiKey, setApiKey, isKeyValid, isKeyTesting, testApiKey } = useJules();
  const [inputValue, setInputValue] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const handleConnect = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    await testApiKey(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConnect();
  };

  const statusIcon = () => {
    if (isKeyTesting) return <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />;
    if (isKeyValid === true) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (isKeyValid === false) return <XCircle className="w-4 h-4 text-red-400" />;
    return null;
  };

  const statusText = () => {
    if (isKeyTesting) return 'Verifying…';
    if (isKeyValid === true) return 'Connected';
    if (isKeyValid === false) return 'Invalid key';
    return null;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm" style={{ boxShadow: '0 1px 0 oklch(1 0 0 / 4%)' }}>
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <span className="text-indigo-400 font-display font-bold text-sm">J</span>
        </div>
        <span className="font-display font-semibold text-sm text-foreground hidden sm:block">Jules Chat</span>
      </div>

      <div className="w-px h-5 bg-border flex-shrink-0" />

      {/* API Key input */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <KeyRound className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Input
            type={showKey ? 'text' : 'password'}
            placeholder="Paste your Jules API key…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              'h-7 text-xs font-mono-code bg-background/50 border-border/60 pr-8',
              'focus:border-indigo-500/60 focus:ring-indigo-500/20',
              isKeyValid === true && 'border-emerald-500/40',
              isKeyValid === false && 'border-red-500/40',
            )}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        </div>

        <Button
          size="sm"
          onClick={handleConnect}
          disabled={isKeyTesting || !inputValue.trim()}
          className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white border-0 flex-shrink-0"
        >
          {isKeyTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Connect'}
        </Button>

        {/* Status indicator */}
        {(statusIcon() || statusText()) && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {statusIcon()}
            <span
              className={cn(
                'text-xs hidden sm:block',
                isKeyValid === true && 'text-emerald-400',
                isKeyValid === false && 'text-red-400',
                isKeyTesting && 'text-indigo-400',
              )}
            >
              {statusText()}
            </span>
          </div>
        )}
      </div>

      {/* Get API key link */}
      <a
        href="https://jules.google.com/settings"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-indigo-400 transition-colors flex-shrink-0 hidden md:flex"
      >
        Get key
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
