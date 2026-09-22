import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Participant } from '../types';
import { sound } from '../utils/audio';
import { getWinnerOrdinalTitle, formatLoanAmount } from '../utils/format';
import { Play, Sparkles, Volume2, VolumeX, Shuffle, Eye, EyeOff } from 'lucide-react';

interface LuckyWheelProps {
  participants: Participant[];
  currentWinnerRank: number; // 1 for برنده اول, 2 for برنده دوم, ...
  isSpinning: boolean;
  onSpinStart: () => void;
  onSpinEnd: (winner: Participant) => void;
  spinDurationSeconds: number;
  maskMobile: boolean;
  prizeTitle: string;
  disabled?: boolean;
}

// Visual wheel slice colors - high contrast, luxury stage palette
const SLICE_COLORS = [
  '#D4AF37', // Bright Gold
  '#1E293B', // Deep Slate
  '#F59E0B', // Amber
  '#0F766E', // Deep Teal
  '#E11D48', // Ruby
  '#4338CA', // Indigo
  '#B45309', // Warm Bronze
  '#047857', // Emerald
  '#7C3AED', // Violet
  '#0284C7', // Sky Blue
  '#BE185D', // Magenta
  '#334155', // Charcoal
];

const NUM_VISUAL_SLICES = 24; // Optimal slice count for aesthetic wheel clarity

export const LuckyWheel: React.FC<LuckyWheelProps> = ({
  participants,
  currentWinnerRank,
  isSpinning,
  onSpinStart,
  onSpinEnd,
  spinDurationSeconds,
  maskMobile,
  prizeTitle,
  disabled = false,
}) => {
  const [rotation, setRotation] = useState(0);
  const [rollerParticipant, setRollerParticipant] = useState<Participant | null>(null);
  const [pointerBounce, setPointerBounce] = useState(false);
  const [revealStage, setRevealStage] = useState<'idle' | 'spinning' | 'tension' | 'landed'>('idle');

  const winnerRankTitle = getWinnerOrdinalTitle(currentWinnerRank);

  const animationFrameRef = useRef<number | null>(null);
  const spinStartTimeRef = useRef<number | null>(null);
  const targetRotationRef = useRef<number>(0);
  const startRotationRef = useRef<number>(0);
  const chosenWinnerRef = useRef<Participant | null>(null);
  const lastTickAngleRef = useRef<number>(0);
  const rollerIntervalRef = useRef<number | null>(null);

  // Pick visual slice labels from participants pool
  const visualSliceNames = React.useMemo(() => {
    if (participants.length === 0) return Array.from({ length: NUM_VISUAL_SLICES }, (_, i) => `ردیف ${i + 1}`);
    const sample = [];
    for (let i = 0; i < NUM_VISUAL_SLICES; i++) {
      const p = participants[i % participants.length];
      sample.push(p.fullName);
    }
    return sample;
  }, [participants]);

  // Handle keyboard spacebar / enter to trigger draw easily for stage presenter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !isSpinning && !disabled && participants.length > 0) {
        // Prevent accidental space scroll
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        startSpin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, disabled, participants.length]);

  const startSpin = () => {
    if (isSpinning || participants.length === 0 || disabled) return;

    // Pick fair random winner from active pool
    const winnerIndex = Math.floor(Math.random() * participants.length);
    const selectedWinner = participants[winnerIndex];
    chosenWinnerRef.current = selectedWinner;

    onSpinStart();
    setRevealStage('spinning');

    // Calculate rotation: at least 6-10 full spins (360 * 8) plus an offset to land on an exciting angle
    const extraSpins = 360 * (6 + Math.floor(Math.random() * 4));
    const randomAngle = Math.random() * 360;
    const targetAngle = rotation + extraSpins + randomAngle;

    startRotationRef.current = rotation;
    targetRotationRef.current = targetAngle;
    spinStartTimeRef.current = performance.now();
    lastTickAngleRef.current = rotation;

    // Rapid roller through candidate names in center display
    if (rollerIntervalRef.current) clearInterval(rollerIntervalRef.current);
    let rollerSpeedMs = 40;
    const updateRoller = () => {
      if (participants.length > 0) {
        const randP = participants[Math.floor(Math.random() * participants.length)];
        setRollerParticipant(randP);
      }
    };
    rollerIntervalRef.current = window.setInterval(updateRoller, rollerSpeedMs);

    // Run animation loop
    runSpinAnimation();
  };

  const runSpinAnimation = useCallback(() => {
    const animate = (now: number) => {
      if (!spinStartTimeRef.current) return;
      const elapsed = (now - spinStartTimeRef.current) / 1000;
      const duration = spinDurationSeconds;
      const progress = Math.min(elapsed / duration, 1);

      // Custom high-tension easing: rapid spin then dramatic deceleration
      // Quintic ease out for authentic inertia
      const easeOut = 1 - Math.pow(1 - progress, 4.5);
      const currentAngle =
        startRotationRef.current + (targetRotationRef.current - startRotationRef.current) * easeOut;

      setRotation(currentAngle);

      // Sound ticker: check whenever angle traverses slice notch
      const sliceAngle = 360 / NUM_VISUAL_SLICES;
      const angleDelta = currentAngle - lastTickAngleRef.current;
      if (angleDelta >= sliceAngle) {
        lastTickAngleRef.current = currentAngle;
        setPointerBounce(true);
        setTimeout(() => setPointerBounce(false), 50);

        // Calculate pitch based on speed
        const speed = (1 - progress);
        if (speed > 0.05) {
          sound.playTick(0.8 + speed * 0.7);
        } else {
          sound.playTensionPulse();
        }
      }

      // Near the end (last 1.5 seconds), enter tension stage and lock onto winner
      if (progress > 0.78 && revealStage !== 'tension') {
        setRevealStage('tension');
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin finished!
        if (rollerIntervalRef.current) {
          clearInterval(rollerIntervalRef.current);
          rollerIntervalRef.current = null;
        }

        const winner = chosenWinnerRef.current;
        if (winner) {
          setRollerParticipant(winner);
          setRevealStage('landed');
          sound.playFanfare();

          // Wait a brief suspenseful moment to savor the landed name before opening celebratory modal
          setTimeout(() => {
            onSpinEnd(winner);
          }, 800);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [spinDurationSeconds, onSpinEnd, revealStage]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (rollerIntervalRef.current) clearInterval(rollerIntervalRef.current);
    };
  }, []);

  const formatMobile = (mob: string) => {
    if (!mob || mob === '---') return '---';
    if (!maskMobile || mob.length < 8) return mob;
    return `${mob.substring(0, 4)}***${mob.substring(mob.length - 4)}`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 py-3">
      {/* Current Prize Banner */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-linear-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border border-amber-400/40 shadow-lg shadow-amber-500/10 backdrop-blur-md">
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          <span className="text-amber-200 text-sm font-medium">در حال قرعه‌کشی:</span>
          <span className="text-amber-300 text-base md:text-lg font-black tracking-wide">{winnerRankTitle}</span>
          {prizeTitle && prizeTitle !== winnerRankTitle && (
            <span className="text-white text-sm md:text-base font-medium">({prizeTitle})</span>
          )}
        </div>
      </div>

      {/* Main Wheel & Showcase Area */}
      <div className="relative flex flex-col lg:flex-row items-center justify-center gap-8 w-full">
        {/* Left/Center: The Grand Physical Wheel */}
        <div className="relative flex items-center justify-center">
          {/* Glowing Ambient Aura */}
          <div
            className={`absolute -inset-6 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
              isSpinning
                ? 'bg-amber-400/30 scale-105 animate-pulse'
                : 'bg-amber-500/15'
            }`}
          />

          {/* Golden Studded Outer Rim with Stage Bulbs */}
          <div className="relative p-3 rounded-full bg-linear-to-b from-amber-300 via-amber-600 to-yellow-800 shadow-[0_0_50px_rgba(217,119,6,0.35)] border-4 border-amber-400/80">
            {/* Flashing Outer Bulbs (24 LEDs around rim) */}
            <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24;
                const isEven = i % 2 === 0;
                return (
                  <div
                    key={i}
                    className="absolute w-full h-full flex justify-center items-start"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 transition-all duration-300 ${
                        isSpinning
                          ? isEven
                            ? 'bg-yellow-100 shadow-[0_0_8px_#fef08a]'
                            : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                          : 'bg-amber-200 shadow-[0_0_4px_#fde68a]'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Pointer / Ticker Arrow at the Top */}
            <div
              className={`absolute -top-6 left-1/2 -translate-x-1/2 z-30 transition-transform duration-75 origin-top ${
                pointerBounce ? '-rotate-12 scale-110' : 'rotate-0 scale-100'
              }`}
            >
              <div className="relative flex flex-col items-center drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]">
                {/* Pointer jewel */}
                <div className="w-7 h-7 rounded-full bg-linear-to-b from-amber-100 via-amber-400 to-amber-700 border-2 border-white flex items-center justify-center shadow-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                </div>
                {/* Downward triangle arrow */}
                <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-amber-400 -mt-1" />
              </div>
            </div>

            {/* Rotating SVG Wheel */}
            <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] rounded-full overflow-hidden bg-slate-950 shadow-inner">
              <svg
                viewBox="0 0 500 500"
                className="w-full h-full will-change-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <defs>
                  <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="70%" stopColor="#d97706" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.8" />
                  </radialGradient>
                  <filter id="goldGlow">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fbbf24" />
                  </filter>
                </defs>

                {/* Slices */}
                {Array.from({ length: NUM_VISUAL_SLICES }).map((_, index) => {
                  const sliceAngle = 360 / NUM_VISUAL_SLICES;
                  const startAngle = (index * sliceAngle * Math.PI) / 180;
                  const endAngle = ((index + 1) * sliceAngle * Math.PI) / 180;
                  const cx = 250;
                  const cy = 250;
                  const r = 248;

                  const x1 = cx + r * Math.sin(startAngle);
                  const y1 = cy - r * Math.cos(startAngle);
                  const x2 = cx + r * Math.sin(endAngle);
                  const y2 = cy - r * Math.cos(endAngle);

                  const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
                  const color = SLICE_COLORS[index % SLICE_COLORS.length];
                  const midAngle = index * sliceAngle + sliceAngle / 2;

                  return (
                    <g key={index}>
                      <path
                        d={pathData}
                        fill={color}
                        stroke="#fef08a"
                        strokeWidth="1.5"
                        strokeOpacity="0.6"
                      />
                      {/* Segment text / number */}
                      <g transform={`rotate(${midAngle} 250 250)`}>
                        <text
                          x="250"
                          y="65"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="13"
                          fontWeight="700"
                          fontFamily="Vazirmatn, sans-serif"
                          className="drop-shadow-md select-none"
                          transform="rotate(-90 250 65)"
                        >
                          {visualSliceNames[index] ? visualSliceNames[index].slice(0, 14) : `#${index + 1}`}
                        </text>
                        {/* Decorative golden jewel at slice rim */}
                        <circle cx="250" cy="20" r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" />
                      </g>
                    </g>
                  );
                })}

                {/* Inner radial shading */}
                <circle cx="250" cy="250" r="248" fill="url(#centerGlow)" pointerEvents="none" />
              </svg>

              {/* Wheel Center Crown / Pivot Hub */}
              <div className="absolute inset-0 m-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-linear-to-b from-amber-200 via-amber-500 to-amber-900 border-4 border-amber-300 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex items-center justify-center z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-950/90 border border-amber-400/60 flex flex-col items-center justify-center text-center p-1">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
                  <span className="text-[10px] sm:text-xs font-black text-amber-300 mt-0.5">
                    قرعه‌کشی
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right/Side: Live Stage Roller & Real-Time Participant Showcase */}
        <div className="flex flex-col items-center lg:items-stretch w-full max-w-md">
          {/* Stage Digital Hologram Box */}
          <div className="w-full bg-slate-900/80 backdrop-blur-xl border-2 border-amber-400/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
            {/* Top Status Header */}
            <div className="flex items-center justify-between w-full border-b border-white/10 pb-3 mb-4">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                وضعیت: {isSpinning ? `در حال چرخش و اسکن برای ${winnerRankTitle}...` : `آماده برای انتخاب ${winnerRankTitle}`}
              </span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
                {participants.length} نفر باقی‌مانده
              </span>
            </div>

            {/* Dynamic Rolling Display Window */}
            <div className="w-full bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-5 my-2 min-h-[160px] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
              {/* Scanline / Stage Beam Effect */}
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-amber-400/10 to-transparent pointer-events-none opacity-50" />

              {rollerParticipant ? (
                <div className="flex flex-col items-center gap-2 z-10 w-full animate-fadeIn">
                  <span className="text-xs font-bold text-amber-400/90 tracking-wider">
                    {revealStage === 'landed' ? `🏆 ${winnerRankTitle} مشخص شد:` : 'کاندیدای فعال:'}
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-md truncate max-w-full px-2">
                    {rollerParticipant.fullName}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                    <span className="text-xs text-amber-200 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40 font-mono">
                      کد پرسنلی: {rollerParticipant.personnelCode}
                    </span>
                    <span className="text-xs text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700 font-mono">
                      تلفن: {formatMobile(rollerParticipant.mobile)}
                    </span>
                  </div>
                  {rollerParticipant.creditDeferred && (
                    <div className="text-xs font-bold text-amber-300 mt-1 flex items-center gap-1.5 font-mono bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/40">
                      <span className="text-amber-400 text-[11px] font-sans font-medium">وام:</span>
                      <span>{formatLoanAmount(rollerParticipant.creditDeferred).numeric}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Shuffle className="w-8 h-8 text-amber-400/60 animate-bounce" />
                  <span className="text-sm font-medium">برای شروع دکمه زیر یا کلید اسپیس (Space) را بفشارید</span>
                </div>
              )}
            </div>

            {/* Large Stage Spin Action Button */}
            <div className="w-full mt-4">
              <button
                id="btn-spin-wheel"
                onClick={startSpin}
                disabled={isSpinning || participants.length === 0 || disabled}
                className={`w-full py-4 px-6 rounded-2xl font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-xl cursor-pointer select-none ${
                  isSpinning
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/30 cursor-not-allowed opacity-80'
                    : participants.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-linear-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 hover:scale-[1.02] active:scale-[0.98] shadow-amber-500/30 hover:shadow-amber-500/50'
                }`}
              >
                {isSpinning ? (
                  <>
                    <Sparkles className="w-6 h-6 animate-spin text-amber-400" />
                    <span>در حال انتخاب {winnerRankTitle}...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current text-slate-950" />
                    <span>شروع قرعه‌کشی {winnerRankTitle}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Keyboard shortcut info */}
            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-center gap-2">
              <span>کلید میانبر:</span>
              <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">
                Space
              </kbd>
              <span>یا</span>
              <kbd className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">
                Enter
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
