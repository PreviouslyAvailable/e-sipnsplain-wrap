'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getRoomByCode, getQuestionById, subscribeToRoom, submitResponse, getResponses, type Room, type Question } from '@/lib/quiz';
import { isQuestionAnswered, markQuestionAnswered, clearQuestionAnswered } from '@/lib/localStorage';

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
        
        // Ensure session_started defaults to false if null/undefined
        const normalizedRoom = {
          ...roomData,
          session_started: roomData.session_started ?? false,
        };
        
        setRoom(normalizedRoom);
        setError(null);

        // Subscribe to realtime updates
        unsubscribe = subscribeToRoom(roomData.id, (updatedRoom) => {
          // Normalize session_started in subscription updates too
          const normalizedUpdatedRoom = {
            ...updatedRoom,
            session_started: updatedRoom.session_started ?? false,
          };
          setRoom(normalizedUpdatedRoom);
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

  // Function to verify and sync answered state with database
  const verifyAnsweredState = useCallback(async (questionId: string) => {
    try {
      const currentSessionId = getSessionId();
      const { data: responses, error: responsesError } = await getResponses(questionId);
      const hasResponseInDb = !responsesError && responses && responses.some((r: any) => r.session_id === currentSessionId);
      
      // If localStorage says answered but database says no response, clear localStorage
      // This handles the case where questions were reset
      const localStorageAnswered = isQuestionAnswered(questionId);
      if (localStorageAnswered && !hasResponseInDb) {
        clearQuestionAnswered(questionId);
        setAnswered(false);
      } else {
        // Use database state as source of truth
        setAnswered(hasResponseInDb);
      }
    } catch (err) {
      console.error('Error verifying answered state:', err);
    }
  }, []);

  // Fetch active question when active_question_id changes
  useEffect(() => {
    if (!room) return;
    
    const currentQuestionId = room.active_question_id;
    
    if (!currentQuestionId) {
      // Question was closed - reset everything and show waiting state
      setActiveQuestion(null);
      setTextAnswer('');
      setScaleValue(50);
      setAnswered(false);
      setSubmitting(false);
      return;
    }

    let cancelled = false;

    const loadQuestion = async () => {
      try {
        const { data: question, error: questionError } = await getQuestionById(currentQuestionId);
        
        if (cancelled) return;
        
        if (questionError || !question) {
          throw questionError || new Error('Failed to load question');
        }
        
        // Verify with database: check if this session has actually submitted a response
        // This ensures localStorage stays in sync with the database after reset
        await verifyAnsweredState(question.id);
        
        // Check if this is still the active question
        // Use a ref or state check - but since we're in useEffect, we need to check room again
        // Actually, we should just set it since the effect will re-run if room changes
        setActiveQuestion(question);
        setTextAnswer('');
        setScaleValue(50);
        setSubmitting(false);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Failed to load question'));
        setActiveQuestion(null);
        setAnswered(false);
      }
    };

    loadQuestion();

    return () => {
      cancelled = true;
    };
  }, [room?.active_question_id, verifyAnsweredState]);

  // Re-verify answered state whenever room updates (e.g., after reset)
  // This ensures that if responses are cleared while a question is active, we detect it
  useEffect(() => {
    if (!room || !activeQuestion) return;
    
    // Re-verify the answered state when room updates
    // This catches cases where responses are cleared via reset
    verifyAnsweredState(activeQuestion.id);
  }, [room, activeQuestion, verifyAnsweredState]);

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
      ) : room.session_started !== true ? (
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
      ) : !room.active_question_id ? (
        <div className="text-center py-12">
          <p className="text-xl md:text-2xl font-semibold mb-3" style={{ color: 'var(--black)' }}>
            Waiting for the next reflection...
          </p>
          <div className="flex justify-center mt-6">
            <div className="animate-pulse">
              <div className="w-16 h-16 rounded-full" style={{ backgroundColor: 'var(--untitled-ui-gray300)' }}></div>
            </div>
          </div>
        </div>
      ) : !activeQuestion ? (
        <div className="text-center" style={{ color: 'var(--untitled-ui-gray600)' }}>Loading reflection...</div>
      ) : (
        <div className="max-w-2xl mx-auto">

          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--black)' }}>{activeQuestion.prompt}</h2>
          </div>

          {answered && activeQuestion.type === 'scale' ? (
            <div className="p-6 rounded-lg text-center" style={{ backgroundColor: 'var(--untitled-ui-gray50)', border: '2px solid var(--untitled-ui-gray300)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--untitled-ui-gray700)' }}>You&apos;ve submitted</p>
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

