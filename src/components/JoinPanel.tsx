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
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error.message}
        </div>
      )}

      {!room ? (
        <div className="text-center text-gray-500">Connecting to the room...</div>
      ) : !room.active_question_id ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-xl mb-2">The room is gathering...</p>
          <p className="text-sm">Waiting for the host to open a reflection</p>
        </div>
      ) : !activeQuestion ? (
        <div className="text-center text-gray-500">Loading reflection...</div>
      ) : (
        <div className="max-w-2xl mx-auto">
          {showNameInput && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Enter your name</h3>
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Your name..."
                  className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="w-full p-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </form>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{activeQuestion.prompt}</h2>
            <span className={`inline-block px-3 py-1 text-sm font-semibold rounded ${
              activeQuestion.type === 'mcq' 
                ? 'bg-blue-100 text-blue-800' 
                : activeQuestion.type === 'scale'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {activeQuestion.type.toUpperCase()}
            </span>
          </div>

          {answered && activeQuestion.type === 'scale' ? (
            <div className="p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">You're in</p>
            </div>
          ) : activeQuestion.type === 'mcq' ? (
            <div className="space-y-3">
              {Array.isArray(activeQuestion.options) && activeQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleMcqSubmit(option)}
                  disabled={submitting}
                  className="w-full p-6 text-left bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-lg font-medium transition-colors"
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
                return <div className="text-red-600">Invalid scale question format</div>;
              }

              return (
                <form onSubmit={handleScaleSubmit} className="space-y-6">
                  <div className="flex justify-between items-center text-lg font-semibold mb-4">
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
                    className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed accent-blue-500"
                  />
                  <div className="text-center text-2xl font-bold mb-4">{scaleValue}</div>
                  <button
                    type="submit"
                    disabled={!displayName || submitting || answered}
                    className="w-full p-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-lg font-medium transition-colors"
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
                className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={!textAnswer.trim() || submitting}
                className="w-full p-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-lg font-medium transition-colors"
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

