git add src/components/QuizHostPanel.tsx
git commit -m "Fix LiveResultsChart props mismatch"
git push

'use client';

import { useEffect, useState } from 'react';
import { getRoomByCode, getQuestions, setActiveQuestion, subscribeToRoom, type Room, type Question } from '@/lib/quiz';
import LiveResultsChart from './LiveResultsChart';

export default function QuizHostPanel() {
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
    <div className="p-6">
      <div className="mb-6">
        <p className="text-lg font-semibold">Room loaded: {room.code} ({room.id})</p>
      </div>

      <div className="mb-6">
        <button
          onClick={handleClearActive}
          disabled={!room.active_question_id}
          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-lg font-medium transition-colors"
        >
          Clear Active Question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="mb-6">
          {/* Display room.id (UUID) to verify we're using the UUID, not the code */}
          <p>No questions found for room {room.id}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => {
            const isActive = room.active_question_id === question.id;
            return (
              <div
                key={question.id}
                className={`p-6 border-2 rounded-lg ${
                  isActive 
                    ? 'bg-yellow-100 border-yellow-500' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 text-sm font-semibold rounded ${
                        question.type === 'mcq' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {question.type.toUpperCase()}
                      </span>
                      {isActive && (
                        <span className="px-3 py-1 text-sm font-semibold rounded bg-yellow-200 text-yellow-800">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-lg">{question.prompt}</p>
                  </div>
                  <button
                    onClick={() => handleSetActive(question.id)}
                    disabled={isActive}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-lg font-medium transition-colors"
                  >
                    Set Active
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Render results for active question */}
      {room.active_question_id && (
        <div className="mt-8">
          {(() => {
            const activeQuestion = questions.find((q) => q.id === room.active_question_id);
            return activeQuestion ? (
              <LiveResultsChart question={activeQuestion} />
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

