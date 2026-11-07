import React, { useState } from 'react';
import {
  Boxes,
  Barcode,
  FolderOpen,
  PlusCircle,
  History,
  Download,
  FileSpreadsheet,
  Smartphone,
  X,
  Share,
} from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

interface NavbarProps {
  onOpenQuickScan: () => void;
  onOpenCategoryManager: () => void;
  onOpenAddProduct: () => void;
  onOpenHistory: () => void;
  onExportCSV: () => void;
  onOpenExcelImport?: () => void;
  totalProducts: number;
  totalCompleteSets: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenQuickScan,
  onOpenCategoryManager,
  onOpenAddProduct,
  onOpenHistory,
  onExportCSV,
  onOpenExcelImport,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <header className="bg-gray-900 text-white shadow-xl border-b border-gray-800 sticky top-0 z-40 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-1.5 sm:gap-3">
            {/* Logo & Title */}
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 min-w-0">
              <div className="p-2 sm:p-2.5 bg-amber-500 rounded-xl text-gray-950 shadow-md flex-shrink-0">
                <Boxes className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-xl font-black tracking-tight text-white block truncate">
                  KOLİ & DEPO<span className="text-amber-400">TAKİP</span>
                </span>
              </div>
            </div>

            {/* Key Actions Toolbar - Fits on mobile without overflow */}
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {/* PWA Install Button (Shown on desktop & mobile when installable or iOS) */}
              {!isInstalled && (isInstallable || isIOS) && (
                <button
                  onClick={handleInstallClick}
                  className="px-2 sm:px-3 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center space-x-1 border border-indigo-500"
                  title="Uygulamayı Cihazınıza Yükleyin (PWA)"
                >
                  <Smartphone className="w-4 h-4 text-indigo-200 flex-shrink-0" />
                  <span className="hidden sm:inline">Uygulamayı Yükle</span>
                </button>
              )}

              {/* Hızlı Barkod Taraması - PRIMARY BUTTON */}
              <button
                onClick={onOpenQuickScan}
                className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center space-x-1 sm:space-x-2 border border-amber-400 min-h-[44px]"
              >
                <Barcode className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">Hızlı Barkod</span>
                <span className="xs:hidden sm:hidden">Barkod</span>
              </button>

              {/* Yeni Mobilya Tanımla */}
              <button
                onClick={onOpenAddProduct}
                className="px-2 sm:px-3.5 py-2 sm:py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs sm:text-sm rounded-xl border border-gray-700 shadow-sm transition flex items-center space-x-1 min-h-[44px]"
                title="Yeni Mobilya & Koli Ekle"
              >
                <PlusCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="hidden md:inline">Yeni Mobilya & Koli Ekle</span>
                <span className="hidden sm:inline md:hidden">Ürün Ekle</span>
              </button>

              {/* Excel İle Toplu Yükle */}
              {onOpenExcelImport && (
                <button
                  onClick={onOpenExcelImport}
                  className="px-2 sm:px-3 py-2 sm:py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center space-x-1 border border-emerald-600 min-h-[44px]"
                  title="Excel veya CSV dosyasından toplu ürün ve koli yükleyin"
                >
                  <FileSpreadsheet className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  <span className="hidden lg:inline">Excel ile Yükle</span>
                  <span className="hidden sm:inline lg:hidden">Excel</span>
                </button>
              )}

              {/* Kategori Yönetimi */}
              <button
                onClick={onOpenCategoryManager}
                className="p-2 sm:px-3 sm:py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl border border-gray-700 transition flex items-center space-x-1.5 min-h-[44px]"
                title="Kategori Ekle / Çıkar / Düzenle"
              >
                <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" />
                <span className="hidden xl:inline text-xs font-bold">Kategoriler</span>
              </button>

              {/* Tarihçe / Geçmiş */}
              <button
                onClick={onOpenHistory}
                className="p-2 sm:p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl border border-gray-700 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Barkod Tarama ve Stok İşlem Geçmişi"
              >
                <History className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Excel CSV */}
              <button
                onClick={onExportCSV}
                className="hidden lg:flex items-center space-x-1.5 px-3 py-2 bg-gray-800/80 hover:bg-gray-800 text-xs text-gray-300 hover:text-white rounded-xl border border-gray-700 transition min-h-[44px]"
                title="Excel / CSV Olarak İndir"
              >
                <Download className="w-4 h-4" />
                <span>Excel (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* iOS Safari PWA Installation Modal Guide */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">iPhone / iPad'e Yükle</h3>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Bu uygulamayı ana ekranınıza ekleyip uygulama gibi açmak için Safari alt menüsündeki:
            </p>
            <ol className="text-xs text-gray-300 space-y-3 mb-6 bg-gray-950/60 p-4 rounded-xl border border-gray-800">
              <li className="flex items-center space-x-2">
                <span className="font-bold text-amber-400 w-5">1.</span>
                <span className="flex items-center space-x-1">
                  <span>Safari alt çubuğundaki</span>
                  <Share className="w-4 h-4 text-blue-400 inline" />
                  <strong className="text-white">Paylaş</strong>
                  <span>butonuna basın.</span>
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="font-bold text-amber-400 w-5">2.</span>
                <span>Açılan menüde aşağı kaydırın ve <strong className="text-white">"Ana Ekrana Ekle"</strong> seçeneğine dokunun.</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black rounded-xl text-sm transition"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
};

