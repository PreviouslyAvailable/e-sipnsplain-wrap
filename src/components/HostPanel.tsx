'use client';

import { useEffect, useState } from 'react';
import { getRoomByCode, getQuestions, setActiveQuestion, startSession, clearResponsesForQuestion, markQuestionAsUsed, resetAllQuestions, subscribeToRoom, type Room, type Question } from '@/lib/quiz';
import { clearAllAnsweredQuestions, clearQuestionAnswered } from '@/lib/localStorage';

export default function HostPanel() {
  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingQuestionId, setOpeningQuestionId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadRoomAndQuestions = async () => {
      try {
        setLoading(true);
        const { data: roomData, error: roomError } = await getRoomByCode("SIP2025");
        
        if (roomError || !roomData) {
          throw roomError || new Error('Failed to load room');
        }
        
        // Normalize session_started to false if null/undefined
        const normalizedRoom = {
          ...roomData,
          session_started: roomData.session_started === true,
        };
        
        // Store the full room object including id (UUID)
        setRoom(normalizedRoom);
        setError(null);
        
        // Use room.id (UUID), NOT room.code
        const { data: questionsData, error: questionsError } = await getQuestions(roomData.id);
        
        if (questionsError) {
          throw questionsError;
        }
        
        setQuestions((questionsData || []).sort((a, b) => a.order_index - b.order_index));

        // Subscribe to realtime updates on the rooms table
        unsubscribe = subscribeToRoom(roomData.id, (updatedRoom) => {
          // Normalize session_started in subscription updates too
          const normalizedUpdatedRoom = {
            ...updatedRoom,
            session_started: updatedRoom.session_started === true,
          };
          setRoom(normalizedUpdatedRoom);
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
    
    // Prevent multiple simultaneous opens
    if (openingQuestionId === questionId) {
      return;
    }
    
    // Prevent opening questions if session hasn't started
    if (room.session_started !== true) {
      setError(new Error('Please start the session first before opening questions'));
      return;
    }
    
    // Check if question is already used - prevent reopening
    // Check local state first
    const question = questions.find(q => q.id === questionId);
    if (question?.used === true) {
      setError(new Error('This question has already been opened and cannot be opened again'));
      return;
    }
    
    // ALWAYS double-check with database to prevent race conditions
    // This is critical to ensure we have the latest state
    const { data: freshQuestions, error: fetchError } = await getQuestions(room.id);
    if (fetchError) {
      setError(new Error('Failed to verify question status'));
      return;
    }
    
    if (!freshQuestions || freshQuestions.length === 0) {
      setError(new Error('No questions found'));
      return;
    }
    
    const freshQuestion = freshQuestions.find(q => q.id === questionId);
    if (!freshQuestion) {
      setError(new Error('Question not found'));
      return;
    }
    
    // Explicit check for used flag - handle boolean true, number 1, or string 'true'
    const isUsedInDb = freshQuestion.used === true || freshQuestion.used === 1 || freshQuestion.used === 'true';
    
    if (isUsedInDb) {
      console.log('Question is already used in database, preventing open:', { questionId, used: freshQuestion.used });
      // Update local state to match database
      setQuestions((freshQuestions || []).sort((a, b) => a.order_index - b.order_index));
      setError(new Error('This question has already been opened and cannot be opened again'));
      return;
    }
    
    // Update local state with fresh data to ensure consistency
    setQuestions((freshQuestions || []).sort((a, b) => a.order_index - b.order_index));
    
    // Prevent opening if already active
    if (room.active_question_id === questionId) {
      setError(new Error('This question is already open'));
      return;
    }
    
    setOpeningQuestionId(questionId);
    
    try {
      // Clear all responses for the question being opened (so it starts fresh)
      const { error: clearError } = await clearResponsesForQuestion(questionId);
      if (clearError) {
        console.error('Error clearing responses:', clearError);
        // Continue anyway - clearing responses is not critical
      }
      
      // Also clear localStorage for this question so join pages show it as unanswered
      clearQuestionAnswered(questionId);
      
      // Use room.id (UUID), NOT room.code
      const { error } = await setActiveQuestion(room.id, questionId);
      if (error) {
        throw error;
      }
      setError(null);
      
      // Reload questions to get updated used status from database
      const { data: questionsData, error: questionsError } = await getQuestions(room.id);
      if (!questionsError && questionsData) {
        setQuestions((questionsData || []).sort((a, b) => a.order_index - b.order_index));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to set active question'));
      // Revert local state change on error
      const { data: questionsData } = await getQuestions(room.id);
      if (questionsData) {
        setQuestions((questionsData || []).sort((a, b) => a.order_index - b.order_index));
      }
    } finally {
      setOpeningQuestionId(null);
    }
  };

  const handleClearActive = async () => {
    if (!room || !room.active_question_id) return;
    const questionIdToClose = room.active_question_id;
    
    console.log('Closing question:', { questionIdToClose, roomId: room.id });
    
    try {
      // First verify the question exists
      const { data: verifyBeforeUpdate } = await getQuestions(room.id);
      const questionExists = verifyBeforeUpdate?.find(q => q.id === questionIdToClose);
      if (!questionExists) {
        console.error('Question not found before update:', { questionIdToClose, allQuestions: verifyBeforeUpdate });
        throw new Error('Question not found');
      }
      console.log('Question found before update:', { questionId: questionIdToClose, currentUsed: questionExists.used });
      
      // Mark the question as used FIRST before closing
      const { data: updateResult, error: markError } = await markQuestionAsUsed(questionIdToClose);
      if (markError) {
        console.error('Error marking question as used:', markError);
        throw new Error(`Failed to mark question as used: ${markError.message}`);
      }
      
      // Check if the update actually returned data
      if (!updateResult || updateResult.length === 0) {
        console.error('Update returned no data:', { questionIdToClose, updateResult, markError });
        // Try to continue anyway - maybe the update worked but didn't return data
        console.warn('Update returned no data, but continuing with close operation');
      } else {
        // Check the returned data to see if used was set
        const updatedQuestion = updateResult[0];
        console.log('Update result:', { questionId: questionIdToClose, returnedUsed: updatedQuestion.used, updateResult });
        
        if (updatedQuestion.used !== true) {
          console.error('Update did not set used to true:', { 
            questionId: questionIdToClose, 
            returnedUsed: updatedQuestion.used,
            updateResult 
          });
          // Don't throw - try to continue and verify later
        } else {
          console.log('Question successfully marked as used:', { questionId: questionIdToClose, used: updatedQuestion.used });
        }
      }
      
      // Update local state immediately to show it's used
      setQuestions(prev => prev.map(q => 
        q.id === questionIdToClose ? { ...q, used: true } : q
      ));
      
      // Use room.id (UUID), NOT room.code
      const { error } = await setActiveQuestion(room.id, null);
      if (error) {
        throw error;
      }
      setError(null);
      
      // Final reload to ensure everything is synced
      const { data: questionsData, error: questionsError } = await getQuestions(room.id);
      if (!questionsError && questionsData) {
        const updatedQuestions = (questionsData || []).sort((a, b) => a.order_index - b.order_index);
        setQuestions(updatedQuestions);
        
        // Double-check the question is marked as used
        const finalCheck = updatedQuestions.find(q => q.id === questionIdToClose);
        if (finalCheck?.used !== true) {
          console.error('CRITICAL: Question used flag not persisted after reload:', { 
            questionId: questionIdToClose,
            finalCheck,
            allQuestions: updatedQuestions 
          });
        } else {
          console.log('Question used flag confirmed after reload:', { questionId: questionIdToClose, used: finalCheck.used });
        }
      }
    } catch (err) {
      console.error('Error in handleClearActive:', err);
      setError(err instanceof Error ? err : new Error('Failed to clear active question'));
      // Reload questions on error to get correct state
      const { data: questionsData } = await getQuestions(room.id);
      if (questionsData) {
        setQuestions((questionsData || []).sort((a, b) => a.order_index - b.order_index));
      }
    }
  };

  const handleResetAll = async () => {
    if (!room) return;
    if (!confirm('Are you sure you want to reset all questions? This will clear all responses and allow questions to be opened again.')) {
      return;
    }
    try {
      setError(null);
      const { error } = await resetAllQuestions(room.id);
      if (error) {
        console.error('Reset error:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        
        // Show a more helpful error message
        if (errorMessage.includes('migration') || errorMessage.includes('column')) {
          alert(`Error: ${errorMessage}\n\nPlease run the migration SQL in your Supabase SQL Editor:\n\nSee migration-add-used-to-questions.sql`);
        } else if (errorMessage.includes('permission') || errorMessage.includes('policy')) {
          alert(`Error: ${errorMessage}\n\nPlease ensure the database policies are set up correctly. Run the migration SQL.`);
        } else {
          alert(`Error: ${errorMessage}`);
        }
        
        setError(error);
        return;
      }
      
      // Clear localStorage cache for all answered questions
      // This ensures join pages will show questions as unanswered after reset
      clearAllAnsweredQuestions();
      
      // Reload questions to get updated used status
      const { data: questionsData, error: questionsError } = await getQuestions(room.id);
      if (!questionsError && questionsData) {
        setQuestions((questionsData || []).sort((a, b) => a.order_index - b.order_index));
        setError(null);
      } else if (questionsError) {
        setError(new Error(`Failed to reload questions: ${questionsError.message}`));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Failed to reset questions:', err);
      setError(new Error(`Failed to reset questions: ${errorMessage}`));
      alert(`Error: ${errorMessage}`);
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

      {/* Start Session button at the top */}
      {!room.session_started && (
        <div className="mb-6">
          <button
            onClick={async () => {
              if (!room) return;
              try {
                const { error } = await startSession(room.id);
                if (error) {
                  throw error;
                }
                setError(null);
              } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to start session'));
              }
            }}
            className="w-full px-6 py-3 text-white rounded-lg text-base font-semibold transition-colors shadow-md"
            style={{ backgroundColor: 'var(--black)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray800)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--black)'}
          >
            Start Session
          </button>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--untitled-ui-gray600)' }}>
            Start the session to enable question controls
          </p>
        </div>
      )}

      {/* Reset button - only show when session has started */}
      {room.session_started && (
        <div className="mb-4">
          <button
            onClick={handleResetAll}
            className="w-full px-6 py-3 rounded-lg text-base font-semibold transition-colors shadow-md"
            style={{ 
              backgroundColor: 'var(--untitled-ui-gray200)',
              color: 'var(--untitled-ui-gray700)',
              border: '1px solid var(--untitled-ui-gray300)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray300)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray200)'}
          >
            Reset All Questions
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
            const isUsed = question.used === true;
            return (
              <div
                key={question.id}
                className="p-4 border-2 rounded-lg"
                style={{
                  backgroundColor: isActive ? 'var(--untitled-ui-warning300)' : isUsed ? 'var(--untitled-ui-gray100)' : 'var(--untitled-ui-white)',
                  borderColor: isActive ? 'var(--untitled-ui-gray300)' : isUsed ? 'var(--untitled-ui-gray300)' : 'var(--untitled-ui-gray200)',
                  opacity: isUsed && !isActive ? 0.6 : 1
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
                <p className="text-sm mb-3" style={{ color: isUsed && !isActive ? 'var(--untitled-ui-gray600)' : 'var(--black)' }}>{question.prompt}</p>
                <div className="flex gap-2">
                  {isActive ? (
                    <button
                      onClick={handleClearActive}
                      disabled={!isActive}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm text-white"
                      style={{
                        backgroundColor: 'var(--mae_red)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSetActive(question.id)}
                      disabled={isUsed || room.session_started !== true || openingQuestionId === question.id}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm text-white"
                      style={{
                        backgroundColor: (isUsed || room.session_started !== true || openingQuestionId === question.id) ? 'var(--untitled-ui-gray400)' : 'var(--black)',
                        cursor: (isUsed || room.session_started !== true || openingQuestionId === question.id) ? 'not-allowed' : 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!isUsed && room.session_started === true && openingQuestionId !== question.id) {
                          e.currentTarget.style.backgroundColor = 'var(--untitled-ui-gray800)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isUsed && room.session_started === true && openingQuestionId !== question.id) {
                          e.currentTarget.style.backgroundColor = 'var(--black)';
                        }
                      }}
                    >
                      {isUsed ? 'Already Used' : openingQuestionId === question.id ? 'Opening...' : room.session_started !== true ? 'Start Session First' : 'Open'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

