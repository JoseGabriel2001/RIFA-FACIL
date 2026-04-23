import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';
import { X, Maximize2, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

// Audio context for generating sounds
const createAudioContext = () => {
  return new (window.AudioContext || window.webkitAudioContext)();
};

const SpinningWheelPresentation = ({ 
  tickets, 
  onSpinComplete, 
  isSpinning, 
  setIsSpinning,
  targetNumber = null,
  isWinnerSpin = false,
  raffleName = '',
  prizeName = '',
  onClose,
  onStartSpin,
  spinNumber = 1,
  totalSpins = 3
}) => {
  const [currentNumber, setCurrentNumber] = useState(null);
  const [displayNumbers, setDisplayNumbers] = useState([]);
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const containerRef = useRef(null);
  const allNumbers = tickets.map(t => t.number);

  // Fullscreen handling
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (containerRef.current && document.fullscreenEnabled) {
          await containerRef.current.requestFullscreen();
        }
      } catch (e) {
        console.log('Fullscreen not available');
      }
    };
    enterFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Reset to idle state for next spin
  const resetForNextSpin = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setCurrentNumber(null);
    setDisplayNumbers([]);
  }, []);

  // Handle next spin after result
  const handleNextSpin = useCallback(() => {
    resetForNextSpin();
    setTimeout(() => {
      onStartSpin?.();
    }, 100);
  }, [resetForNextSpin, onStartSpin]);

  // Handle ESC key to exit and SPACE to spin
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSpinning) {
        onClose?.();
      }
      if (e.key === ' ' && !isSpinning) {
        e.preventDefault();
        if (phase === 'idle') {
          onStartSpin?.();
        } else if (phase === 'result' && !isWinnerSpin) {
          handleNextSpin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, phase, isWinnerSpin, onClose, onStartSpin, handleNextSpin]);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playTickSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') ctx.resume();
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800 + Math.random() * 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }, [initAudio, soundEnabled]);

  const playWinnerSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') ctx.resume();
      
      // Epic fanfare
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      
      notes.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = ctx.currentTime + index * 0.12;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
      });

      // Celebration chord
      setTimeout(() => {
        const chordFreqs = [261.63, 329.63, 392.00, 523.25, 659.25];
        chordFreqs.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
          osc.start();
          osc.stop(ctx.currentTime + 1.5);
        });
      }, 600);
    } catch (e) {}
  }, [initAudio, soundEnabled]);

  const playNotWinnerSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') ctx.resume();
      
      const notes = [400, 350, 300];
      notes.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = ctx.currentTime + index * 0.15;
        gainNode.gain.setValueAtTime(0.25, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      });
    } catch (e) {}
  }, [initAudio, soundEnabled]);

  useEffect(() => {
    if (isSpinning && allNumbers.length > 0) {
      startSpin();
    }
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [isSpinning]);

  const startSpin = () => {
    setPhase('spinning');
    setResult(null);
    setDisplayNumbers([]);
    
    let currentSpinCount = 0;
    let speed = 40;
    const totalAnimationSpins = 80;
    
    const finalNumber = targetNumber || allNumbers[Math.floor(Math.random() * allNumbers.length)];
    
    const spin = () => {
      const randomIndex = Math.floor(Math.random() * allNumbers.length);
      const newNumber = allNumbers[randomIndex];
      setCurrentNumber(newNumber);
      
      playTickSound();
      
      setDisplayNumbers(prev => {
        const newNumbers = [...prev, newNumber];
        return newNumbers.slice(-15);
      });
      
      currentSpinCount++;
      
      if (currentSpinCount >= totalAnimationSpins - 20) {
        setPhase('slowing');
        speed = Math.min(speed + 25, 400);
      }
      
      if (currentSpinCount >= totalAnimationSpins - 8) {
        const chanceOfFinal = (currentSpinCount - (totalAnimationSpins - 8)) / 8;
        if (Math.random() < chanceOfFinal) {
          setCurrentNumber(finalNumber);
        }
      }
      
      if (currentSpinCount >= totalAnimationSpins) {
        clearTimeout(intervalRef.current);
        setCurrentNumber(finalNumber);
        setResult(finalNumber);
        setPhase('result');
        setIsSpinning(false);
        
        if (isWinnerSpin) {
          playWinnerSound();
        } else {
          playNotWinnerSound();
        }
        
        setTimeout(() => {
          onSpinComplete(finalNumber, isWinnerSpin);
        }, isWinnerSpin ? 4000 : 2500);
        return;
      }
      
      intervalRef.current = setTimeout(spin, speed);
    };
    
    spin();
  };

  // Confetti effect for winner
  const renderConfetti = () => {
    if (phase !== 'result' || !isWinnerSpin) return null;
    
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const confettiPieces = [];
    
    for (let i = 0; i < 100; i++) {
      const style = {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
      };
      confettiPieces.push(
        <div key={i} className="confetti-piece" style={style} />
      );
    }
    
    return <div className="confetti-container">{confettiPieces}</div>;
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 z-50 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute w-[300px] h-[300px] bg-yellow-500/10 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Confetti */}
      {renderConfetti()}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
        <div className="text-white">
          <h1 className="text-3xl font-bold">{raffleName}</h1>
          <p className="text-xl text-white/70 mt-1">Premio: {prizeName}</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10"
            disabled={isSpinning}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Spin counter */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white/10 backdrop-blur-sm rounded-full px-8 py-3 border border-white/20">
          <span className="text-2xl font-bold text-white">
            Giro {spinNumber} de {totalSpins}
          </span>
        </div>
      </div>

      {/* Main wheel */}
      <div className="relative z-10 flex flex-col items-center">
        <div className={cn(
          "relative w-80 h-80 md:w-96 md:h-96 rounded-full border-[12px] flex items-center justify-center transition-all duration-500",
          phase === 'result' && isWinnerSpin 
            ? 'border-yellow-400 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 scale-110 shadow-[0_0_100px_rgba(250,204,21,0.5)]' 
            : phase === 'result' 
              ? 'border-slate-400 bg-slate-800/50 scale-105' 
              : 'border-orange-500 bg-slate-800/50',
          (phase === 'spinning' || phase === 'slowing') && 'animate-pulse scale-105'
        )}>
          {/* Decorative lights */}
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute w-5 h-5 rounded-full transition-all duration-100",
                phase === 'spinning' || phase === 'slowing' 
                  ? i % 2 === (Math.floor(Date.now() / 80) % 2) ? 'bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.8)]' : 'bg-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]'
                  : phase === 'result' && isWinnerSpin
                    ? 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.9)]'
                    : phase === 'result'
                      ? 'bg-slate-500'
                      : 'bg-slate-600'
              )}
              style={{
                transform: `rotate(${i * 22.5}deg) translateY(-165px)`,
              }}
            />
          ))}
          
          {/* Center number display */}
          <div className="text-center z-10">
            {currentNumber ? (
              <>
                <span className={cn(
                  "font-mono text-8xl md:text-9xl font-black transition-all duration-150",
                  phase === 'result' && isWinnerSpin ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]' : 
                  phase === 'result' ? 'text-slate-300' :
                  'text-white'
                )}>
                  {currentNumber}
                </span>
                {phase === 'result' && isWinnerSpin && (
                  <div className="mt-4 animate-bounce">
                    <p className="text-4xl font-black text-yellow-400 tracking-wider">¡GANADOR!</p>
                  </div>
                )}
                {phase === 'result' && !isWinnerSpin && (
                  <div className="mt-4">
                    <p className="text-2xl text-slate-400">No es el ganador</p>
                    <p className="text-lg text-slate-500 mt-1">¡Sigue girando!</p>
                  </div>
                )}
              </>
            ) : (
              <span className="text-8xl text-slate-500">?</span>
            )}
          </div>

          {/* Spinning ring */}
          {(phase === 'spinning' || phase === 'slowing') && (
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-400 border-r-yellow-400 animate-spin" style={{ animationDuration: '0.5s' }} />
          )}
        </div>

        {/* Number trail */}
        {displayNumbers.length > 0 && (
          <div className="mt-8 flex gap-2 flex-wrap justify-center max-w-2xl">
            {displayNumbers.map((num, idx) => (
              <span
                key={`${idx}-${num}`}
                className={cn(
                  "px-3 py-2 rounded-lg text-lg font-mono font-bold transition-all",
                  idx === displayNumbers.length - 1 && phase === 'result' && isWinnerSpin
                    ? 'bg-yellow-400 text-yellow-900 scale-125 shadow-lg'
                    : idx === displayNumbers.length - 1 && phase === 'result'
                      ? 'bg-slate-600 text-slate-200'
                      : 'bg-white/10 text-white/70'
                )}
                style={{ opacity: 0.3 + (idx / displayNumbers.length) * 0.7 }}
              >
                {num}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4">
        {!isSpinning && phase === 'idle' && (
          <Button
            onClick={onStartSpin}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white text-2xl font-bold px-12 py-6 rounded-full shadow-[0_0_30px_rgba(251,146,60,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(251,146,60,0.7)]"
          >
            {spinNumber >= totalSpins ? '🎯 ¡GIRO FINAL!' : `🎰 GIRAR (${totalSpins - spinNumber + 1} restantes)`}
          </Button>
        )}
        {phase === 'result' && !isWinnerSpin && (
          <Button
            onClick={handleNextSpin}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white text-2xl font-bold px-12 py-6 rounded-full shadow-[0_0_30px_rgba(251,146,60,0.5)] transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(251,146,60,0.7)]"
          >
            🎰 SIGUIENTE GIRO
          </Button>
        )}
        {phase === 'result' && !isWinnerSpin && (
          <p className="text-white/50 text-sm">o presiona ESPACIO</p>
        )}
        {phase === 'result' && isWinnerSpin && (
          <Button
            onClick={onClose}
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10 text-lg px-8 py-4"
          >
            Cerrar presentación
          </Button>
        )}
      </div>

      {/* CSS for confetti */}
      <style>{`
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall 4s linear infinite;
        }
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SpinningWheelPresentation;
