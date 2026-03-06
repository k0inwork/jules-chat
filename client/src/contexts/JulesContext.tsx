import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { julesApi, type Session, type Activity, type Source, JulesApiError } from '@/lib/julesApi';
import { GeminiClient } from '@/lib/ai/gemini';
import { ZAiClient } from '@/lib/ai/zai';
import { ToolCallLog } from '@/lib/ai';

const API_KEY_STORAGE = 'jules_api_key';
const GEMINI_KEY_STORAGE = 'gemini_api_key';
const ZAI_KEY_STORAGE = 'zai_api_key';
const POLL_INTERVAL_MS = 5000;

const ACTIVE_STATES = new Set([
  'QUEUED',
  'PLANNING',
  'AWAITING_PLAN_APPROVAL',
  'AWAITING_USER_FEEDBACK',
  'IN_PROGRESS',
]);

interface JulesContextValue {
  apiKey: string;
  setApiKey: (key: string) => void;
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  zaiKey: string;
  setZaiKey: (key: string) => void;

  isKeyValid: boolean | null; // null = untested
  isKeyTesting: boolean;
  testApiKey: (key: string) => Promise<boolean>;

  isGeminiValid: boolean | null;
  isGeminiTesting: boolean;
  testGeminiKey: (key: string) => Promise<boolean>;

  isZaiValid: boolean | null;
  isZaiTesting: boolean;
  testZaiKey: (key: string) => Promise<boolean>;

  sessions: Session[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  refreshSessions: () => Promise<void>;

  selectedSessionId: string | null;
  selectSession: (id: string | null) => void;
  selectedSession: Session | null;

  activities: Activity[];
  activitiesLoading: boolean;
  activitiesError: string | null;
  refreshActivities: () => Promise<void>;

  sources: Source[];
  sourcesLoading: boolean;

  sendMessage: (sessionId: string, prompt: string) => Promise<void>;
  approvePlan: (sessionId: string) => Promise<void>;
  createSession: (prompt: string, title?: string, sourceContext?: { source: string; branch: string }, requireApproval?: boolean) => Promise<Session>;
  deleteSession: (sessionId: string) => Promise<void>;

  aiProvider: 'gemini' | 'zai';
  setAiProvider: (provider: 'gemini' | 'zai') => void;

  toolLogs: ToolCallLog[];
  isToolLogsOpen: boolean;
  toggleToolLogs: () => void;
  addToolCallLog: (log: Omit<ToolCallLog, 'id' | 'timestamp'>) => string;
  updateToolCallLog: (id: string, updates: Partial<ToolCallLog>) => void;
}

const JulesContext = createContext<JulesContextValue | null>(null);

export function JulesProvider({ children }: { children: React.ReactNode }) {
  const [aiProvider, setAiProvider] = useState<'gemini' | 'zai'>('gemini');
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE) || import.meta.env.VITE_JULES_API_KEY || '';
  });
  const [geminiKey, setGeminiKeyState] = useState<string>(() => {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
  });
  const [zaiKey, setZaiKeyState] = useState<string>(() => {
    return localStorage.getItem(ZAI_KEY_STORAGE) || import.meta.env.Z_API_KEY || import.meta.env.VITE_Z_API_KEY || '';
  });
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [isKeyTesting, setIsKeyTesting] = useState(false);

  const [isGeminiValid, setIsGeminiValid] = useState<boolean | null>(null);
  const [isGeminiTesting, setIsGeminiTesting] = useState(false);

  const [isZaiValid, setIsZaiValid] = useState<boolean | null>(null);
  const [isZaiTesting, setIsZaiTesting] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const [toolLogs, setToolLogs] = useState<ToolCallLog[]>([]);
  const [isToolLogsOpen, setIsToolLogsOpen] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem(API_KEY_STORAGE, key);
    setIsKeyValid(null);
  }, []);

  const setGeminiKey = useCallback((key: string) => {
    setGeminiKeyState(key);
    localStorage.setItem(GEMINI_KEY_STORAGE, key);
    setIsGeminiValid(null);
  }, []);

  const setZaiKey = useCallback((key: string) => {
    setZaiKeyState(key);
    localStorage.setItem(ZAI_KEY_STORAGE, key);
    setIsZaiValid(null);
  }, []);

  const testApiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!key.trim()) return false;
    setIsKeyTesting(true);
    try {
      await julesApi.listSessions(key, 1);
      setIsKeyValid(true);
      return true;
    } catch {
      setIsKeyValid(false);
      return false;
    } finally {
      setIsKeyTesting(false);
    }
  }, []);

  const testGeminiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!key.trim()) return false;
    setIsGeminiTesting(true);
    try {
      const client = new GeminiClient(key, '');
      const valid = await client.testConnection();
      setIsGeminiValid(valid);
      return valid;
    } catch {
      setIsGeminiValid(false);
      return false;
    } finally {
      setIsGeminiTesting(false);
    }
  }, []);

  const testZaiKey = useCallback(async (key: string): Promise<boolean> => {
    if (!key.trim()) return false;
    setIsZaiTesting(true);
    try {
      const client = new ZAiClient(key, '');
      const valid = await client.testConnection();
      setIsZaiValid(valid);
      return valid;
    } catch {
      setIsZaiValid(false);
      return false;
    } finally {
      setIsZaiTesting(false);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    if (!apiKey) return;
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await julesApi.listSessions(apiKey, 50);
      setSessions(res.sessions || []);
    } catch (err) {
      const msg = err instanceof JulesApiError ? err.message : 'Failed to load sessions';
      setSessionsError(msg);
    } finally {
      setSessionsLoading(false);
    }
  }, [apiKey]);

  const refreshActivities = useCallback(async () => {
    if (!apiKey || !selectedSessionId) return;
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await julesApi.listActivities(apiKey, selectedSessionId, 100);
      setActivities(res.activities || []);
    } catch (err) {
      const msg = err instanceof JulesApiError ? err.message : 'Failed to load activities';
      setActivitiesError(msg);
    } finally {
      setActivitiesLoading(false);
    }
  }, [apiKey, selectedSessionId]);

  const loadSources = useCallback(async () => {
    if (!apiKey) return;
    setSourcesLoading(true);
    try {
      const res = await julesApi.listSources(apiKey, 50);
      setSources(res.sources || []);
    } catch {
      // silently fail
    } finally {
      setSourcesLoading(false);
    }
  }, [apiKey]);

  // Load sessions when API key is set
  useEffect(() => {
    if (apiKey) {
      refreshSessions();
      loadSources();
    } else {
      setSessions([]);
      setSources([]);
    }
  }, [apiKey, refreshSessions, loadSources]);

  // Poll sessions periodically if any are active
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (!apiKey) return;

    const hasActive = sessions.some((s) => ACTIVE_STATES.has(s.state));
    if (hasActive) {
      pollTimerRef.current = setInterval(refreshSessions, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [apiKey, sessions, refreshSessions]);

  // Load activities when session changes
  useEffect(() => {
    if (activityPollTimerRef.current) clearInterval(activityPollTimerRef.current);
    setActivities([]);
    if (!selectedSessionId || !apiKey) return;

    refreshActivities();

    // Poll activities if session is active
    const session = sessions.find((s) => s.id === selectedSessionId);
    if (session && ACTIVE_STATES.has(session.state)) {
      activityPollTimerRef.current = setInterval(refreshActivities, POLL_INTERVAL_MS);
    }

    return () => {
      if (activityPollTimerRef.current) clearInterval(activityPollTimerRef.current);
    };
  }, [selectedSessionId, apiKey, refreshActivities, sessions]);

  const selectSession = useCallback((id: string | null) => {
    setSelectedSessionId(id);
  }, []);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;

  const sendMessage = useCallback(
    async (sessionId: string, prompt: string) => {
      await julesApi.sendMessage(apiKey, sessionId, prompt);
      // Refresh activities after sending
      setTimeout(refreshActivities, 1000);
    },
    [apiKey, refreshActivities],
  );

  const approvePlan = useCallback(
    async (sessionId: string) => {
      await julesApi.approvePlan(apiKey, sessionId);
      await refreshSessions();
      setTimeout(refreshActivities, 1000);
    },
    [apiKey, refreshSessions, refreshActivities],
  );

  const createSession = useCallback(
    async (
      prompt: string,
      title?: string,
      sourceContext?: { source: string; branch: string },
      requireApproval = false,
    ) => {
      const body = {
        prompt,
        title,
        requirePlanApproval: requireApproval,
        ...(sourceContext && {
          sourceContext: {
            source: sourceContext.source,
            githubRepoContext: { startingBranch: sourceContext.branch },
          },
        }),
      };
      const session = await julesApi.createSession(apiKey, body);
      await refreshSessions();
      return session;
    },
    [apiKey, refreshSessions],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await julesApi.deleteSession(apiKey, sessionId);
      if (selectedSessionId === sessionId) setSelectedSessionId(null);
      await refreshSessions();
    },
    [apiKey, selectedSessionId, refreshSessions],
  );

  const toggleToolLogs = useCallback(() => {
    setIsToolLogsOpen(prev => !prev);
  }, []);

  const addToolCallLog = useCallback((log: Omit<ToolCallLog, 'id' | 'timestamp'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newLog: ToolCallLog = {
      ...log,
      id,
      timestamp: Date.now()
    };
    setToolLogs(prev => [...prev, newLog]);
    return id;
  }, []);

  const updateToolCallLog = useCallback((id: string, updates: Partial<ToolCallLog>) => {
    setToolLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
  }, []);

  return (
    <JulesContext.Provider
      value={{
        aiProvider,
        setAiProvider,
        apiKey,
        setApiKey,
        geminiKey,
        setGeminiKey,
        zaiKey,
        setZaiKey,
        isKeyValid,
        isKeyTesting,
        testApiKey,
        isGeminiValid,
        isGeminiTesting,
        testGeminiKey,
        isZaiValid,
        isZaiTesting,
        testZaiKey,
        sessions,
        sessionsLoading,
        sessionsError,
        refreshSessions,
        selectedSessionId,
        selectSession,
        selectedSession,
        activities,
        activitiesLoading,
        activitiesError,
        refreshActivities,
        sources,
        sourcesLoading,
        sendMessage,
        approvePlan,
        createSession,
        deleteSession,
        toolLogs,
        isToolLogsOpen,
        toggleToolLogs,
        addToolCallLog,
        updateToolCallLog,
      }}
    >
      {children}
    </JulesContext.Provider>
  );
}

export function useJules() {
  const ctx = useContext(JulesContext);
  if (!ctx) throw new Error('useJules must be used within JulesProvider');
  return ctx;
}
