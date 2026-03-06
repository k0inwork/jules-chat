import { useState, useEffect } from 'react';
import { Settings, KeyRound, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJules } from '@/contexts/JulesContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function SettingsModal() {
  const {
    apiKey,
    setApiKey,
    geminiKey,
    setGeminiKey,
    zaiKey,
    setZaiKey,
    isKeyTesting,
    testApiKey,
    isKeyValid,
    isGeminiValid,
    isGeminiTesting,
    testGeminiKey,
    isZaiValid,
    isZaiTesting,
    testZaiKey,
  } = useJules();

  const [localJulesKey, setLocalJulesKey] = useState(apiKey);
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiKey);
  const [localZaiKey, setLocalZaiKey] = useState(zaiKey);
  const [isOpen, setIsOpen] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalJulesKey(apiKey);
      setLocalGeminiKey(geminiKey);
      setLocalZaiKey(zaiKey);
    }
  }, [isOpen, apiKey, geminiKey, zaiKey]);

  const handleSave = async () => {
    setGeminiKey(localGeminiKey.trim());
    setZaiKey(localZaiKey.trim());
    setApiKey(localJulesKey.trim());

    const checks = [];

    if (localJulesKey.trim() !== apiKey.trim() || isKeyValid === null) {
      checks.push(testApiKey(localJulesKey.trim()));
    }
    if (localGeminiKey.trim() !== geminiKey.trim() || isGeminiValid === null) {
      checks.push(testGeminiKey(localGeminiKey.trim()));
    }
    if (localZaiKey.trim() !== zaiKey.trim() || isZaiValid === null) {
      checks.push(testZaiKey(localZaiKey.trim()));
    }

    await Promise.all(checks);

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            API Key Settings
          </DialogTitle>
          <DialogDescription>
            Configure your API keys to enable Jules Chat. Keys are saved locally in your browser.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="jules-key" className="flex items-center justify-between">
              Jules API Key
              {isKeyValid === true && <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Connected</span>}
              {isKeyValid === false && <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Invalid</span>}
              {isKeyTesting && <span className="text-xs text-indigo-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Testing</span>}
            </Label>
            <Input
              id="jules-key"
              type="password"
              placeholder="Paste your Jules API key..."
              value={localJulesKey}
              onChange={(e) => setLocalJulesKey(e.target.value)}
              className="font-mono-code"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="gemini-key" className="flex items-center justify-between">
              Gemini API Key
              {isGeminiValid === true && <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Connected</span>}
              {isGeminiValid === false && <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Invalid</span>}
              {isGeminiTesting && <span className="text-xs text-indigo-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Testing</span>}
            </Label>
            <Input
              id="gemini-key"
              type="password"
              placeholder="Paste your Gemini API key..."
              value={localGeminiKey}
              onChange={(e) => setLocalGeminiKey(e.target.value)}
              className="font-mono-code"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="zai-key" className="flex items-center justify-between">
              z.ai API Key
              {isZaiValid === true && <span className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Connected</span>}
              {isZaiValid === false && <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Invalid</span>}
              {isZaiTesting && <span className="text-xs text-indigo-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Testing</span>}
            </Label>
            <Input
              id="zai-key"
              type="password"
              placeholder="Paste your z.ai API key..."
              value={localZaiKey}
              onChange={(e) => setLocalZaiKey(e.target.value)}
              className="font-mono-code"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isKeyTesting || isGeminiTesting || isZaiTesting}>
            {(isKeyTesting || isGeminiTesting || isZaiTesting) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
