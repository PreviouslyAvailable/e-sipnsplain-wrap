'use client';

import { useEffect, useState } from 'react';
import { getRoomByCode, getQuestions, setActiveQuestion, subscribeToRoom, type Room, type Question } from '@/lib/quiz';

export default function HostPanel() {
  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadRoomAndQuestions = async () => {
      try {
        setLoading(true);
        const { data: roomData, error: roomError } = await getRoomByCode("SIP2025");
        
        if (roomError || !roomData) {
          throw roomError || new Error('Failed to load room');
        }
        
        // Store the full room object including id (UUID)
        setRoom(roomData);
        setError(null);
        
        // Use room.id (UUID), NOT room.code
        const { data: questionsData, error: questionsError } = await getQuestions(roomData.id);
        
        if (questionsError) {
          throw questionsError;
        }
        
        setQuestions((questionsData || []).sort((a, b) => a.order_index - b.order_index));

        // Subscribe to realtime updates on the rooms table
        unsubscribe = subscribeToRoom(roomData.id, (updatedRoom) => {
          setRoom(updatedRoom);
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setRoom(null);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadRoomAndQuestions();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleSetActive = async (questionId: string) => {
    if (!room) return;
    try {
      // Use room.id (UUID), NOT room.code
      const { error } = await setActiveQuestion(room.id, questionId);
      if (error) {
        throw error;
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to set active question'));
    }
  };

  const handleClearActive = async () => {
    if (!room) return;
    try {
      // Use room.id (UUID), NOT room.code
      const { error } = await setActiveQuestion(room.id, null);
      if (error) {
        throw error;
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear active question'));
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 rounded">
          Error: {error.message}
        </div>
      </div>
    );
  }

  if (!room) {
    return <div className="p-6">No room found</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--untitled-ui-gray700)' }}>Room: {room.code}</p>
      </div>

      {room.active_question_id && (
        <div className="mb-4">
          <button
            onClick={handleClearActive}
            className="w-full px-6 py-3 text-white rounded-lg text-base font-semibold transition-colors shadow-md"
            style={{ backgroundColor: 'var(--mae_red)' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Close Reflection
          </button>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="mb-4">
          <p className="text-sm" style={{ color: 'var(--untitled-ui-gray600)' }}>No reflections ready yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--untitled-ui-gray600)' }}>
            Reflections
          </p>
          {questions.map((question) => {
            const isActive = room.active_question_id === question.id;
            return (
              <div
                key={question.id}
                className="p-4 border-2 rounded-lg"
                style={{
                  backgroundColor: isActive ? 'var(--untitled-ui-warning300)' : 'var(--untitled-ui-white)',
                  borderColor: isActive ? 'var(--untitled-ui-gray300)' : 'var(--untitled-ui-gray200)'
                }}
              >
                <div className="flex items-start gap-3 mb-2">
                  <span 
                    className="px-2 py-1 text-xs font-semibold rounded"
                    style={{
                      backgroundColor: question.type === 'mcq' 
                        ? 'var(--untitled-ui-primary100)' 
                        : question.type === 'scale'
                        ? 'var(--untitled-ui-primary100)'
                        : 'var(--untitled-ui-gray100)',
                      color: question.type === 'mcq' 
                        ? 'var(--untitled-ui-primary700)' 
                        : question.type === 'scale'
                        ? 'var(--untitled-ui-primary700)'
                        : 'var(--untitled-ui-gray700)'
                    }}
                  >
                    {question.type.toUpperCase()}
                  </span>
                  {isActive && (
                    <span 
                      className="px-2 py-1 text-xs font-semibold rounded"
                      style={{
                        backgroundColor: 'var(--untitled-ui-gray800)',
                        color: 'var(--untitled-ui-white)'
                      }}
                    >
                      OPEN
                    </span>
                  )}
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--black)' }}>{question.prompt}</p>
                <button
                  onClick={() => handleSetActive(question.id)}
                  disabled={isActive}
                  className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm text-white"
                  style={{
                    backgroundColor: isActive ? 'var(--untitled-ui-gray300)' : 'var(--black)',
                    cursor: isActive ? 'not-allowed' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray800)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--black)';
                    }
                  }}
                >
                  {isActive ? 'Currently Open' : 'Open This'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

