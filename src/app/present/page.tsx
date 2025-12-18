'use client';

import { useState, useEffect } from 'react';
import HorizontalTimeline from '@/components/HorizontalTimeline';
import PhotoFocus from '@/components/PhotoFocus';
import LiveResultsChart from '@/components/LiveResultsChart';
import { getRoomByCode, getQuestionById, subscribeToRoom, type Room, type Question } from '@/lib/quiz';
import { type Photo } from '@/lib/photos';

export default function PresentPage() {
  const [roomCode] = useState("SIP2025");
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

  // Load room
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadRoom = async () => {
      try {
        const { data: roomData, error } = await getRoomByCode(roomCode);
        if (error) {
          console.error('Error loading room:', error);
          return;
        }
        if (roomData) {
          setRoom(roomData);
          unsubscribe = subscribeToRoom(roomData.id, (updatedRoom) => {
            setRoom(updatedRoom);
          });
        }
      } catch (err) {
        console.error('Failed to load room:', err);
      }
    };
    loadRoom();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [roomCode]);

  // Load active question when it changes
  useEffect(() => {
    if (!room?.active_question_id) {
      setActiveQuestion(null);
      return;
    }

    const loadQuestion = async () => {
      const { data: questionData, error } = await getQuestionById(room.active_question_id!);
      if (questionData && !error) {
        setActiveQuestion(questionData);
      }
    };

    loadQuestion();
  }, [room?.active_question_id]);

  if (!room) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--untitled-ui-gray600)' }}>Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col relative" style={{ backgroundColor: 'var(--untitled-ui-white)' }}>
      {/* Minimal header */}
      <header className="flex-shrink-0 px-6 py-4" style={{ borderBottom: '1px solid var(--untitled-ui-gray200)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>Sip&apos;n&apos;Sleigh</h1>
      </header>

      {/* Main content - full width when no question, split when question active */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Timeline Pane */}
        <div 
          className={`${activeQuestion ? 'w-2/5' : 'w-1/2'} transition-all`}
          style={{ 
            borderRight: '1px solid var(--untitled-ui-gray200)',
            opacity: activeQuestion ? 0.4 : 1
          }}
        >
          <HorizontalTimeline
            selectedPhotoId={selectedPhoto?.id || null}
            onPhotoSelect={setSelectedPhoto}
          />
        </div>

        {/* Right: Focus Pane (only show when no active question) */}
        {!activeQuestion && (
          <div className="w-1/2">
            <PhotoFocus photo={selectedPhoto} />
          </div>
        )}
      </div>

      {/* Full-screen popup overlay for active question */}
      {activeQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[10%]" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
          <div className="w-full h-full rounded-lg shadow-2xl overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--untitled-ui-white)' }}>
            <div className="flex-1 overflow-y-auto flex flex-col">
              <LiveResultsChart question={activeQuestion} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

