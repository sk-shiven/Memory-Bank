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
import { 
  fetchTodayQuestion, 
  fetchCurrentUser, 
  isAuthenticated, 
  logout 
} from './api';

export default function App() {
  const [authed, setAuthed] = useState(() => isAuthenticated());
  const [currentUser, setCurrentUser] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [currentTab, setCurrentTab] = useState('today');
  const [question, setQuestion] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState(null);
  const [loading, setLoading] = useState(true);

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
    await initApp();
  };

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setCurrentUser(null);
    setQuestion(null);
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

  // View 1: Unauthenticated -> Show Auth Page (Matching the provided HTML template)
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
        setCurrentTab={setCurrentTab}
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
            onGoToToday={() => setCurrentTab('today')}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
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
