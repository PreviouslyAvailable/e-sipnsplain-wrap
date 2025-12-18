'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getResponses, subscribeToResponses, type Question, type ResponseRow } from '@/lib/quiz';
import { getColorForSession } from '@/lib/colors';

type LiveResultsChartProps = {
  question: Question | null;
};

type McqData = {
  option: string;
  count: number;
};

type ScaleData = {
  range: string;
  count: number;
};

export default function LiveResultsChart({ question }: LiveResultsChartProps) {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial responses and subscribe to updates
  useEffect(() => {
    if (!question) {
      setResponses([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const loadAndSubscribe = async () => {
      try {
        setLoading(true);
        
        // Load existing responses
        const { data: initialResponses, error } = await getResponses(question.id);
        
        if (error) {
          console.error('Error loading responses:', error);
        } else {
          // getResponses maps 'answer' to 'value', so this should be ResponseRow[]
          setResponses((initialResponses || []) as unknown as ResponseRow[]);
        }

        // Subscribe to new responses
        unsubscribe = subscribeToResponses(question.id, (newResponse) => {
          setResponses((prev) => {
            // Avoid duplicates
            if (prev.some((r) => r.id === newResponse.id)) {
              return prev;
            }
            return [...prev, newResponse];
          });
        });
      } catch (err) {
        console.error('Error setting up responses:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAndSubscribe();

    // Fallback: Poll for new responses every 2 seconds in case subscription fails
    const pollInterval = setInterval(async () => {
      if (question) {
        const { data: currentResponses, error } = await getResponses(question.id);
        if (!error && currentResponses) {
          setResponses((prev) => {
            // Only update if we have new responses
            if (currentResponses.length !== prev.length) {
              // getResponses maps 'answer' to 'value', so this should be ResponseRow[]
              return currentResponses as unknown as ResponseRow[];
            }
            return prev;
          });
        }
      }
    }, 2000);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      clearInterval(pollInterval);
    };
  }, [question?.id]);

  if (!question) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">No reflection open</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">The room is responding...</p>
      </div>
    );
  }

  const responseCount = responses.length;

  // Process data based on question type
  if (question.type === 'mcq' && Array.isArray(question.options)) {
    // Count responses for each option
    const optionCounts: Record<string, number> = {};
    question.options.forEach((option) => {
      optionCounts[option] = 0;
    });

    responses.forEach((response) => {
      const answer = String(response.value).trim();
      if (optionCounts.hasOwnProperty(answer)) {
        optionCounts[answer]++;
      }
    });

    const chartData: McqData[] = question.options.map((option) => ({
      option,
      count: optionCounts[option] || 0,
    }));

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
      <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
        <div className="mb-4 flex-shrink-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {responseCount === 0 ? 'Waiting for responses...' : `${responseCount} ${responseCount === 1 ? 'person' : 'people'} responded`}
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="option" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (question.type === 'scale') {
    const scaleOptions = question.options && typeof question.options === 'object' && !Array.isArray(question.options)
      ? question.options as { left: string; right: string }
      : null;

    if (!scaleOptions) {
      return (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
          <p className="text-red-600">Invalid scale question format</p>
        </div>
      );
    }

    type ScaleResponse = {
      name: string;
      value: number;
      id: string;
      sessionId: string;
      yOffset: number;
      color: string;
    };

    // Parse scale responses
    // For scale questions, value should be a number (the position on the scale)
    // We need to get the name from session_id or another source
    // For now, we'll use session_id as the name
    const parsedResponses: ScaleResponse[] = responses
      .map((response) => {
        try {
          // If value is a number, use it directly
          // If it's a JSON string, parse it
          let value: number;
          let name: string;
          
          if (typeof response.value === 'number') {
            value = response.value;
            name = response.session_id; // Use session_id as name for now
          } else {
            const parsed = JSON.parse(String(response.value)) as { name?: string; value: number };
            value = parsed.value;
            name = parsed.name || response.session_id;
          }
          
          // Get color for this session
          const color = getColorForSession(response.session_id);
          
          return { 
            name, 
            value, 
            id: response.id, 
            sessionId: response.session_id,
            yOffset: 0,
            color,
          };
        } catch {
          // If parsing fails, try to use value as number directly
          if (typeof response.value === 'number') {
            const color = getColorForSession(response.session_id);
            return {
              name: response.session_id,
              value: response.value,
              id: response.id,
              sessionId: response.session_id,
              yOffset: 0,
              color,
            };
          }
          return null;
        }
      })
      .filter((r): r is ScaleResponse => r !== null);

    // Sort by value to group nearby values together
    parsedResponses.sort((a, b) => a.value - b.value);

    // Calculate vertical offsets for both dots and names to avoid overlap
    // Both dots and names stack vertically when close together
    const dotSize = 16; // Size of dot (4 * 4px = 16px)
    const dotSpacing = 12; // Spacing between stacked dots
    const namePillHeight = 40; // Height of name pill including padding
    const namePillSpacing = 8; // Spacing between name pill and dot
    const namePillGap = 12; // Spacing between stacked name pills (increased to prevent overlap)
    const namePillMinWidth = 80; // Minimum estimated width for name pills
    const dotProximityThreshold = 5; // Percentage points - if dots are this close, stack them
    
    // Calculate offsets: stack names at top, then dots below, with first dot on the line
    // Layout: name 2 (top), name 1, dot 2, dot 1 (on line)
    parsedResponses.forEach((response, index) => {
      if (index === 0) {
        response.yOffset = 0; // First response: dot on the line
      } else {
        // Find all previous responses with dots close to this one
        const closeDots = parsedResponses
          .slice(0, index)
          .filter((r) => Math.abs(r.value - response.value) <= dotProximityThreshold);
        
        if (closeDots.length > 0) {
          // Stack layout: names at top, then dots below, first dot on line
          // Order from top: name 2, name 1, dot 2, dot 1 (on line)
          // Dots stack from the line upward: dot 1 at 0, dot 2 above it
          const dotsAbove = closeDots.length; // Number of dots above this one
          response.yOffset = dotsAbove * (dotSize + dotSpacing);
        } else {
          response.yOffset = 0; // No close dots, dot on the line
        }
      }
    });

    // Calculate max height needed for all dots and names (above the line)
    // Need space for: all stacked dots + spacing + all stacked names
    // Group responses to find max stack size
    const maxStackSize = Math.max(
      ...Array.from(new Set(parsedResponses.map(r => {
        const stackItems = parsedResponses.filter(s => 
          Math.abs(s.value - r.value) <= dotProximityThreshold
        );
        return stackItems.length;
      }))),
      1
    );
    
    const allDotsHeight = (maxStackSize - 1) * (dotSize + dotSpacing) + dotSize;
    const allNamesHeight = maxStackSize * namePillHeight + (maxStackSize - 1) * namePillGap;
    const maxHeight = allDotsHeight + namePillSpacing + allNamesHeight + 30; // Extra space for padding

    return (
      <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
        {/* Question prompt - bold and centered at top */}
        <div className="mb-6 text-center flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{question.prompt}</h3>
        </div>
        
        <div className="relative flex-1 flex flex-col justify-center">
          {/* Responses - above the line */}
          <div className="relative mb-1" style={{ height: `${maxHeight}px`, paddingBottom: '2px' }}>
            {parsedResponses.map((response) => (
              <div
                key={response.id}
                className="absolute transition-all duration-300"
                style={{
                  left: `${response.value}%`,
                  bottom: `${response.yOffset}px`, // Dots stack vertically based on yOffset
                  transform: 'translateX(-50%)',
                }}
              >
                {/* Name pill - all names stack together at top, above all dots */}
                <div
                  className="absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium shadow-md z-10 border-2 border-gray-300 dark:border-gray-600"
                  style={{ 
                    backgroundColor: response.color,
                    // Position name: all names stack at top, then dots below
                    // Order: name 2 (top), name 1, dot 2, dot 1 (on line)
                    bottom: (() => {
                      // Find all items in this stack (responses with close values)
                      const stackItems = parsedResponses.filter(r => 
                        Math.abs(r.value - response.value) <= dotProximityThreshold
                      );
                      // Sort by value (ascending) - first item has lowest value
                      const sortedStack = [...stackItems].sort((a, b) => a.value - b.value);
                      const thisIndex = sortedStack.findIndex(r => r.id === response.id);
                      const totalInStack = sortedStack.length;
                      
                      // Calculate all dots height (all dots stacked)
                      const allDotsHeight = (totalInStack - 1) * (dotSize + dotSpacing) + dotSize;
                      
                      // Names stack from top: highest value = top name (name 2), lowest value = bottom name (name 1)
                      // In sorted stack: index 0 = lowest value (name 1), index N-1 = highest value (name 2 = top)
                      // So name position from top: totalInStack - 1 - thisIndex
                      // 0 = top name, increases as we go down
                      const namePositionFromTop = totalInStack - 1 - thisIndex;
                      
                      // Position names from top to bottom with proper spacing
                      // namePositionFromTop: 0 = top name, increases as we go down
                      // Using bottom positioning: position the bottom edge of each name pill
                      // Top name (position 0): highest position
                      // Each name below: offset by (height + gap) from the one above
                      
                      // Calculate total height of all names above this one (including gaps)
                      const namesAbove = namePositionFromTop;
                      const totalHeightAbove = namesAbove * (namePillHeight + namePillGap);
                      
                      // Position: all dots + spacing + all names above + this name's height
                      // This positions the bottom edge, so the name extends upward
                      const nameBottomPosition = allDotsHeight + namePillSpacing + totalHeightAbove + namePillHeight;
                      return `${nameBottomPosition}px`;
                    })()
                  }}
                >
                  <span className="text-black font-semibold">{response.name}</span>
                </div>
                {/* Dot - positioned at yOffset (first dot at 0 = on the line) */}
                <div 
                  className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-md"
                  style={{ 
                    backgroundColor: response.color,
                    bottom: `${response.yOffset}px` // yOffset=0 means on the line
                  }}
                ></div>
              </div>
            ))}
          </div>
          
          {/* Horizontal line */}
          <div className="h-1 bg-gray-400 dark:bg-gray-500 w-full mb-2"></div>
          
          {/* Labels */}
          <div className="flex justify-between text-sm font-semibold">
            <span>{scaleOptions.left}</span>
            <span>{scaleOptions.right}</span>
          </div>
        </div>
      </div>
    );
  }

  // Text responses - show list
  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
      <div className="mb-4 flex-shrink-0">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {responseCount === 0 ? 'Waiting for responses...' : `What the room is saying:`}
        </p>
      </div>
      {responses.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No responses yet</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {responses.map((response) => (
            <div
              key={response.id}
              className="p-3 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
            >
              <p className="text-gray-900 dark:text-gray-100">{String(response.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

