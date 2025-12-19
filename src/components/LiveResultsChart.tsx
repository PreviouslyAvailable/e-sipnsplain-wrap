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
      <div className="p-6 rounded-lg border-2" style={{ backgroundColor: 'var(--untitled-ui-gray50)', borderColor: 'var(--untitled-ui-gray200)' }}>
        <p style={{ color: 'var(--untitled-ui-gray600)' }}>No reflection open</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 rounded-lg border-2" style={{ backgroundColor: 'var(--untitled-ui-gray50)', borderColor: 'var(--untitled-ui-gray200)' }}>
        <p style={{ color: 'var(--untitled-ui-gray600)' }}>The room is responding...</p>
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

    // Use actual hex color values for SVG fill attributes (CSS custom properties don't work in SVG)
    const colors = ['#000000', '#344054', '#475467', '#6941c6', '#eb533b', '#1d2939'];

    return (
      <div className="h-full flex flex-col p-6 rounded-lg border-2" style={{ backgroundColor: 'var(--untitled-ui-gray50)', borderColor: 'var(--untitled-ui-gray200)' }}>
        <div className="mb-4 flex-shrink-0">
          <p className="text-sm mb-4" style={{ color: 'var(--untitled-ui-gray700)' }}>
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
        <div className="p-6 rounded-lg border-2" style={{ backgroundColor: 'var(--untitled-ui-gray50)', borderColor: 'var(--untitled-ui-gray200)' }}>
          <p style={{ color: 'var(--mae_red)' }}>Invalid scale question format</p>
        </div>
      );
    }

    type ScaleResponse = {
      name: string;
      value: number;
      id: string;
      sessionId: string;
      yOffset: number;
      nameBottomPosition: number;
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
            nameBottomPosition: 0,
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
              nameBottomPosition: 0,
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
    const dotSize = 20; // Size of dot (5 * 4px = 20px) - slightly larger
    const dotSpacing = -8; // Negative spacing = overlap between stacked dots (dots overlap by 8px)
    const namePillHeight = 32; // Height of name pill including padding - more compact
    const namePillSpacing = 12; // Spacing between name pill and dot - increased for better visual separation
    const namePillGap = 10; // Spacing between stacked name pills (kept the same)
    const namePillMinWidth = 80; // Minimum estimated width for name pills
    const dotProximityThreshold = 5; // Percentage points - if dots are this close, stack them
    
    // Group responses by proximity - responses with similar values form a stack
    const stacks: ScaleResponse[][] = [];
    parsedResponses.forEach((response) => {
      // Find if this response belongs to an existing stack
      let addedToStack = false;
      for (const stack of stacks) {
        // Check if any response in this stack is close to the current response
        if (stack.some(r => Math.abs(r.value - response.value) <= dotProximityThreshold)) {
          stack.push(response);
          addedToStack = true;
          break;
        }
      }
      // If not added to any stack, create a new stack
      if (!addedToStack) {
        stacks.push([response]);
      }
    });
    
    // Now assign positions within each stack
    // Layout: name 2 (top), name 1, dot 2, dot 1 (on line)
    // Dots: lowest value = dot 1 (on line at 0), next = dot 2 (above), etc.
    // Names: highest value = name 2 (top), next = name 1 (below), etc.
    stacks.forEach((stack) => {
      // Sort stack by value (ascending) for dot positioning
      const sortedByValue = [...stack].sort((a, b) => a.value - b.value);
      const stackSize = sortedByValue.length;
      
      sortedByValue.forEach((response, dotIndex) => {
        // Dot position: first dot (lowest value) at 0 (on line), next dots stack upward
        // Each dot is dotSize tall, with dotSpacing between them
        // Dot 0: bottom at 0 (on line)
        // Dot 1: bottom at dotSize + dotSpacing (above dot 0)
        // Dot 2: bottom at 2*(dotSize + dotSpacing) (above dot 1)
        response.yOffset = dotIndex === 0 ? 0 : dotIndex * (dotSize + dotSpacing);
        
        // Name position: highest value gets top name position, lowest gets bottom name position
        // Reverse the order for names: highest value = top name (index 0), lowest = bottom name
        const nameIndex = stackSize - 1 - dotIndex; // 0 = top name, increases downward
        
        // Calculate name position relative to the container
        // The container is positioned at the dot's yOffset from the line
        // Each container has one dot at bottom: 0 (relative to container)
        // We want all names to stack above ALL dots in the entire stack
        // 
        // Layout from bottom to top:
        // - Dot 1 (lowest value, at yOffset=0, dot at container bottom: 0)
        // - Dot 2 (next value, at yOffset=34, dot at container bottom: 0)
        // - ... more dots ...
        // - Spacing between dots and names
        // - Name 2 (highest value, top name)
        // - Name 1 (lower value, below name 2)
        //
        // For name positioning: we need to position names above the highest dot in the stack
        // The highest dot is at yOffset = (stackSize-1) * (dotSize + dotSpacing)
        // But since each container's dot is at bottom: 0 relative to that container,
        // we need to position names relative to the container's position
        // 
        // Name should be: above highest dot + spacing + names above + this name height
        const highestDotYOffset = (stackSize - 1) * (dotSize + dotSpacing);
        const namesAbove = nameIndex; // How many names are above this one (0 = top name)
        const namesAboveHeight = namesAbove * (namePillHeight + namePillGap);
        
        // Position name: above highest dot + spacing + names above + this name's height
        // Since this container is at response.yOffset, and highest dot is at highestDotYOffset,
        // we need: (highestDotYOffset - response.yOffset) + dotSize + spacing + namesAbove + nameHeight
        const offsetFromHighestDot = highestDotYOffset - response.yOffset;
        response.nameBottomPosition = offsetFromHighestDot + dotSize + namePillSpacing + namesAboveHeight + namePillHeight;
      });
    });

    // Calculate max height needed for all dots and names (above the line)
    // Find the largest stack size
    const maxStackSize = Math.max(...stacks.map(s => s.length), 1);
    
    const allDotsHeight = maxStackSize * dotSize + (maxStackSize - 1) * dotSpacing;
    const allNamesHeight = maxStackSize * namePillHeight + (maxStackSize - 1) * namePillGap;
    const maxHeight = allDotsHeight + namePillSpacing + allNamesHeight + 30; // Extra space for padding

    return (
      <div className="h-full flex flex-col p-6 rounded-lg border-2" style={{ backgroundColor: 'var(--untitled-ui-gray50)', borderColor: 'var(--untitled-ui-gray200)' }}>
        {/* Question prompt - bold and centered at top */}
        <div className="mb-6 text-center flex-shrink-0">
          <h3 className="text-xl font-bold" style={{ color: 'var(--black)' }}>{question.prompt}</h3>
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
                  className="absolute left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm z-10 border"
                  style={{
                    borderColor: 'var(--untitled-ui-gray200)',
                    backgroundColor: response.color,
                    bottom: `${response.nameBottomPosition || 0}px`
                  }}
                >
                  <span className="text-black font-semibold">{response.name}</span>
                </div>
                {/* Dot - positioned at bottom of container (container is already positioned at yOffset) */}
                <div 
                  className="absolute left-1/2 transform -translate-x-1/2 w-5 h-5 rounded-full border-2 shadow-sm"
                  style={{ 
                    borderColor: 'var(--untitled-ui-white)',
                    backgroundColor: response.color,
                    bottom: '0px' // Container is already positioned at yOffset, so dot is at bottom: 0
                  }}
                ></div>
              </div>
            ))}
          </div>
          
          {/* Horizontal line */}
          <div className="h-1 w-full mb-2" style={{ backgroundColor: 'var(--untitled-ui-gray300)' }}></div>
          
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
    <div className="h-full flex flex-col p-6 rounded-lg border-2" style={{ backgroundColor: 'var(--untitled-ui-gray50)', borderColor: 'var(--untitled-ui-gray200)' }}>
      {/* Question prompt - bold and centered at top */}
      <div className="mb-6 text-center flex-shrink-0">
        <h3 className="text-xl font-bold" style={{ color: 'var(--black)' }}>{question.prompt}</h3>
      </div>
      <div className="mb-4 flex-shrink-0">
        <p className="text-sm" style={{ color: 'var(--untitled-ui-gray700)' }}>
          {responseCount === 0 ? 'Waiting for responses...' : `What the room is saying:`}
        </p>
      </div>
      {responses.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: 'var(--untitled-ui-gray600)' }}>No responses yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {responses.map((response) => (
            <div
              key={response.id}
              className="p-3 rounded border"
              style={{ 
                backgroundColor: 'var(--untitled-ui-white)',
                borderColor: 'var(--untitled-ui-gray200)'
              }}
            >
              <p style={{ color: 'var(--black)' }}>{String(response.value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

