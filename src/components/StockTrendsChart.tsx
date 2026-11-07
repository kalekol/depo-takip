import React, { useState, useMemo } from 'react';
import { Product, StockLogItem } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, ArrowDownCircle, ArrowUpCircle, Activity, Calendar, Filter, Layers } from 'lucide-react';

interface StockTrendsChartProps {
  products: Product[];
  logs: StockLogItem[];
}

export const StockTrendsChart: React.FC<StockTrendsChartProps> = ({ products, logs }) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);
  const [chartType, setChartType] = useState<'AREA' | 'BAR'>('AREA');

  // Compute 30-day timeline series data
  const chartData = useMemo(() => {
    const today = new Date();
    const result: Array<{
      dateStr: string;
      displayDate: string;
      stockIn: number;
      stockOut: number;
      netChange: number;
      txCount: number;
    }> = [];

    // Create array for past N days
    for (let i = timeRangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const display = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

      result.push({
        dateStr: isoDate,
        displayDate: display,
        stockIn: 0,
        stockOut: 0,
        netChange: 0,
        txCount: 0,
      });
    }

    const dateMap = new Map(result.map((r) => [r.dateStr, r]));

    // Filter logs by selected product & date range
    logs.forEach((log) => {
      if (selectedProductId !== 'ALL' && log.productId !== selectedProductId) {
        return;
      }

      let logDateStr = '';
      try {
        logDateStr = new Date(log.timestamp).toISOString().split('T')[0];
      } catch (e) {
        return;
      }

      const entry = dateMap.get(logDateStr);
      if (entry) {
        entry.txCount += 1;
        if (log.action === 'IN') {
          entry.stockIn += Math.abs(log.quantityChange || 1);
        } else if (log.action === 'OUT') {
          entry.stockOut += Math.abs(log.quantityChange || 1);
        } else if (log.action === 'SET_ADJUST') {
          if (log.quantityChange > 0) {
            entry.stockIn += log.quantityChange;
          } else {
            entry.stockOut += Math.abs(log.quantityChange);
          }
        }
        entry.netChange = entry.stockIn - entry.stockOut;
      }
    });

    return result;
  }, [logs, selectedProductId, timeRangeDays]);

  // Aggregate Summary Stats
  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalTx = 0;

    chartData.forEach((d) => {
      totalIn += d.stockIn;
      totalOut += d.stockOut;
      totalTx += d.txCount;
    });

    const net = totalIn - totalOut;
    return { totalIn, totalOut, net, totalTx };
  }, [chartData]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-6 mb-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              Stok Hareket Trendleri ({timeRangeDays} Gün)
            </h3>
            <p className="text-xs text-gray-500">
              Giriş, sevkiyat ve günlük net stok değişimlerinin zaman çizelgesi
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Product Filter */}
          <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="bg-transparent text-gray-800 font-bold focus:outline-none max-w-[180px] truncate"
            >
              <option value="ALL">Tüm Ürünler ({products.length})</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRangeDays(days)}
                className={`px-3 py-1 rounded-lg transition ${
                  timeRangeDays === days
                    ? 'bg-white text-gray-900 shadow-xs font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {days} Gün
              </button>
            ))}
          </div>

          {/* Chart View Type */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setChartType('AREA')}
              className={`px-2.5 py-1 rounded-lg transition ${
                chartType === 'AREA'
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Alan
            </button>
            <button
              onClick={() => setChartType('BAR')}
              className={`px-2.5 py-1 rounded-lg transition ${
                chartType === 'BAR'
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Sütun
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-xl">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 mb-1">
            <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
            <span>TOPLAM GİRİŞ</span>
          </div>
          <div className="text-xl font-black text-emerald-950 font-mono">
            +{totals.totalIn} <span className="text-xs font-normal text-emerald-700">koli</span>
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200/80 p-3 rounded-xl">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-800 mb-1">
            <ArrowUpCircle className="w-4 h-4 text-rose-600" />
            <span>TOPLAM SEVKİYAT</span>
          </div>
          <div className="text-xl font-black text-rose-950 font-mono">
            -{totals.totalOut} <span className="text-xs font-normal text-rose-700">koli</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 mb-1">
            <Activity className="w-4 h-4 text-amber-600" />
            <span>NET FARK</span>
          </div>
          <div
            className={`text-xl font-black font-mono ${
              totals.net >= 0 ? 'text-emerald-800' : 'text-rose-700'
            }`}
          >
            {totals.net >= 0 ? `+${totals.net}` : totals.net}{' '}
            <span className="text-xs font-normal text-amber-700">koli</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200/80 p-3 rounded-xl">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-600 mb-1">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>İŞLEM ISILARI</span>
          </div>
          <div className="text-xl font-black text-gray-900 font-mono">
            {totals.totalTx} <span className="text-xs font-normal text-gray-500">kayıt</span>
          </div>
        </div>
      </div>

      {/* Recharts Chart Visualization */}
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'AREA' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="displayDate" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '4px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area
                type="monotone"
                dataKey="stockIn"
                name="Stok Girişi (+)"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorIn)"
              />
              <Area
                type="monotone"
                dataKey="stockOut"
                name="Sevkiyat / Çıkış (-)"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorOut)"
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="displayDate" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '4px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="rect" />
              <Bar dataKey="stockIn" name="Stok Girişi (+)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stockOut" name="Sevkiyat / Çıkış (-)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
