'use client';

import { useState } from 'react';
import { getRoomByCode, getQuestions, getQuestionById } from '@/lib/quiz';
import { supabase } from '@/lib/supabaseClient';

export default function TestResponsesPage() {
  const [roomCode] = useState('SIP2025');
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const { data: roomData } = await getRoomByCode(roomCode);
      if (!roomData) {
        setMessage('Room not found');
        return;
      }

      const { data: questionsData } = await getQuestions(roomData.id);
      setQuestions(questionsData || []);
      if (questionsData && questionsData.length > 0) {
        setSelectedQuestionId(questionsData[0].id);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const insertTestResponses = async () => {
    if (!selectedQuestionId) {
      setMessage('Please select a question first');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      // Get question to get room_id
      const { data: question, error: questionError } = await getQuestionById(selectedQuestionId);
      if (questionError || !question) {
        setMessage('Question not found');
        return;
      }

      const testNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
      const responses = [];

      if (question.type === 'mcq' && Array.isArray(question.options)) {
        // For MCQ, distribute responses across options
        for (let i = 0; i < testNames.length; i++) {
          const option = question.options[i % question.options.length];
          responses.push({
            room_id: question.room_id,
            question_id: selectedQuestionId,
            session_id: `test_session_${i}`,
            answer: option,
          });
        }
      } else if (question.type === 'scale') {
        // For scale, distribute across the range
        for (let i = 0; i < testNames.length; i++) {
          const value = Math.round((i / (testNames.length - 1)) * 100); // 0 to 100
          const responseValue = JSON.stringify({
            name: testNames[i],
            value: value,
          });
          responses.push({
            room_id: question.room_id,
            question_id: selectedQuestionId,
            session_id: `test_session_${i}`,
            answer: responseValue,
          });
        }
      } else {
        // For text, use sample responses
        const sampleTexts = [
          'Great experience!',
          'Could be better',
          'Loved it!',
          'Needs improvement',
          'Amazing!',
          'Pretty good',
          'Excellent',
          'Not bad',
          'Fantastic',
          'Room for growth',
        ];
        for (let i = 0; i < testNames.length; i++) {
          responses.push({
            room_id: question.room_id,
            question_id: selectedQuestionId,
            session_id: `test_session_${i}`,
            answer: sampleTexts[i] || `Response ${i + 1}`,
          });
        }
      }

      // Insert all responses
      const { error } = await supabase.from('responses').insert(responses);

      if (error) {
        setMessage(`Error inserting: ${error.message}`);
      } else {
        setMessage(`Successfully inserted ${responses.length} test responses!`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResponses = async () => {
    if (!selectedQuestionId) {
      setMessage('Please select a question first');
      return;
    }

    if (!confirm('Are you sure you want to delete all responses for this question?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('responses')
        .delete()
        .eq('question_id', selectedQuestionId);

      if (error) {
        setMessage(`Error deleting: ${error.message}`);
      } else {
        setMessage('All responses cleared!');
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Responses Generator</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div>
            <button
              onClick={loadQuestions}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Load Questions
            </button>
          </div>

          {questions.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Select Question:</label>
              <select
                value={selectedQuestionId}
                onChange={(e) => setSelectedQuestionId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.prompt} ({q.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedQuestionId && (
            <div className="flex gap-4">
              <button
                onClick={insertTestResponses}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
              >
                Insert 10 Test Responses
              </button>
              <button
                onClick={clearResponses}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
              >
                Clear All Responses
              </button>
            </div>
          )}

          {message && (
            <div className={`p-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p className="font-semibold mb-2">Alternative testing methods:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Open multiple browser tabs/windows and submit from each (each gets unique session)</li>
            <li>Use incognito/private windows for isolated sessions</li>
            <li>Clear localStorage between tests to get new session IDs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

