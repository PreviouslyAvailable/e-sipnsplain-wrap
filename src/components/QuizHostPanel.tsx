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
        
        setRoom(roomData);
        setError(null);
        
        const { data: questionsData, error: questionsError } = await getQuestions(roomData.id);
        
        if (questionsError) {
          throw questionsError;
        }
        
        setQuestions((questionsData || []).sort((a, b) => a.order_index - b.order_index));

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
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded">
          Error: {error.message}
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">No room found</p>
      </div>
    );
  }

  const activeQuestion = room.active_question_id 
    ? questions.find((q) => q.id === room.active_question_id)
    : null;

  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Room: {room.code}</p>
      </div>

      {room.active_question_id && (
        <div className="mb-4">
          <button
            onClick={handleClearActive}
            className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-base font-semibold transition-colors shadow-md"
          >
            Close Reflection
          </button>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">No reflections ready yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Reflections
          </p>
          {questions.map((question) => {
            const isActive = room.active_question_id === question.id;
            return (
              <div
                key={question.id}
                className={`p-4 border-2 rounded-lg ${
                  isActive 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 dark:border-yellow-600' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    question.type === 'mcq' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                      : question.type === 'scale'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {question.type.toUpperCase()}
                  </span>
                  {isActive && (
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                      OPEN
                    </span>
                  )}
                </div>
                <p className="text-sm mb-3 text-gray-900 dark:text-gray-100">{question.prompt}</p>
                <button
                  onClick={() => handleSetActive(question.id)}
                  disabled={isActive}
                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                  {isActive ? 'Currently Open' : 'Open This'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeQuestion && (
        <div className="mt-8">
          <LiveResultsChart question={activeQuestion} />
        </div>
      )}
    </div>
  );
}

