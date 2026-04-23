import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../lib/utils';

// Audio context for generating sounds
const createAudioContext = () => {
  return new (window.AudioContext || window.webkitAudioContext)();
};

const SpinningWheel = ({ 
  tickets, 
  onSpinComplete, 
  isSpinning, 
  setIsSpinning,
  targetNumber = null,  // The number the wheel should land on
  isWinnerSpin = false  // Whether this spin reveals the winner
}) => {
  const [currentNumber, setCurrentNumber] = useState(null);
  const [displayNumbers, setDisplayNumbers] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle, spinning, slowing, result
  const [result, setResult] = useState(null);
  const intervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const allNumbers = tickets.map(t => t.number);

  // Initialize audio context on first interaction
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Play tick sound
  const playTickSound = useCallback(() => {
    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') ctx.resume();
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800 + Math.random() * 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [initAudio]);

  // Play winner fanfare
  const playWinnerSound = useCallback(() => {
    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') ctx.resume();
      
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      notes.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = ctx.currentTime + index * 0.15;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
      });

      // Add celebration chord
      setTimeout(() => {
        const chordFreqs = [261.63, 329.63, 392.00, 523.25];
        chordFreqs.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'triangle';
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
          osc.start();
          osc.stop(ctx.currentTime + 1);
        });
      }, 600);
    } catch (e) {
      console.log('Audio not available');
    }
  }, [initAudio]);

  // Play "not winner" sound (suspense down)
  const playNotWinnerSound = useCallback(() => {
    try {
      const ctx = initAudio();
      if (ctx.state === 'suspended') ctx.resume();
      
      const notes = [400, 350, 300]; // Descending notes
      
      notes.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = ctx.currentTime + index * 0.15;
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      });
    } catch (e) {
      console.log('Audio not available');
    }
  }, [initAudio]);

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
    let speed = 50;
    const totalAnimationSpins = 60; // Animation duration
    
    // The final number to land on
    const finalNumber = targetNumber || allNumbers[Math.floor(Math.random() * allNumbers.length)];
    
    const spin = () => {
      const randomIndex = Math.floor(Math.random() * allNumbers.length);
      const newNumber = allNumbers[randomIndex];
      setCurrentNumber(newNumber);
      
      // Play tick sound
      playTickSound();
      
      setDisplayNumbers(prev => {
        const newNumbers = [...prev, newNumber];
        return newNumbers.slice(-10);
      });
      
      currentSpinCount++;
      
      if (currentSpinCount >= totalAnimationSpins - 15) {
        setPhase('slowing');
        speed = Math.min(speed + 30, 500);
      }
      
      // In the last few spins, start showing the final number more often
      if (currentSpinCount >= totalAnimationSpins - 5) {
        const chanceOfFinal = (currentSpinCount - (totalAnimationSpins - 5)) / 5;
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
        
        // Play appropriate sound
        if (isWinnerSpin) {
          playWinnerSound();
        } else {
          playNotWinnerSound();
        }
        
        setTimeout(() => {
          onSpinComplete(finalNumber, isWinnerSpin);
        }, isWinnerSpin ? 2500 : 1500);
        return;
      }
      
      intervalRef.current = setTimeout(spin, speed);
    };
    
    spin();
  };

  const getPhaseStyles = () => {
    switch (phase) {
      case 'spinning':
        return 'animate-pulse scale-110';
      case 'slowing':
        return 'scale-105';
      case 'result':
        return isWinnerSpin ? 'scale-125' : 'scale-105';
      default:
        return '';
    }
  };

  if (allNumbers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">No hay boletos disponibles</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8">
      {/* Main display */}
      <div className={cn(
        "relative w-64 h-64 rounded-full border-8 flex items-center justify-center transition-all duration-300",
        phase === 'result' && isWinnerSpin ? 'border-yellow-400 bg-yellow-50' : 
        phase === 'result' ? 'border-slate-400 bg-slate-50' : 
        'border-orange-500 bg-white',
        getPhaseStyles()
      )}>
        {/* Decorative dots around wheel */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-4 h-4 rounded-full transition-colors duration-150",
              phase === 'spinning' || phase === 'slowing' 
                ? i % 2 === (Math.floor(Date.now() / 100) % 2) ? 'bg-orange-500' : 'bg-yellow-400'
                : phase === 'result' && isWinnerSpin
                  ? 'bg-yellow-400'
                  : phase === 'result'
                    ? 'bg-slate-400'
                    : 'bg-slate-300'
            )}
            style={{
              transform: `rotate(${i * 30}deg) translateY(-120px)`,
            }}
          />
        ))}
        
        {/* Center number display */}
        <div className="text-center z-10">
          {currentNumber ? (
            <>
              <span className={cn(
                "font-mono text-6xl font-bold transition-all duration-150",
                phase === 'result' && isWinnerSpin ? 'text-yellow-600' : 
                phase === 'result' ? 'text-slate-700' :
                'text-slate-900'
              )}>
                #{currentNumber}
              </span>
              {phase === 'result' && isWinnerSpin && (
                <div className="mt-2 animate-bounce">
                  <span className="text-3xl">🎉</span>
                  <p className="text-lg font-semibold text-yellow-600">¡GANADOR!</p>
                </div>
              )}
              {phase === 'result' && !isWinnerSpin && (
                <div className="mt-2">
                  <p className="text-sm text-slate-500">No es el ganador...</p>
                  <p className="text-xs text-slate-400">¡Sigue girando!</p>
                </div>
              )}
            </>
          ) : (
            <span className="text-4xl text-slate-400">?</span>
          )}
        </div>

        {/* Spinning indicator */}
        {(phase === 'spinning' || phase === 'slowing') && (
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-300 animate-spin" />
        )}
      </div>

      {/* Number trail */}
      {displayNumbers.length > 0 && phase !== 'idle' && (
        <div className="mt-6 flex gap-2 flex-wrap justify-center max-w-md">
          {displayNumbers.map((num, idx) => (
            <span
              key={`${idx}-${num}`}
              className={cn(
                "px-2 py-1 rounded text-sm font-mono transition-all",
                idx === displayNumbers.length - 1 && phase === 'result' && isWinnerSpin
                  ? 'bg-yellow-400 text-yellow-900 font-bold scale-110'
                  : idx === displayNumbers.length - 1 && phase === 'result'
                    ? 'bg-slate-300 text-slate-700 font-bold'
                    : 'bg-slate-100 text-slate-600'
              )}
              style={{ opacity: 0.3 + (idx / displayNumbers.length) * 0.7 }}
            >
              {num}
            </span>
          ))}
        </div>
      )}

      {/* Spin status */}
      {phase !== 'idle' && phase !== 'result' && (
        <div className="mt-4 text-sm text-slate-500">
          Girando...
        </div>
      )}

      {/* Winner celebration */}
      {phase === 'result' && isWinnerSpin && (
        <div className="mt-6 text-center animate-fade-in-up">
          <div className="text-4xl mb-2">🎊 🏆 🎊</div>
          <p className="text-xl font-bold text-slate-900">
            ¡El boleto #{result} es el ganador!
          </p>
        </div>
      )}
    </div>
  );
};

export default SpinningWheel;
