/**
 * Jules Chat — Main Layout
 * Design: Obsidian Dark Premium Dev Dashboard
 * Layout: Top API key bar + three-column (session list | Session Panel | Agent Chat)
 * Colors: Deep charcoal (#0f1117), indigo accent, emerald success
 * Fonts: Space Grotesk (headings), Inter (body), Fira Code (mono)
 */
import { ApiKeyBar } from '@/components/ApiKeyBar';
import { SessionList } from '@/components/SessionList';
import { SessionPanel } from '@/components/SessionPanel';
import { AgentChat } from '@/components/AgentChat';
import { useJules } from '@/contexts/JulesContext';

export default function Home() {
  const { apiKey } = useJules();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, oklch(0.62 0.22 264 / 4%) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, oklch(0.65 0.18 162 / 3%) 0%, transparent 50%)' }}>
      {/* Top bar: API key entry */}
      <ApiKeyBar />

      {/* Main content: three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Session list */}
        <aside
          className="flex-shrink-0 border-r border-border overflow-hidden flex flex-col"
          style={{ width: '260px' }}
        >
          <SessionList />
        </aside>

        {/* Middle panel: Session details */}
        <main className="flex-1 border-r border-border overflow-hidden flex flex-col bg-background relative">
          <SessionPanel />
        </main>

        {/* Right panel: Agent Chat */}
        <aside
          className="flex-shrink-0 overflow-hidden flex flex-col bg-background"
          style={{ width: '400px' }}
        >
          <AgentChat />
        </aside>
      </div>
    </div>
  );
}
