import React, { useState, useRef } from 'react';
import { Product, PackageItem } from '../types';
import { Plus, Minus, Barcode } from 'lucide-react';

interface SwipeablePackageRowProps {
  product: Product;
  pkg: PackageItem;
  totalPackagesCount: number;
  isMissing: boolean;
  onQuickAdjust: (product: Product, pkg: PackageItem, change: number) => void;
}

export const SwipeablePackageRow: React.FC<SwipeablePackageRowProps> = ({
  product,
  pkg,
  totalPackagesCount,
  isMissing,
  onQuickAdjust,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [vibrated, setVibrated] = useState(false);

  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);

  const TRIGGER_THRESHOLD = 75; // px required to trigger +1 / -1 action

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setIsSwiping(true);
    setVibrated(false);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;

    // Limit maximum swipe distance for smooth feel
    const clampedDiff = Math.max(-130, Math.min(130, diff));
    setTranslateX(clampedDiff);

    // Haptic feedback when threshold reached
    if (Math.abs(clampedDiff) >= TRIGGER_THRESHOLD && !vibrated) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(40); } catch (err) { /* ignore */ }
      }
      setVibrated(true);
    } else if (Math.abs(clampedDiff) < TRIGGER_THRESHOLD && vibrated) {
      setVibrated(false);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    if (translateX >= TRIGGER_THRESHOLD) {
      // Swiped Right -> Trigger +1
      onQuickAdjust(product, pkg, 1);
    } else if (translateX <= -TRIGGER_THRESHOLD) {
      // Swiped Left -> Trigger -1 (if quantity > 0)
      if (pkg.quantity > 0) {
        onQuickAdjust(product, pkg, -1);
      }
    }

    // Reset position smoothly
    setTranslateX(0);
    setVibrated(false);
  };

  return (
    <div className="relative overflow-hidden rounded-xl my-1.5 touch-pan-y select-none">
      {/* Background Action Panels revealed on swipe */}
      <div className="absolute inset-0 flex items-center justify-between font-bold text-xs">
        {/* Left Action: Swiped Right (+1 Ekle) */}
        <div
          className={`h-full flex items-center space-x-1.5 px-4 text-white transition-all ${
            translateX > 0 ? 'bg-emerald-600 opacity-100' : 'bg-emerald-600/30 opacity-0'
          } ${translateX >= TRIGGER_THRESHOLD ? 'bg-emerald-500 font-extrabold text-sm' : ''}`}
          style={{ width: `${Math.max(0, translateX)}px` }}
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          {translateX >= TRIGGER_THRESHOLD && <span className="whitespace-nowrap">+1 EKLE</span>}
        </div>

        {/* Right Action: Swiped Left (-1 Çıkar) */}
        <div
          className={`h-full flex items-center justify-end space-x-1.5 px-4 text-white transition-all ml-auto ${
            translateX < 0 ? 'bg-rose-600 opacity-100' : 'bg-rose-600/30 opacity-0'
          } ${Math.abs(translateX) >= TRIGGER_THRESHOLD ? 'bg-rose-500 font-extrabold text-sm' : ''}`}
          style={{ width: `${Math.max(0, -translateX)}px` }}
        >
          {Math.abs(translateX) >= TRIGGER_THRESHOLD && <span className="whitespace-nowrap">-1 ÇIKAR</span>}
          <Minus className="w-5 h-5 flex-shrink-0" />
        </div>
      </div>

      {/* Foreground Main Package Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative z-10 p-3 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing ${
          isMissing
            ? 'bg-rose-50/70 border-rose-200'
            : 'bg-white border-gray-200/90 shadow-xs'
        }`}
      >
        {/* Package Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                isMissing ? 'bg-rose-600 text-white' : 'bg-gray-800 text-amber-300'
              }`}
            >
              {pkg.koliIndex}/{totalPackagesCount}
            </span>
            <span className="text-xs font-bold text-gray-900 truncate" title={pkg.name}>
              {pkg.name}
            </span>
            {isMissing && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded flex-shrink-0">
                Eksik
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-gray-400 font-mono mt-1 pl-0.5">
            <Barcode className="w-3 h-3 text-gray-400" />
            <span>{pkg.barcode || 'Barkodsuz'}</span>
          </div>
        </div>

        {/* Stock Quantity Controls & Visual Touch Hint */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (pkg.quantity > 0) onQuickAdjust(product, pkg, -1);
            }}
            disabled={pkg.quantity <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition min-h-[44px] min-w-[36px]"
            title="-1 Stok Düş"
          >
            <Minus className="w-4 h-4" />
          </button>

          <span className="w-8 text-center font-black text-sm text-gray-950 font-mono">
            {pkg.quantity}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdjust(product, pkg, 1);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 active:scale-95 transition min-h-[44px] min-w-[36px]"
            title="+1 Stok Ekle"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
