import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Product, PackageItem } from '../types';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Plus,
  ArrowRight,
  Boxes,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProducts: Product[];
  onImportProducts: (importedProducts: Product[], mergeMode: 'MERGE' | 'ADD_NEW') => void;
}

interface ParsedRow {
  productName: string;
  barcode: string;
  koliName?: string;
  category?: string;
  quantity?: number;
  sku?: string;
  rawRow: Record<string, any>;
}

interface GroupedProduct {
  productName: string;
  category: string;
  sku?: string;
  packages: {
    name: string;
    barcode: string;
    quantity: number;
    koliIndex: number;
  }[];
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingProducts,
  onImportProducts,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  
  // Selected Column Mappings
  const [colProdName, setColProdName] = useState<string>('');
  const [colBarcode, setColBarcode] = useState<string>('');
  const [colKoliName, setColKoliName] = useState<string>('');
  const [colCategory, setColCategory] = useState<string>('');
  const [colQuantity, setColQuantity] = useState<string>('');

  const [mergeMode, setMergeMode] = useState<'MERGE' | 'ADD_NEW'>('MERGE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate and download sample Excel file for user reference
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Ürün Adı': 'Alesta 3 Kapaklı Gardırop',
        'Koli Barkodu': '869000000101',
        'Koli Adı': '1/3 Koli (Gövde)',
        'Kategori': 'Gardırop & Dolap',
        'Stok Miktarı': 10,
      },
      {
        'Ürün Adı': 'Alesta 3 Kapaklı Gardırop',
        'Koli Barkodu': '869000000102',
        'Koli Adı': '2/3 Koli (Kapaklar)',
        'Kategori': 'Gardırop & Dolap',
        'Stok Miktarı': 10,
      },
      {
        'Ürün Adı': 'Alesta 3 Kapaklı Gardırop',
        'Koli Barkodu': '869000000103',
        'Koli Adı': '3/3 Koli (Aynalar & Aksesuar)',
        'Kategori': 'Gardırop & Dolap',
        'Stok Miktarı': 10,
      },
      {
        'Ürün Adı': 'Milano Açılır Yemek Masası',
        'Koli Barkodu': '869000000201',
        'Koli Adı': '1/2 Koli (Masa Üst Tabla)',
        'Kategori': 'Yemek Odası',
        'Stok Miktarı': 5,
      },
      {
        'Ürün Adı': 'Milano Açılır Yemek Masası',
        'Koli Barkodu': '869000000202',
        'Koli Adı': '2/2 Koli (Masa Ayakları)',
        'Kategori': 'Yemek Odası',
        'Stok Miktarı': 5,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 }, // Ürün Adı
      { wch: 18 }, // Koli Barkodu
      { wch: 30 }, // Koli Adı
      { wch: 20 }, // Kategori
      { wch: 12 }, // Stok Miktarı
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ornek_Urun_Koli_Listesi');
    XLSX.writeFile(workbook, 'Ornek_Mobilya_Koli_Sablonu.xlsx');
  };

  // Helper function to auto detect columns
  const autoDetectColumns = (colHeaders: string[]) => {
    const findMatchingCol = (keywords: string[]) => {
      return (
        colHeaders.find((h) =>
          keywords.some((kw) => h.toLowerCase().trim().includes(kw))
        ) || ''
      );
    };

    setColProdName(
      findMatchingCol(['ürün adı', 'urun adi', 'ürün', 'urun', 'mobilya', 'product', 'ürün ismi'])
    );
    setColBarcode(
      findMatchingCol(['barkod', 'koli barkod', 'barcode', 'ean', 'barkod no', 'koli barkodu'])
    );
    setColKoliName(
      findMatchingCol(['koli adı', 'koli adi', 'koli tanımı', 'koli', 'box', 'açıklama', 'aciklama'])
    );
    setColCategory(findMatchingCol(['kategori', 'category', 'grup', 'tür']));
    setColQuantity(findMatchingCol(['miktar', 'stok', 'adet', 'quantity', 'qty', 'stok adedi']));
  };

  // Handle file select and parse Excel or CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse JSON rows
        const parsedJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        });

        if (parsedJson.length === 0) {
          setErrorMessage('Yüklenen Excel dosyasında hiç veri bulunamadı.');
          setIsProcessing(false);
          return;
        }

        const detectedHeaders = Object.keys(parsedJson[0]);
        setHeaders(detectedHeaders);
        setRawData(parsedJson);

        // Auto select columns
        autoDetectColumns(detectedHeaders);
        setIsProcessing(false);
      } catch (err: any) {
        console.error('Excel okuma hatası:', err);
        setErrorMessage('Excel dosyası okunamadı. Lütfen geçerli bir .xlsx, .xls veya .csv yükleyin.');
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Build grouped products from raw data and column selection
  const getGroupedProducts = (): GroupedProduct[] => {
    if (!colProdName || rawData.length === 0) return [];

    const groupedMap = new Map<string, GroupedProduct>();

    rawData.forEach((row) => {
      const pName = String(row[colProdName] || '').trim();
      if (!pName) return; // Skip empty product name rows

      const rawBarcode = colBarcode ? String(row[colBarcode] || '').trim() : '';
      const rawKoliName = colKoliName ? String(row[colKoliName] || '').trim() : '';
      const rawCategory = colCategory ? String(row[colCategory] || '').trim() : 'Genel Mobilya';
      const rawQtyStr = colQuantity ? String(row[colQuantity] || '0').trim() : '0';
      const parsedQty = parseInt(rawQtyStr, 10);
      const qty = isNaN(parsedQty) || parsedQty < 0 ? 0 : parsedQty;

      if (!groupedMap.has(pName)) {
        groupedMap.set(pName, {
          productName: pName,
          category: rawCategory || 'Genel Mobilya',
          packages: [],
        });
      }

      const group = groupedMap.get(pName)!;
      const koliIdx = group.packages.length + 1;

      // Fallback barcode if empty: 869 + timestamp suffix + random
      const barcode =
        rawBarcode ||
        `869${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;

      const koliName = rawKoliName || `${koliIdx}. Koli`;

      group.packages.push({
        name: koliName,
        barcode,
        quantity: qty,
        koliIndex: koliIdx,
      });
    });

    // Fix koli names if generic
    groupedMap.forEach((group) => {
      const totalKoli = group.packages.length;
      group.packages.forEach((pkg) => {
        if (!pkg.name.includes('/')) {
          pkg.name = `${pkg.koliIndex}/${totalKoli} Koli - ${pkg.name}`;
        }
      });
    });

    return Array.from(groupedMap.values());
  };

  const groupedProducts = getGroupedProducts();

  // Confirm Import Handler
  const handleConfirmImport = () => {
    if (groupedProducts.length === 0) {
      setErrorMessage('Lütfen ürün adı sütununu seçiniz ve verilerin yüklendiğinden emin olunuz.');
      return;
    }

    const newProductsList: Product[] = groupedProducts.map((gp, pIndex) => {
      const prodId = `prod-excel-${Date.now()}-${pIndex}`;
      const packages: PackageItem[] = gp.packages.map((pkg, kIndex) => ({
        koliId: `${prodId}-koli-${kIndex + 1}`,
        koliIndex: kIndex + 1,
        name: pkg.name,
        barcode: pkg.barcode,
        quantity: pkg.quantity,
      }));

      return {
        id: prodId,
        name: gp.productName,
        category: gp.category || 'Genel Mobilya',
        packages,
        updatedAt: new Date().toISOString(),
      };
    });

    onImportProducts(newProductsList, mergeMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 rounded-xl text-gray-950 shadow-md">
              <FileSpreadsheet className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black">Excel / CSV ile Toplu Ürün & Koli Yükle</h3>
              <p className="text-xs text-gray-400">
                Excel dosyanızdaki ürün ismini ve koli barkod numaralarını otomatik eşleştirip ürün kartlarını açar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Top Info & Template Download */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Nasıl Çalışır?</strong> Excel dosyanızda her satır bir koliyi temsil eder.{' '}
                <strong>Aynı ürün adına sahip satırlar</strong> otomatik olarak tek bir ürün kartı
                altında koli grubu (Örn: 1/3 Koli, 2/3 Koli) olarak birleştirilir.
              </div>
            </div>
            <button
              onClick={handleDownloadSampleExcel}
              className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 shadow-sm transition flex items-center space-x-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-amber-600" />
              <span>Örnek Excel Şablonu İndir</span>
            </button>
          </div>

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 hover:border-amber-500 rounded-2xl p-6 bg-gray-50/50 text-center transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-file-input"
            />
            <label
              htmlFor="excel-file-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-full">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-sm font-bold text-gray-800">
                {fileName ? (
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Seçilen Dosya: {fileName}
                  </span>
                ) : (
                  'Excel (.xlsx, .xls) veya CSV Dosyası Seçin ya da Buraya Sürükleyin'
                )}
              </div>
              <p className="text-xs text-gray-500">
                Dosya seçmek için tıklayın • Sayfa başına sınırsız ürün ve koli
              </p>
            </label>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Column Mapping Section (Appears after file upload) */}
          {headers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-amber-600" />
                  <span>2. Sütun Eşleştirme (Otomatik Algılandı)</span>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  Toplam {rawData.length} Satır Yüklendi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* Ürün Adı */}
                <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1">
                  <label className="block font-black text-amber-950">
                    Ürün İsmi Sütunu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={colProdName}
                    onChange={(e) => setColProdName(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-bold text-gray-900 focus:outline-none"
                  >
                    <option value="">-- Sütun Seçiniz --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Barkod */}
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <label className="block font-black text-gray-800">Koli Barkodu Sütunu</label>
                  <select
                    value={colBarcode}
                    onChange={(e) => setColBarcode(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 focus:outline-none"
                  >
                    <option value="">-- Yoksa Otomatik Barkod Oluştur --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Koli Adı */}
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <label className="block font-black text-gray-800">Koli Tanımı / Adı Sütunu</label>
                  <select
                    value={colKoliName}
                    onChange={(e) => setColKoliName(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 focus:outline-none"
                  >
                    <option value="">-- Yoksa (1. Koli, 2. Koli) Yap --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori */}
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <label className="block font-black text-gray-800">Kategori Sütunu</label>
                  <select
                    value={colCategory}
                    onChange={(e) => setColCategory(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 focus:outline-none"
                  >
                    <option value="">-- Varsayılan (Genel Mobilya) --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Miktar */}
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <label className="block font-black text-gray-800">Stok Miktarı Sütunu</label>
                  <select
                    value={colQuantity}
                    onChange={(e) => setColQuantity(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 focus:outline-none"
                  >
                    <option value="">-- Yoksa 0 Adet Başlat --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Import Mode */}
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <label className="block font-black text-gray-800">Aynı İsimli Ürünler</label>
                  <select
                    value={mergeMode}
                    onChange={(e) => setMergeMode(e.target.value as 'MERGE' | 'ADD_NEW')}
                    className="w-full p-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-900 focus:outline-none"
                  >
                    <option value="MERGE">Mevcut Ürün Kartına Ekle / Güncelle</option>
                    <option value="ADD_NEW">Her Zaman Yeni Kart Aç</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Grouped Product Card Preview Table */}
          {groupedProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-gray-800 uppercase tracking-wider">
                  3. Oluşturulacak Ürün Kartları Önizlemesi ({groupedProducts.length} Ürün Kartı)
                </span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  ✓ {groupedProducts.reduce((acc, p) => acc + p.packages.length, 0)} Adet Koli Algılandı
                </span>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto bg-white shadow-inner">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 font-black text-gray-700 sticky top-0">
                      <th className="p-3">Ürün Adı</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Koli Sayısı</th>
                      <th className="p-3">Açıklama / Koliler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {groupedProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="p-3 font-bold text-gray-900">{p.productName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-900 rounded font-semibold border border-amber-200">
                            {p.category}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-gray-700">{p.packages.length} Koli</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {p.packages.map((pkg, kIdx) => (
                              <span
                                key={kIdx}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-mono border border-gray-200"
                                title={`Barkod: ${pkg.barcode}`}
                              >
                                {pkg.name} ({pkg.quantity} adet)
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {groupedProducts.length > 0 ? (
              <span>
                "Ürün Kartlarını Oluştur" butonuna bastığınızda kartlar hemen sisteme tanımlanır.
              </span>
            ) : (
              <span>Lütfen bilgisayarınızdan veya telefonunuzdan bir Excel dosyası seçin.</span>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-300 transition"
            >
              Vazgeç
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={groupedProducts.length === 0}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-300 disabled:text-gray-500 text-gray-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-2"
            >
              <span>Ürün Kartlarını Oluştur ve Yükle</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
