import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Avatar2DProps {
  isSpeaking: boolean;
  isListening: boolean;
}

export function Avatar3D({ isSpeaking, isListening }: Avatar2DProps) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [eyeBlink, setEyeBlink] = useState(false);

  // Animate mouth when speaking
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setMouthOpen(false);
    }
  }, [isSpeaking]);

  // Random eye blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background glow effect */}
      <div className={cn(
        "absolute w-64 h-64 rounded-full blur-3xl transition-all duration-500",
        isSpeaking && "bg-green-400/30 animate-pulse",
        isListening && "bg-blue-400/30 animate-pulse",
        !isSpeaking && !isListening && "bg-purple-400/20"
      )} />

      {/* Avatar Container */}
      <div className={cn(
        "relative z-10 transition-transform duration-300",
        isSpeaking && "scale-105",
        isListening && "scale-102"
      )}>
        {/* Avatar Image using Ready Player Me 2D render - Half body portrait */}
        <div className="relative overflow-hidden rounded-2xl">
          <img 
            src="https://models.readyplayer.me/695742ce452afe2bbf7a6a4c.png?scene=halfbody-portrait-v1-transparent&quality=high"
            alt="AI Interviewer"
            className={cn(
              "w-80 h-80 object-cover object-top border-4 shadow-2xl transition-all duration-300 rounded-2xl",
              isSpeaking && "border-green-400 shadow-green-400/50",
              isListening && "border-blue-400 shadow-blue-400/50",
              !isSpeaking && !isListening && "border-purple-400 shadow-purple-400/30"
            )}
            style={{
              animation: isSpeaking ? 'speaking 0.3s ease-in-out infinite' : 
                        isListening ? 'listening 2s ease-in-out infinite' : 
                        'idle 4s ease-in-out infinite'
            }}
          />
          
          {/* Speaking indicator overlay */}
          {isSpeaking && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1.5 bg-green-400 rounded-full animate-pulse"
                  style={{
                    height: `${12 + Math.random() * 16}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* Listening indicator */}
          {isListening && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span>Listening...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes speaking {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes listening {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes idle {
          0%, 100% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
        }
      `}</style>
    </div>
  );
}
