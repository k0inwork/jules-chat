/**
 * Jules Chat — Main Layout
 * Design: Obsidian Dark Premium Dev Dashboard
 * Layout: Top API key bar + top Agent Chat / bottom Jules Sessions
 * Colors: Deep charcoal (#0f1117), indigo accent, emerald success
 * Fonts: Space Grotesk (headings), Inter (body), Fira Code (mono)
 */
import { ApiKeyBar } from '@/components/ApiKeyBar';
import { SessionPanel } from '@/components/SessionPanel';
import { AgentChat } from '@/components/AgentChat';
import { useJules } from '@/contexts/JulesContext';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export default function Home() {
  const { apiKey } = useJules();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, oklch(0.62 0.22 264 / 4%) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, oklch(0.65 0.18 162 / 3%) 0%, transparent 50%)' }}>
      {/* Top bar: API key entry */}
      <ApiKeyBar />

      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">

        {/* Left pane: Agent Chat */}
        <Panel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col bg-background border-r border-border">
            <AgentChat />
          </div>
        </Panel>

        <PanelResizeHandle className="w-1 bg-border hover:bg-indigo-500/50 transition-colors" />

        {/* Right pane: Session details */}
        <Panel defaultSize={60} minSize={30}>
          <div className="h-full flex overflow-hidden">
            <main className="flex-1 overflow-hidden flex flex-col bg-background relative">
              <SessionPanel />
            </main>
          </div>
        </Panel>

      </PanelGroup>
    </div>
  );
}
