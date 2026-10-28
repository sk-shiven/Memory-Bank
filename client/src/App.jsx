import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import DailyQuestion from './components/DailyQuestion';
import Timeline from './components/Timeline';
import CalendarGrid from './components/CalendarGrid';
import SettingsModal from './components/SettingsModal';
import MemoryDetailModal from './components/MemoryDetailModal';
import AuthView from './components/AuthView';
import OnboardingWizard from './components/OnboardingWizard';
import NotFoundPage from './components/NotFoundPage';
import { 
  fetchTodayQuestion, 
  fetchCurrentUser, 
  isAuthenticated, 
  logout 
} from './api';

function parseCurrentRoute() {
  if (typeof window === 'undefined') return { tab: 'today', is404: false };
  const rawPath = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (rawPath === '/' || rawPath === '/today') return { tab: 'today', is404: false };
  if (rawPath === '/timeline') return { tab: 'timeline', is404: false };
  if (rawPath === '/calendar') return { tab: 'calendar', is404: false };
  if (rawPath === '/login' || rawPath === '/auth') return { tab: 'today', is404: false };
  // Any other pathname (e.g. /404, /random, /unknown) is a 404!
  return { tab: 'today', is404: true, path: window.location.pathname };
}

export default function App() {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  const [currentUser, setCurrentUser] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [currentTab, setCurrentTab] = useState(() => parseCurrentRoute().tab);
  const [is404, setIs404] = useState(() => parseCurrentRoute().is404);
  const [errorDetail404, setErrorDetail404] = useState(() => {
    const route = parseCurrentRoute();
    return route.is404 ? `No page or reflection found at "${route.path}"` : null;
  });
  const [question, setQuestion] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial console error if launched on an unrecognized route
  useEffect(() => {
    const route = parseCurrentRoute();
    if (route.is404) {
      console.error(new Error(`[404 Not Found] Unrecognized route requested: ${window.location.pathname}`));
    }
  }, []);

  // Listen for API 404 triggers and browser back/forward buttons
  useEffect(() => {
    const handle404Event = (e) => {
      setIs404(true);
      setErrorDetail404(e?.detail?.message || 'The requested resource was not found.');
    };

    const handlePopState = () => {
      const route = parseCurrentRoute();
      setIs404(route.is404);
      if (route.is404) {
        setErrorDetail404(`No page or reflection found at "${window.location.pathname}"`);
        console.error(new Error(`[404 Not Found] Route does not exist: ${window.location.pathname}`));
      } else {
        setErrorDetail404(null);
        setCurrentTab(route.tab);
      }
    };

    window.addEventListener('app:404', handle404Event);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('app:404', handle404Event);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleTabChange = (newTab) => {
    setCurrentTab(newTab);
    setIs404(false);
    setErrorDetail404(null);
    const targetPath = newTab === 'today' ? '/today' : `/${newTab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  const initApp = useCallback(async () => {
    try {
      setLoading(true);
      if (isAuthenticated()) {
        const user = await fetchCurrentUser();
        setCurrentUser(user);
        setAuthed(true);

        // Check if user has completed onboarding (has timezone and interests)
        const hasTimezone = Boolean(user.timezone && user.timezone !== 'UTC');
        const hasInterests = Boolean(user.interests && user.interests.length > 0);
        if (!hasTimezone && !hasInterests) {
          setNeedsOnboarding(true);
        }

        const q = await fetchTodayQuestion();
        setQuestion(q);
      } else {
        setAuthed(false);
      }
    } catch (err) {
      console.warn('Session init:', err.message);
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  const handleLoginSuccess = async () => {
    setAuthed(true);
    setIs404(false);
    setErrorDetail404(null);
    if (window.location.pathname === '/login' || window.location.pathname === '/auth') {
      window.history.pushState(null, '', '/today');
    }
    await initApp();
  };

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setCurrentUser(null);
    setQuestion(null);
    setIs404(false);
    setErrorDetail404(null);
    window.history.pushState(null, '', '/');
  };

  const handleAnswerSaved = async () => {
    try {
      const q = await fetchTodayQuestion();
      setQuestion(q);
      const u = await fetchCurrentUser();
      setCurrentUser(u);
    } catch (err) {
      console.error(err);
    }
  };

  // View 0: Custom 404 Page (Always renders for 404 routes or API 404s, regardless of auth status)
  if (is404) {
    return (
      <NotFoundPage
        isAuthenticated={authed}
        errorDetail={errorDetail404}
        onNavigate={(targetTab) => {
          handleTabChange(targetTab);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f6f4ee',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6e7262',
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontStyle: 'italic',
        fontSize: '28px'
      }}>
        Gathering your memories...
      </div>
    );
  }

  // View 1: Unauthenticated -> Show Auth Page
  if (!authed) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  // View 2: First-time user setup wizard
  if (needsOnboarding) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setNeedsOnboarding(false);
          initApp();
        }}
      />
    );
  }

  // View 3: Authenticated App Shell with Header, Tabs, Footer
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        currentDay={question?.day_number || currentUser?.streak_count || 1}
        streakCount={currentUser?.streak_count || 0}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingTop: '0.5rem' }}>
        {currentTab === 'today' && (
          <DailyQuestion
            question={question}
            onAnswered={handleAnswerSaved}
          />
        )}

        {currentTab === 'timeline' && (
          <Timeline
            onOpenMemory={(answerId) => setSelectedMemoryId(answerId)}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarGrid
            onOpenMemory={(answerId) => setSelectedMemoryId(answerId)}
            onGoToToday={() => handleTabChange('today')}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLogout={handleLogout}
      />

      {/* Memory Focus & Mutation Modal */}
      {selectedMemoryId && (
        <MemoryDetailModal
          answerId={selectedMemoryId}
          onClose={() => setSelectedMemoryId(null)}
          onMemoryUpdated={() => {
            initApp();
          }}
          onMemoryDeleted={() => {
            setSelectedMemoryId(null);
            initApp();
          }}
        />
      )}

      {/* Vintage Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2.5rem 1rem 3rem',
        fontSize: '0.85rem',
        color: 'var(--text-dim)',
        borderTop: '1px solid var(--border-light)',
        fontFamily: 'var(--font-serif-vintage)',
        letterSpacing: '0.02em'
      }}>
        Memory Bank &bull; 365 Days of Reflections &bull; Private &amp; Self-Hosted
      </footer>
    </div>
  );
}
