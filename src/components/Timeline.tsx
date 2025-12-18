'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getRoomByCode, subscribeToRoom, type Room } from '@/lib/quiz';
import { getTimelineMoments, getPhotoUrl, type TimelineMoment } from '@/lib/timeline';
import momentsData from '@/data/moments.json';

type TimelineMomentData = {
  id: string;
  date: string;
  photo_url: string;
  caption: string | null;
  month: string;
  question_id: string | null;
};

type TimelineProps = {
  roomCode?: string;
  isHost?: boolean;
  onMomentClick?: (moment: TimelineMomentData) => void;
  onScroll?: (scrollPosition: number, activeMonth: string) => void;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Timeline({ roomCode = "SIP2025", isHost = false, onMomentClick, onScroll }: TimelineProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [moments, setMoments] = useState<TimelineMomentData[]>([]);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  // Load room and moments
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadData = async () => {
      try {
        const { data: roomData, error: roomError } = await getRoomByCode(roomCode);
        
        if (roomError || !roomData) {
          console.error('Failed to load room:', roomError);
          return;
        }
        
        setRoom(roomData);

        // Try to load from database first, fallback to JSON
        const { data: dbMoments, error: momentsError } = await getTimelineMoments(roomData.id);
        
        if (momentsError || !dbMoments || dbMoments.length === 0) {
          // Fallback to JSON data
          const jsonMoments = (momentsData as any[]).map((m) => ({
            id: m.id,
            date: m.date,
            photo_url: m.photo_url,
            caption: m.caption || null,
            month: m.month,
            question_id: m.question_id || null,
          }));
          setMoments(jsonMoments);
        } else {
          const formattedMoments = dbMoments.map((m) => ({
            id: m.id,
            date: m.date,
            photo_url: m.photo_url,
            caption: m.caption,
            month: new Date(m.date).toLocaleString('default', { month: 'long' }),
            question_id: m.question_id,
          }));
          setMoments(formattedMoments);
        }

        // Subscribe to room updates for timeline position
        unsubscribe = subscribeToRoom(roomData.id, (updatedRoom) => {
          setRoom(updatedRoom);
          
          // Sync timeline position for participants
          if (!isHost && updatedRoom.timeline_position) {
            const { scrollPosition, activeMomentId } = updatedRoom.timeline_position;
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollLeft = scrollPosition;
              setActiveMomentId(activeMomentId);
            }
          }
        });
      } catch (err) {
        console.error('Error loading timeline:', err);
      }
    };

    loadData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [roomCode, isHost]);

  // Handle scroll for host
  const handleScroll = useCallback(() => {
    if (!isHost || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    const scrollCenter = scrollLeft + containerWidth / 2;

    // Find which month is currently in view
    const monthElements = container.querySelectorAll('[data-month]');
    let currentMonth: string | null = null;

    monthElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elLeft = rect.left - container.getBoundingClientRect().left + scrollLeft;
      const elRight = elLeft + rect.width;

      if (scrollCenter >= elLeft && scrollCenter <= elRight) {
        currentMonth = el.getAttribute('data-month');
      }
    });

    setActiveMonth(currentMonth);

    // Debounce position updates
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (room && isHost) {
        // Update timeline position in database
        // This will be handled by the parent component via onScroll callback
        onScroll?.(scrollLeft, currentMonth || '');
      }
    }, 150);
  }, [isHost, room, onScroll]);

  // Group moments by month manually (since we're using JSON data structure)
  const momentsByMonth = new Map<string, TimelineMomentData[]>();
  moments.forEach((moment) => {
    const month = moment.month;
    if (!momentsByMonth.has(month)) {
      momentsByMonth.set(month, []);
    }
    momentsByMonth.get(month)!.push(moment);
  });

  // Get all months that have moments
  const monthsWithMoments = Array.from(momentsByMonth.keys()).sort((a, b) => {
    return MONTHS.indexOf(a) - MONTHS.indexOf(b);
  });

  return (
    <div className="h-full flex flex-col">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="inline-flex h-full min-w-full">
          {MONTHS.map((month) => {
            const monthMoments = momentsByMonth.get(month) || [];
            const hasMoments = monthMoments.length > 0;
            const isActive = activeMonth === month;

            return (
              <div
                key={month}
                data-month={month}
                className={`flex-shrink-0 w-80 md:w-96 lg:w-[500px] h-full border-r border-gray-200 dark:border-gray-700 ${
                  isActive ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-900'
                } transition-colors duration-300`}
              >
                {/* Month header */}
                <div className={`sticky top-0 z-10 p-4 border-b ${
                  isActive 
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' 
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                } transition-colors`}>
                  <h3 className={`text-xl font-semibold ${
                    isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {month}
                  </h3>
                  {hasMoments && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {monthMoments.length} {monthMoments.length === 1 ? 'moment' : 'moments'}
                    </p>
                  )}
                </div>

                {/* Photo grid */}
                {hasMoments ? (
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {monthMoments.map((moment) => {
                      const photoUrl = getPhotoUrl(moment.photo_url);
                      const isActiveMoment = activeMomentId === moment.id;

                      return (
                        <button
                          key={moment.id}
                          onClick={() => {
                            setActiveMomentId(moment.id);
                            onMomentClick?.({
                              id: moment.id,
                              date: moment.date,
                              photo_url: moment.photo_url,
                              caption: moment.caption,
                              month: month,
                              question_id: moment.question_id,
                            });
                          }}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isActiveMoment
                              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-300 dark:ring-blue-600'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                        >
                          <img
                            src={photoUrl}
                            alt={moment.caption || `Moment from ${month}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {moment.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 line-clamp-2">
                              {moment.caption}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 dark:text-gray-600">
                    No moments
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
