'use client';

import { type Photo } from '@/lib/photos';
import { type Question } from '@/lib/quiz';
import PhotoFocus from './PhotoFocus';
import LiveResultsChart from './LiveResultsChart';

type FocusPaneProps = {
  selectedPhoto: Photo | null;
  activeQuestion: Question | null;
};

export default function FocusPane({ selectedPhoto, activeQuestion }: FocusPaneProps) {
  // Quiz/Reflection state takes priority over photo
  if (activeQuestion) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 pr-12 py-12">
          <LiveResultsChart question={activeQuestion} />
        </div>
      </div>
    );
  }

  // Photo focus state
  return (
    <div className="h-full">
      <PhotoFocus photo={selectedPhoto} />
    </div>
  );
}
