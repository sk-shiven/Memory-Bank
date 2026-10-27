import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Award, 
  Clock 
} from 'lucide-react';
import { fetchTimeline } from '../api';

export default function CalendarGrid({ onOpenMemory, onGoToToday }) {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchTimeline({ page: 1, limit: 365 });
      setTimelineData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const memories = timelineData?.memories || [];
  const currentDay = timelineData?.current_day || 1;
  const totalAnswered = timelineData?.total_memories || 0;

  // Build a lookup map of day_number -> memory
  const memoryMap = {};
  memories.forEach(m => {
    memoryMap[m.day_number] = m;
  });

  // Generate array for all 365 days
  const allDays = Array.from({ length: 365 }, (_, i) => {
    const dayNum = i + 1;
    const item = memoryMap[dayNum];
    const isToday = dayNum === currentDay;
    const isPast = dayNum < currentDay;
    const isFuture = dayNum > currentDay;
    const hasAnswer = item?.answered && item?.answer;

    let format = 'none';
    if (hasAnswer) {
      const hasText = Boolean(item.answer.text);
      const hasPhoto = Boolean(item.answer.photo_url);
      const hasAudio = Boolean(item.answer.audio_url);

      if ((hasPhoto && hasAudio) || (hasText && hasPhoto && hasAudio)) {
        format = 'combo';
      } else if (hasPhoto) {
        format = 'photo';
      } else if (hasAudio) {
        format = 'audio';
      } else if (hasText) {
        format = 'text';
      }
    }

    return {
      dayNum,
      item,
      isToday,
      isPast,
      isFuture,
      hasAnswer,
      format
    };
  });

  const handleCellHover = (dayData, e) => {
    setHoveredDay(dayData);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  };

  const handleCellClick = (dayData) => {
    if (dayData.hasAnswer && dayData.item?.answer?.id) {
      if (onOpenMemory) onOpenMemory(dayData.item.answer.id);
    } else if (dayData.isToday) {
      if (onGoToToday) onGoToToday();
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 20px 4rem', width: '100%' }}>

      {/* Summary Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div className="vintage-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5c8a5c', marginBottom: '6px' }}>
            <Award size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Completion
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-serif-display)', color: '#2a2d25' }}>
            {totalAnswered} / 365
          </div>
          <span style={{ fontSize: '12px', color: '#8a877c' }}>
            {Math.round((totalAnswered / 365) * 100)}% of the year sealed
          </span>
        </div>

        <div className="vintage-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b8812f', marginBottom: '6px' }}>
            <Flame size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Day
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-serif-display)', color: '#2a2d25' }}>
            Day {currentDay}
          </div>
          <span style={{ fontSize: '12px', color: '#8a877c' }}>
            Active milestone
          </span>
        </div>

        <div className="vintage-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#757267', marginBottom: '6px' }}>
            <Clock size={16} />
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Remaining
            </span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 400, fontFamily: 'var(--font-serif-display)', color: '#2a2d25' }}>
            {Math.max(0, 365 - currentDay)} Days
          </div>
          <span style={{ fontSize: '12px', color: '#8a877c' }}>
            left in this 365 cycle
          </span>
        </div>
      </div>

      {/* 365 Matrix Card */}
      <div className="vintage-card" style={{ padding: '32px 32px 28px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{
              margin: '0 0 6px',
              fontFamily: 'var(--font-serif-display)',
              fontStyle: 'italic',
              fontSize: '28px',
              color: '#2a2d25'
            }}>
              The 365-Day Matrix
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#8a877c' }}>
              Hover or tap any day to peek into that day's reflection.
            </p>
          </div>

          {/* Warm & Beige Related Pastel Color Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '12px', color: '#6e7262' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#9bb999', border: '1px solid #8ba889' }} />
              <span>Pastel Sage (Text)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#e8be96', border: '1px solid #d4a97f' }} />
              <span>Pastel Apricot (Photo)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#a8a396', border: '1px solid #948f82' }} />
              <span>Pastel Taupe (Voice)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#d9a7a7', border: '1px solid #c79393' }} />
              <span>Pastel Rose (Combo)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1px solid #b8812f', background: '#faecd8' }} />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* The 365 Grid Matrix */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8a877c' }}>
            Building the 365 matrix...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))',
            gap: '6px',
            background: '#faf8f2',
            padding: '18px',
            borderRadius: '16px',
            border: '1px solid #e8e2d4'
          }}>
            {allDays.map(day => {
              let bg = '#ffffff';
              let borderColor = '#e0d8c6';
              let textColor = '#8a877c';
              let cursor = 'default';

              if (day.hasAnswer) {
                cursor = 'pointer';
                textColor = '#2a2d25';
                if (day.format === 'combo') {
                  bg = '#d9a7a7';
                  borderColor = '#c79393';
                } else if (day.format === 'photo') {
                  bg = '#e8be96';
                  borderColor = '#d4a97f';
                } else if (day.format === 'audio') {
                  bg = '#a8a396';
                  borderColor = '#948f82';
                } else {
                  bg = '#9bb999';
                  borderColor = '#8ba889';
                }
              } else if (day.isToday) {
                cursor = 'pointer';
                bg = '#faecd8';
                borderColor = '#b8812f';
                textColor = '#b8812f';
              } else if (day.isPast) {
                // Missed day
                bg = '#ece6d8';
                borderColor = '#ded6c4';
                textColor = '#a8a396';
              } else {
                // Future day
                bg = 'rgba(255, 255, 255, 0.45)';
                borderColor = '#efeae0';
                textColor = '#c7c2b5';
              }

              return (
                <button
                  key={day.dayNum}
                  onClick={() => handleCellClick(day)}
                  onMouseEnter={(e) => handleCellHover(day, e)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={day.isToday ? 'pulse-today-cell' : ''}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '6px',
                    border: `1px solid ${borderColor}`,
                    backgroundColor: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontFamily: "'Inter', monospace",
                    fontWeight: 600,
                    color: textColor,
                    cursor,
                    padding: 0,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    if (day.hasAnswer || day.isToday) {
                      e.currentTarget.style.transform = 'scale(1.18)';
                      e.currentTarget.style.zIndex = '10';
                      e.currentTarget.style.boxShadow = '0 3px 8px rgba(42, 45, 37, 0.12)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.zIndex = '1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  aria-label={`Day ${day.dayNum}`}
                >
                  {day.dayNum % 10 === 0 || day.dayNum === currentDay || day.dayNum === 1 || day.dayNum === 365 ? (
                    day.dayNum
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

      </div>

      {/* Floating Tooltip Popover */}
      {hoveredDay && (
        <div style={{
          position: 'fixed',
          top: tooltipPos.y,
          left: tooltipPos.x,
          transform: 'translate(-50%, -100%)',
          background: '#2a2d25',
          color: '#fffdf8',
          padding: '10px 14px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          zIndex: 4000,
          maxWidth: '260px',
          textAlign: 'center',
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{ fontWeight: 600, color: '#f6f4ee', marginBottom: '3px' }}>
            Day {hoveredDay.dayNum} {hoveredDay.isToday ? '(Today)' : ''}
          </div>

          {hoveredDay.hasAnswer ? (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#d9d3c5', fontStyle: 'italic', fontFamily: 'var(--font-serif-body)' }}>
                "{hoveredDay.item?.question_text?.slice(0, 70)}..."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '10px', color: '#b8b09a' }}>
                {hoveredDay.item?.answer?.text && <span>Text</span>}
                {hoveredDay.item?.answer?.audio_url && <span>Voice</span>}
                {hoveredDay.item?.answer?.photo_url && <span>Photo</span>}
              </div>
            </div>
          ) : hoveredDay.isToday ? (
            <div style={{ color: '#b8812f', fontSize: '11px' }}>
              Today's prompt is ready to answer! Click to reflect.
            </div>
          ) : hoveredDay.isPast ? (
            <div style={{ color: '#8a877c', fontSize: '11px' }}>
              Missed reflection day
            </div>
          ) : (
            <div style={{ color: '#8a877c', fontSize: '11px' }}>
              Future day in your 365 journey
            </div>
          )}
        </div>
      )}

    </div>
  );
}
