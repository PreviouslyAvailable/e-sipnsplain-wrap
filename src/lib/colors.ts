// Color palette that works well with black text
const COLOR_PALETTE = [
  '#FFB3BA', // Light pink
  '#BAFFC9', // Light green
  '#BAE1FF', // Light blue
  '#FFFFBA', // Light yellow
  '#FFDFBA', // Light orange
  '#E0BBE4', // Light purple
  '#FFCCCB', // Light coral
  '#B4E4FF', // Light sky blue
  '#C7CEEA', // Light lavender
  '#F0E68C', // Khaki
  '#98D8C8', // Mint
  '#F7DC6F', // Light gold
  '#AED6F1', // Light steel blue
  '#FAD7A0', // Light peach
  '#D5A6BD', // Light rose
  '#A9DFBF', // Light sea green
];

/**
 * Get a consistent color for a session ID
 * Uses a hash function to deterministically assign colors
 */
export function getColorForSession(sessionId: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}

