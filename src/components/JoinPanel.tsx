'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getRoomByCode, getQuestionById, subscribeToRoom, submitResponse, type Room, type Question } from '@/lib/quiz';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('quiz_session_id');
  if (stored) return stored;
  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('quiz_session_id', newSessionId);
  return newSessionId;
}

function getDisplayName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sipnsleigh_name');
}

function saveDisplayName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sipnsleigh_name', name);
}

function isQuestionAnswered(questionId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`answered_${questionId}`) === 'true';
}

function markQuestionAnswered(questionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`answered_${questionId}`, 'true');
}

export default function JoinPanel() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('code') || 'SIP2025';
  
  const [room, setRoom] = useState<Room | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scaleValue, setScaleValue] = useState(50);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const sessionId = getSessionId();

  // Load room and subscribe to updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadRoom = async () => {
      try {
        const { data: roomData, error: roomError } = await getRoomByCode(roomCode);
        
        if (roomError || !roomData) {
          throw roomError || new Error('Failed to load room');
        }
        
        setRoom(roomData);
        setError(null);

        // Subscribe to realtime updates
        unsubscribe = subscribeToRoom(roomData.id, (updatedRoom) => {
          setRoom(updatedRoom);
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load room'));
      }
    };

    loadRoom();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [roomCode]);

  // Load display name on mount
  useEffect(() => {
    const storedName = getDisplayName();
    setDisplayName(storedName);
    if (!storedName) {
      setShowNameInput(true);
    }
  }, []);

  // Fetch active question when active_question_id changes
  useEffect(() => {
    if (!room?.active_question_id) {
      setActiveQuestion(null);
      setTextAnswer('');
      setAnswered(false);
      return;
    }

    const loadQuestion = async () => {
      try {
        const { data: question, error: questionError } = await getQuestionById(room.active_question_id!);
        
        if (questionError || !question) {
          throw questionError || new Error('Failed to load question');
        }
        
        setActiveQuestion(question);
        setTextAnswer('');
        setScaleValue(50);
        setAnswered(isQuestionAnswered(question.id));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load question'));
        setActiveQuestion(null);
      }
    };

    loadQuestion();
  }, [room?.active_question_id]);

  const handleMcqSubmit = useCallback(async (option: string) => {
    if (!activeQuestion || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await submitResponse({
        questionId: activeQuestion.id,
        sessionId,
        value: option,
      });
      if (error) {
        throw error;
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to submit response'));
    } finally {
      setSubmitting(false);
    }
  }, [activeQuestion, sessionId, submitting]);

  const handleTextSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !textAnswer.trim() || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await submitResponse({
        questionId: activeQuestion.id,
        sessionId,
        value: textAnswer.trim(),
      });
      if (error) {
        throw error;
      }
      setTextAnswer('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to submit response'));
    } finally {
      setSubmitting(false);
    }
  }, [activeQuestion, sessionId, textAnswer, submitting]);

  const handleNameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const trimmedName = nameInput.trim();
    setDisplayName(trimmedName);
    saveDisplayName(trimmedName);
    setShowNameInput(false);
  }, [nameInput]);

  const handleScaleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || !displayName || submitting || answered) return;

    setSubmitting(true);
    try {
      // For scale questions, store as JSON with name and value
      // The value will be the numeric position (0-100)
      const responseValue = JSON.stringify({
        name: displayName,
        value: scaleValue,
      });
      const { error } = await submitResponse({
        questionId: activeQuestion.id,
        sessionId,
        value: responseValue,
      });
      if (error) {
        throw error;
      }
      markQuestionAnswered(activeQuestion.id);
      setAnswered(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to submit response'));
    } finally {
      setSubmitting(false);
    }
  }, [activeQuestion, sessionId, scaleValue, displayName, submitting, answered]);

  return (
    <div className="p-6 md:p-8">
      {error && (
        <div className="mb-4 p-4 rounded border" style={{ backgroundColor: 'var(--untitled-ui-gray100)', borderColor: 'var(--mae_red)', color: 'var(--mae_red)' }}>
          Error: {error.message}
        </div>
      )}

      {/* Show name input first if no name is set */}
      {showNameInput && !displayName ? (
        <div className="max-w-md mx-auto">
          <div className="mb-6 p-6 rounded-lg shadow-sm" style={{ backgroundColor: 'var(--untitled-ui-white)', border: '1px solid var(--untitled-ui-gray200)' }}>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--black)' }}>Enter your name</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--untitled-ui-gray600)' }}>
              This will be shown when you respond to reflections
            </p>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name..."
                className="w-full p-4 text-lg rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{ 
                  border: '1px solid var(--untitled-ui-gray300)',
                  backgroundColor: 'var(--untitled-ui-white)',
                  color: 'var(--black)',
                  '--tw-ring-color': 'var(--mae_red)'
                } as React.CSSProperties}
                autoFocus
              />
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="w-full p-4 rounded-lg text-lg font-medium transition-colors text-white"
                style={{ 
                  backgroundColor: !nameInput.trim() ? 'var(--untitled-ui-gray300)' : 'var(--black)',
                  cursor: !nameInput.trim() ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (nameInput.trim()) {
                    e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray800)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (nameInput.trim()) {
                    e.currentTarget.style.backgroundColor = 'var(--black)';
                  }
                }}
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      ) : !room ? (
        <div className="text-center" style={{ color: 'var(--untitled-ui-gray600)' }}>Connecting to the room...</div>
      ) : !room.active_question_id ? (
        <div className="text-center py-12">
          {displayName ? (
            <>
              <p className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--black)' }}>
                Welcome, {displayName}
              </p>
              <p className="text-lg mb-2" style={{ color: 'var(--untitled-ui-gray700)' }}>
                You&apos;re all set
              </p>
              <p className="text-sm" style={{ color: 'var(--untitled-ui-gray600)' }}>
                Waiting for the host to begin...
              </p>
            </>
          ) : (
            <>
              <p className="text-xl md:text-2xl font-semibold mb-3" style={{ color: 'var(--black)' }}>
                Welcome to Sip&apos;n&apos;Sleigh &apos;25
              </p>
              <p className="text-base mb-2" style={{ color: 'var(--untitled-ui-gray700)' }}>
                The room is ready
              </p>
              <p className="text-sm" style={{ color: 'var(--untitled-ui-gray600)' }}>
                Waiting for the host to begin...
              </p>
            </>
          )}
        </div>
      ) : !activeQuestion ? (
        <div className="text-center" style={{ color: 'var(--untitled-ui-gray600)' }}>Loading reflection...</div>
      ) : (
        <div className="max-w-2xl mx-auto">

          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--black)' }}>{activeQuestion.prompt}</h2>
            <span 
              className="inline-block px-3 py-1 text-sm font-semibold rounded"
              style={{
                backgroundColor: activeQuestion.type === 'mcq' 
                  ? 'var(--untitled-ui-primary100)' 
                  : activeQuestion.type === 'scale'
                  ? 'var(--untitled-ui-primary100)'
                  : 'var(--untitled-ui-gray100)',
                color: activeQuestion.type === 'mcq' 
                  ? 'var(--untitled-ui-primary700)' 
                  : activeQuestion.type === 'scale'
                  ? 'var(--untitled-ui-primary700)'
                  : 'var(--untitled-ui-gray700)'
              }}
            >
              {activeQuestion.type.toUpperCase()}
            </span>
          </div>

          {answered && activeQuestion.type === 'scale' ? (
            <div className="p-6 rounded-lg text-center" style={{ backgroundColor: 'var(--untitled-ui-gray50)', border: '2px solid var(--untitled-ui-gray300)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--untitled-ui-gray700)' }}>You&apos;re in</p>
            </div>
          ) : activeQuestion.type === 'mcq' ? (
            <div className="space-y-3">
              {Array.isArray(activeQuestion.options) && activeQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleMcqSubmit(option)}
                  disabled={submitting}
                  className="w-full p-6 text-left rounded-lg text-lg font-medium transition-colors text-white"
                  style={{
                    backgroundColor: submitting ? 'var(--untitled-ui-gray300)' : 'var(--black)',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray800)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.backgroundColor = 'var(--black)';
                    }
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : activeQuestion.type === 'scale' ? (
            (() => {
              const scaleOptions = activeQuestion.options && typeof activeQuestion.options === 'object' && !Array.isArray(activeQuestion.options)
                ? activeQuestion.options as { left: string; right: string }
                : null;

              if (!scaleOptions) {
                return <div style={{ color: 'var(--mae_red)' }}>Invalid scale question format</div>;
              }

              return (
                <form onSubmit={handleScaleSubmit} className="space-y-6">
                  <div className="flex justify-between items-center text-lg font-semibold mb-4" style={{ color: 'var(--black)' }}>
                    <span>{scaleOptions.left}</span>
                    <span>{scaleOptions.right}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={scaleValue}
                    onChange={(e) => setScaleValue(Number(e.target.value))}
                    disabled={submitting || answered}
                    className="w-full h-4 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--untitled-ui-gray200)',
                      accentColor: 'var(--black)'
                    }}
                  />
                  <div className="text-center text-2xl font-bold mb-4" style={{ color: 'var(--black)' }}>{scaleValue}</div>
                  <button
                    type="submit"
                    disabled={!displayName || submitting || answered}
                    className="w-full p-4 rounded-lg text-lg font-medium transition-colors text-white"
                    style={{
                      backgroundColor: (!displayName || submitting || answered) ? 'var(--untitled-ui-gray300)' : 'var(--black)',
                      cursor: (!displayName || submitting || answered) ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (displayName && !submitting && !answered) {
                        e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray800)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (displayName && !submitting && !answered) {
                        e.currentTarget.style.backgroundColor = 'var(--black)';
                      }
                    }}
                  >
                    {submitting ? 'Sending...' : 'Send'}
                  </button>
                </form>
              );
            })()
          ) : (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <input
                type="text"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={submitting}
                placeholder="Type your answer..."
                className="w-full p-4 text-lg rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{
                  border: '1px solid var(--untitled-ui-gray300)',
                  backgroundColor: 'var(--untitled-ui-white)',
                  color: 'var(--black)',
                  '--tw-ring-color': 'var(--mae_red)'
                } as React.CSSProperties}
              />
              <button
                type="submit"
                disabled={!textAnswer.trim() || submitting}
                className="w-full p-4 rounded-lg text-lg font-medium transition-colors text-white"
                style={{
                  backgroundColor: (!textAnswer.trim() || submitting) ? 'var(--untitled-ui-gray300)' : 'var(--black)',
                  cursor: (!textAnswer.trim() || submitting) ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (textAnswer.trim() && !submitting) {
                    e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray800)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (textAnswer.trim() && !submitting) {
                    e.currentTarget.style.backgroundColor = 'var(--black)';
                  }
                }}
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

