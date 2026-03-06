import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { julesApi, type Session, type Activity, type Source, JulesApiError } from '@/lib/julesApi';

const API_KEY_STORAGE = 'jules_api_key';
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
  isKeyValid: boolean | null; // null = untested
  isKeyTesting: boolean;
  testApiKey: (key: string) => Promise<boolean>;

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
}

const JulesContext = createContext<JulesContextValue | null>(null);

export function JulesProvider({ children }: { children: React.ReactNode }) {
  const [aiProvider, setAiProvider] = useState<'gemini' | 'zai'>('gemini');
  const [apiKey, setApiKeyState] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  });
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [isKeyTesting, setIsKeyTesting] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    localStorage.setItem(API_KEY_STORAGE, key);
    setIsKeyValid(null);
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

  return (
    <JulesContext.Provider
      value={{
        aiProvider,
        setAiProvider,
        apiKey,
        setApiKey,
        isKeyValid,
        isKeyTesting,
        testApiKey,
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
