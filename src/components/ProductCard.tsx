import React from 'react';
import { Product, PackageItem } from '../types';
import { calculateCompleteSet } from '../lib/setCalculator';
import { SwipeablePackageRow } from './SwipeablePackageRow';
import {
  AlertTriangle,
  Barcode,
  Edit,
  Plus,
  Minus,
  CheckCircle2,
  Sliders,
  Layers,
  Package,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  viewMode?: 'BOTH' | 'PRODUCT_ONLY' | 'PACKAGES_ONLY';
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onOpenAdjust: (product: Product, pkg?: PackageItem) => void;
  onQuickAdjust: (product: Product, pkg: PackageItem, change: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  viewMode = 'BOTH',
  onEdit,
  onDelete,
  onOpenAdjust,
  onQuickAdjust,
}) => {
  const setStatus = calculateCompleteSet(product);
  const totalBoxes = product.packages.reduce((sum, p) => sum + p.quantity, 0);
  const hasMissingPackages = setStatus.missingPackagesToReachMax.length > 0;

  // If viewMode is 'PACKAGES_ONLY', render only the koli boxes
  if (viewMode === 'PACKAGES_ONLY') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div>
            <h4 className="text-sm font-bold text-gray-900 leading-snug">{product.name}</h4>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onEdit(product)}
              className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              title="Ürün & Kolileri Düzenle"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          {product.packages.map((pkg) => {
            const isMissing = setStatus.missingPackagesToReachMax.some(
              (m) => m.koliIndex === pkg.koliIndex
            );

            return (
              <SwipeablePackageRow
                key={pkg.koliId}
                product={product}
                pkg={pkg}
                totalPackagesCount={product.packages.length}
                isMissing={isMissing}
                onQuickAdjust={onQuickAdjust}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Sadece Ürün Bazlı Görünüm (PRODUCT_ONLY) -> Minimal ve okunabilir özet kartı
  if (viewMode === 'PRODUCT_ONLY') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                {product.category}
              </span>
              <h3 className="text-base font-bold text-gray-900 leading-snug mt-1.5">{product.name}</h3>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <button
                onClick={() => onEdit(product)}
                className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                title="Ürünü Düzenle"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Stok Özet Tablosu */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">HAZIR TAKIM</div>
            <div
              className={`text-xl font-black mt-0.5 ${
                setStatus.completeSets > 0 && !hasMissingPackages
                  ? 'text-emerald-700'
                  : setStatus.completeSets > 0
                  ? 'text-amber-700'
                  : 'text-rose-600'
              }`}
            >
              {setStatus.completeSets} <span className="text-xs font-normal text-gray-500">Takım</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">FİZİKSEL KOLİ</div>
            <div className="text-xl font-black text-gray-800 mt-0.5">
              {totalBoxes} <span className="text-xs font-normal text-gray-500">({product.packages.length} Koli Yapısı)</span>
            </div>
          </div>
        </div>

        {/* Eksik koli varsa sade ve şık uyarı */}
        {hasMissingPackages && (
          <div className="text-xs text-amber-800 bg-amber-50/80 border border-amber-200/70 px-3 py-2 rounded-lg flex items-center justify-between">
            <span className="truncate">
              ⚠️ Eksik: {setStatus.missingPackagesToReachMax.map((m) => `${m.koliIndex}. Koli (-${m.missingCount})`).join(', ')}
            </span>
          </div>
        )}

        {/* Alt Aksiyon Çubuğu */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-500">
            {setStatus.completeSets > 0 && !hasMissingPackages ? (
              <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sevkiyata Hazır
              </span>
            ) : (
              <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Eksik Kolili Takım
              </span>
            )}
          </span>
          <button
            onClick={() => onOpenAdjust(product)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Stok / Set Düzenle
          </button>
        </div>
      </div>
    );
  }

  // Koli Detaylı Görünüm (BOTH) -> Okunabilir, sade ve kompakt liste tasarımı
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
      {/* Üst Başlık & Aksiyonlar */}
      <div className="p-5 pb-3 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
            {product.category}
          </span>
          <h3 className="text-base font-bold text-gray-900 mt-1.5 leading-snug">{product.name}</h3>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={() => onEdit(product)}
            className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            title="Ürün & Kolileri Düzenle"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hazır Takım ile Toplam Koli Özet Satırı */}
      <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {setStatus.completeSets === 0 ? (
            <span className="inline-flex items-center space-x-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>0 Takım</span>
            </span>
          ) : hasMissingPackages ? (
            <span className="inline-flex items-center space-x-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{setStatus.completeSets} Takım (Eksik Koli Var)</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{setStatus.completeSets} Tam Takım Hazır</span>
            </span>
          )}
          <span className="text-gray-400">•</span>
          <span className="text-gray-600 font-medium">Toplam {totalBoxes} Koli</span>
        </div>

        <button
          onClick={() => onOpenAdjust(product)}
          className="text-xs font-semibold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 transition"
        >
          Set Düzenle
        </button>
      </div>

      {/* Koli Listesi -> Minimal ve net hiyerarşi */}
      <div className="p-4 space-y-1 flex-1">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1 flex items-center justify-between">
          <span>KOLİ STOKLARI ({product.packages.length} Koli)</span>
          <span className="text-[10px] text-gray-400 font-normal">👈 Sağa: +1 | Sola: -1 👉</span>
        </div>

        {product.packages.map((pkg) => {
          const isMissing = setStatus.missingPackagesToReachMax.some(
            (m) => m.koliIndex === pkg.koliIndex
          );

          return (
            <SwipeablePackageRow
              key={pkg.koliId}
              product={product}
              pkg={pkg}
              totalPackagesCount={product.packages.length}
              isMissing={isMissing}
              onQuickAdjust={onQuickAdjust}
            />
          );
        })}
      </div>

      {/* Alt Not Satırı */}
      {product.notes && (
        <div className="px-4 py-2 bg-gray-50/60 border-t border-gray-100 text-[11px] text-gray-500 italic truncate">
          💡 {product.notes}
        </div>
      )}
    </div>
  );
};

