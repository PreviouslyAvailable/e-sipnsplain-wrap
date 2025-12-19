'use client';

import { useEffect, useState } from 'react';

type FloatingEmoji = {
  id: number;
  emoji: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
  moveX1: number;
  moveY1: number;
  moveX2: number;
  moveY2: number;
  moveX3: number;
  moveY3: number;
  rotate1: number;
  rotate2: number;
  rotate3: number;
};

const EMOJIS = ['🎅', '❄️', '🎄', '🎁', '⛄', '🦌', '🔔', '✨', '🌟', '💫', '🎊', '🎉'];

export default function FloatingEmojis() {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);
  const [styleSheet, setStyleSheet] = useState<string>('');

  useEffect(() => {
    // Create 5-8 floating emojis
    const count = Math.floor(Math.random() * 4) + 5;
    const newEmojis: FloatingEmoji[] = [];
    const keyframes: string[] = [];

    for (let i = 0; i < count; i++) {
      const moveX1 = Math.random() * 100 - 50;
      const moveY1 = Math.random() * 100 - 50;
      const moveX2 = Math.random() * 100 - 50;
      const moveY2 = Math.random() * 100 - 50;
      const moveX3 = Math.random() * 100 - 50;
      const moveY3 = Math.random() * 100 - 50;
      const rotate1 = Math.random() * 20 - 10;
      const rotate2 = Math.random() * 20 - 10;
      const rotate3 = Math.random() * 20 - 10;

      newEmojis.push({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 10 + Math.random() * 10,
        moveX1,
        moveY1,
        moveX2,
        moveY2,
        moveX3,
        moveY3,
        rotate1,
        rotate2,
        rotate3,
      });

      // Generate keyframe animation
      keyframes.push(`
        @keyframes float-${i} {
          0%, 100% {
            transform: translate(-50%, -50%) translate(0, 0) rotate(0deg);
            opacity: 0.7;
          }
          25% {
            transform: translate(-50%, -50%) translate(${moveX1}px, ${moveY1}px) rotate(${rotate1}deg);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) translate(${moveX2}px, ${moveY2}px) rotate(${rotate2}deg);
            opacity: 0.8;
          }
          75% {
            transform: translate(-50%, -50%) translate(${moveX3}px, ${moveY3}px) rotate(${rotate3}deg);
            opacity: 1;
          }
        }
      `);
    }

    setEmojis(newEmojis);
    setStyleSheet(keyframes.join('\n'));
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styleSheet }} />
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        {emojis.map((emoji) => (
          <div
            key={emoji.id}
            className="absolute text-4xl md:text-5xl lg:text-6xl"
            style={{
              left: `${emoji.x}%`,
              top: `${emoji.y}%`,
              animation: `float-${emoji.id} ${emoji.duration}s ease-in-out infinite`,
              animationDelay: `${emoji.delay}s`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {emoji.emoji}
          </div>
        ))}
      </div>
    </>
  );
}

