import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DailyQuestion from './components/DailyQuestion';
import Timeline from './components/Timeline';
import SettingsModal from './components/SettingsModal';
import { fetchTodayQuestion, loginDemoUser } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('today');
  const [question, setQuestion] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      setLoading(true);
      // Auto login dev session if no token
      if (!localStorage.getItem('token')) {
        await loginDemoUser();
      }
      const q = await fetchTodayQuestion();
      setQuestion(q);
    } catch (err) {
      console.error('Failed to initialize 365 app:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSaved = async () => {
    try {
      const q = await fetchTodayQuestion();
      setQuestion(q);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentDay={question?.day_number || 1}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main style={{ flex: 1, paddingTop: '1rem' }}>
        {currentTab === 'today' ? (
          <DailyQuestion
            question={question}
            onAnswered={handleAnswerSaved}
            onRefreshQuestion={initApp}
          />
        ) : (
          <Timeline />
        )}
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '2rem 1rem',
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        365 &bull; AI-Curated Daily Journal &bull; Self-Hosted Memory Bank
      </footer>
    </div>
  );
}
