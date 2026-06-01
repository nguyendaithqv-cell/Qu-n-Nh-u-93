import React, { useMemo, useState } from 'react';
import { Product, Order, Category, StoreConfig } from '../types';
import { Calendar, ArrowUpDown, ArrowUp, ArrowDown, Clock, Filter, TrendingUp, FileSpreadsheet, Monitor, Info, Sparkles, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportSectionProps {
  products: Product[];
  orders: Order[];
  categories: Category[];
  storeConfig?: StoreConfig;
}

type TimeRangeType = 'all' | 'today' | 'yesterday' | '7days' | 'month_this' | 'month_last' | 'custom';
type SortByType = 'name' | 'qty' | 'revenue' | 'cost' | 'profit';

export default function ReportSection({ products, orders, categories, storeConfig }: ReportSectionProps) {
  // Simple time selector state
  const [timeRange, setTimeRange] = useState<TimeRangeType>('all');
  
  // Custom dates
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortByType>('revenue');
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  // Vista visual customization choices
  const [glassColor, setGlassColor] = useState<'cyan' | 'emerald' | 'graphite' | 'ruby'>('cyan');

  // Helper to determine group type based strictly on category
  const getGroupType = (p: Product, cat: Category | undefined): 'food' | 'drink' => {
    if (cat?.type) {
      return cat.type;
    }
    // Fallback using ONLY category name if type is not defined
    const catName = cat?.name || '';
    const isD = /đồ uống|bia|nước|coca|sting|trà|cafe|café|rượu|mơ/i.test(catName);
    return isD ? 'drink' : 'food';
  };

  // Memoized time bounding dates
  const dateRanges = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(todayEnd.getDate() - 1);

    const sevenDaysAgoStart = new Date(todayStart);
    sevenDaysAgoStart.setDate(todayStart.getDate() - 6);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return {
      todayStart, todayEnd,
      yesterdayStart, yesterdayEnd,
      sevenDaysAgoStart,
      thisMonthStart,
      lastMonthStart, lastMonthEnd
    };
  }, [timeRange, startDate, endDate]);

  // Check if order falls in specified range
  const isOrderInTimeRange = (createdAtStr: string) => {
    const date = new Date(createdAtStr);
    const {
      todayStart, todayEnd,
      yesterdayStart, yesterdayEnd,
      sevenDaysAgoStart,
      thisMonthStart,
      lastMonthStart, lastMonthEnd
    } = dateRanges;

    if (timeRange === 'all') return true;
    if (timeRange === 'today') return date >= todayStart && date <= todayEnd;
    if (timeRange === 'yesterday') return date >= yesterdayStart && date <= yesterdayEnd;
    if (timeRange === '7days') return date >= sevenDaysAgoStart && date <= todayEnd;
    if (timeRange === 'month_this') return date >= thisMonthStart && date <= todayEnd;
    if (timeRange === 'month_last') return date >= lastMonthStart && date <= lastMonthEnd;
    if (timeRange === 'custom') {
      if (!startDate || !endDate) return true;
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      return date >= start && date <= end;
    }
    return true;
  };

  // Generate and filter sales statistics based on timing
  const reportData = useMemo(() => {
    const productSales = new Map<string, { qty: number, revenue: number, cost: number, profit: number, categoryName: string }>();

    orders
      .filter(o => o.status === 'completed' && isOrderInTimeRange(o.createdAt))
      .forEach(o => {
        o.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const current = productSales.get(product.id) || { qty: 0, revenue: 0, cost: 0, profit: 0, categoryName: categories.find(c => c.id === product.categoryId)?.name || 'Khác' };
            current.qty += item.quantity;
            current.revenue += item.quantity * item.priceOnOrder;
            current.cost += item.quantity * (product.cost || 0);
            current.profit = current.revenue - current.cost;
            productSales.set(product.id, current);
          }
        });
      });

    const salesArray = Array.from(productSales.entries()).map(([id, data]) => ({ id, ...data }));
    
    const totals = salesArray.reduce((acc, sale) => {
        const prod = products.find(p => p.id === sale.id);
        const cat = prod ? categories.find(c => c.id === prod.categoryId) : undefined;
        const group = prod ? getGroupType(prod, cat) : 'food';
        acc[group].revenue += sale.revenue;
        acc[group].cost += sale.cost;
        acc[group].profit += sale.profit;
        acc[group].qty += sale.qty;
        return acc;
    }, { food: { revenue:0, cost:0, profit:0, qty:0 }, drink: { revenue:0, cost:0, profit:0, qty:0 } });

    return { salesArray, totals };
  }, [orders, products, categories, timeRange, startDate, endDate]);

  // Handle head click for sorting
  const handleSort = (field: SortByType) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true); // default to descending for numbers
    }
  };

  // Sort Sales Array
  const sortedSales = useMemo(() => {
    const list = [...reportData.salesArray];
    return list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        const pA = products.find(p => p.id === a.id)?.name || '';
        const pB = products.find(p => p.id === b.id)?.name || '';
        comparison = pA.localeCompare(pB, 'vi');
      } else {
        const valA = a[sortBy];
        const valB = b[sortBy];
        comparison = valA - valB;
      }
      return sortDesc ? -comparison : comparison;
    });
  }, [reportData.salesArray, sortBy, sortDesc, products]);

  // Render sorting arrow icon
  const getSortIcon = (field: SortByType) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-650 ml-1 inline-block" />;
    }
    return sortDesc ? (
      <ArrowDown className="w-3.5 h-3.5 text-sky-700 font-extrabold ml-1 inline-block drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 text-sky-700 font-extrabold ml-1 inline-block drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]" />
    );
  };

  // Export to Excel function including custom totals and detailed items
  const exportToExcel = () => {
    let timeStr = "Tất cả thời gian";
    if (timeRange === 'today') timeStr = "Hôm nay";
    else if (timeRange === 'yesterday') timeStr = "Hôm qua";
    else if (timeRange === '7days') timeStr = "7 ngày qua";
    else if (timeRange === 'month_this') timeStr = "Tháng này";
    else if (timeRange === 'month_last') timeStr = "Tháng trước";
    else if (timeRange === 'custom') timeStr = `Từ ngày ${startDate} đến ngày ${endDate}`;

    // Create final array of arrays for Excel export
    const storeHeaderName = storeConfig?.name ? storeConfig.name.toUpperCase() : "QUÁN NHẬU KHAI VỊ";
    const wsData: any[][] = [
      [`BÁO CÁO DOANH THU & LỢI NHUẬN - ${storeHeaderName}`],
      ["Thời gian áp dụng:", timeStr],
      ["Ngày xuất dữ liệu:", new Date().toLocaleString('vi-VN')],
      [], 
      ["I. TỔNG HỢP NHÓM SẢN PHẨM (TỔNG HỢP CHUNG)"],
      ["Phân Loại", "Số Lượng Bán", "Doanh Thu (đ)", "Chi Phí (đ)", "Lợi Nhuận (đ)"]
    ];

    const fTotal = reportData.totals.food;
    const dTotal = reportData.totals.drink;
    const grandQty = fTotal.qty + dTotal.qty;
    const grandRev = fTotal.revenue + dTotal.revenue;
    const grandCost = fTotal.cost + dTotal.cost;
    const grandProfit = fTotal.profit + dTotal.profit;

    wsData.push(["Món Ăn (🥗)", fTotal.qty, fTotal.revenue, fTotal.cost, fTotal.profit]);
    wsData.push(["Đồ Uống / Bia (🍺)", dTotal.qty, dTotal.revenue, dTotal.cost, dTotal.profit]);
    wsData.push(["TỔNG CỘNG CHUNG", grandQty, grandRev, grandCost, grandProfit]);
    wsData.push([]); 
    wsData.push([]); 

    wsData.push(["II. CHI TIẾT SỐ LIỆU TỪNG SẢN PHẨM"]);
    wsData.push(["STT", "Tên Sản Phẩm", "Danh Mục", "Phân Loại", "SL Bán", "Doanh Thu (đ)", "Chi Phí (đ)", "Lợi Nhuận (đ)"]);

    sortedSales.forEach((s, index) => {
      const prod = products.find(p => p.id === s.id);
      const cat = prod ? categories.find(c => c.id === prod.categoryId) : undefined;
      const isD = prod ? getGroupType(prod, cat) === 'drink' : false;
      const typeLabel = isD ? "Đồ uống" : "Đồ ăn";

      wsData.push([
        index + 1,
        prod?.name || '',
        s.categoryName,
        typeLabel,
        s.qty,
        s.revenue,
        s.cost,
        s.profit
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 8 },   
      { wch: 32 },  
      { wch: 18 },  
      { wch: 16 },  
      { wch: 12 },  
      { wch: 18 },  
      { wch: 18 },  
      { wch: 18 }   
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo Cáo Doanh Thu");

    const fileDateStr = new Date().toISOString().split('T')[0];
    const rangeSlug = timeRange === 'custom' ? `${startDate}_to_${endDate}` : timeRange;
    const cleanStoreName = storeConfig?.name ? storeConfig.name.replace(/\s+/g, '_') : 'Khai_Vi';
    const filename = `Bao_Cao_Doanh_Thu_${cleanStoreName}_${rangeSlug}_${fileDateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Dynamic Aero styling definitions based on color option selected
  const glassStyles = {
    cyan: {
      frame: 'from-cyan-900/40 to-sky-950/45 border-cyan-400/35 shadow-[0_15px_30px_rgba(6,182,212,0.15)]',
      textGlow: 'shadow-[0_0_8px_rgba(34,211,238,0.3)]',
      accentGradients: 'bg-gradient-to-r from-cyan-600/20 via-sky-600/10 to-transparent',
      glowPulse: 'bg-cyan-500/10'
    },
    emerald: {
      frame: 'from-emerald-950/45 to-teal-900/40 border-emerald-400/35 shadow-[0_15px_30px_rgba(16,185,129,0.15)]',
      textGlow: 'shadow-[0_0_8px_rgba(52,211,153,0.3)]',
      accentGradients: 'bg-gradient-to-r from-emerald-600/20 via-teal-600/10 to-transparent',
      glowPulse: 'bg-emerald-500/10'
    },
    graphite: {
      frame: 'from-slate-900/55 to-slate-950/60 border-slate-400/35 shadow-[0_15px_30px_rgba(0,0,0,0.3)]',
      textGlow: 'shadow-[0_0_8px_rgba(255,255,255,0.1)]',
      accentGradients: 'bg-gradient-to-r from-slate-600/20 via-slate-700/10 to-transparent',
      glowPulse: 'bg-slate-500/10'
    },
    ruby: {
      frame: 'from-rose-950/40 to-purple-950/45 border-rose-400/35 shadow-[0_15px_30px_rgba(244,63,94,0.15)]',
      textGlow: 'shadow-[0_0_8px_rgba(251,113,133,0.3)]',
      accentGradients: 'bg-gradient-to-r from-rose-600/20 via-purple-600/10 to-transparent',
      glowPulse: 'bg-rose-500/10'
    }
  };

  const selectedTheme = glassStyles[glassColor];

  return (
    <div className="relative font-sans text-slate-800 bg-slate-100 p-1 rounded-3xl overflow-hidden shadow-inner space-y-6">
      
      {/* WINDOW BACKGROUND AURORA (VISTA SIGNATURE DREAMY GLOWS) */}
      <div className="absolute inset-x-0 -top-40 h-[600px] bg-gradient-to-b from-cyan-500/10 via-emerald-500/5 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* WINDOW CONTROLS & HEADER: AERO INTERNET EXPLORER GLASS PANEL TEMPLATE */}
      <div className={`rounded-2xl border bg-gradient-to-b ${selectedTheme.frame} backdrop-blur-xl transition-all duration-505 overflow-hidden`}>
        
        {/* AERO GLASS TITLE BAR - GLASS HIGHLIGHT & WINDOW BUTTONS */}
        <div className="relative h-11 px-4 flex items-center justify-between border-b border-white/20 select-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/35 before:to-transparent before:h-[50%] before:pointer-events-none">
          <div className="flex items-center gap-2">
            {/* IE Vista icon look */}
            <div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-sky-600 rounded-full flex items-center justify-center p-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] text-white font-black">e</span>
            </div>
            <span className="font-semibold text-white text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wide flex items-center gap-1.5 font-mono">
              Report.Explorer.exe [Báo Cáo {storeConfig?.name || 'Quán Nhậu KHAI VỊ'} v2.0 - Aero Suite]
            </span>
          </div>

          {/* VISTA CONTROLS */}
          <div className="flex items-center gap-[3px] shrink-0">
            {/* Minimize */}
            <button type="button" className="w-6 h-5 flex items-end justify-center pb-1 text-[10px] font-bold text-white/80 bg-white/10 hover:bg-white/25 active:bg-white/35 border border-white/10 rounded-sm shadow-sm transition-colors">
              _
            </button>
            {/* Maximize */}
            <button type="button" className="w-6 h-5 flex items-center justify-center text-[10px] font-bold text-white/80 bg-white/10 hover:bg-white/25 active:bg-white/35 border border-white/10 rounded-sm shadow-sm transition-colors">
              ❑
            </button>
            {/* Close Button with Vista glowing red hover effect */}
            <button type="button" className="w-[36px] h-5 flex items-center justify-center text-xs font-black text-white/90 bg-red-600/40 hover:bg-red-500 hover:shadow-[0_0_12px_#ef4444] active:bg-red-700 border border-red-500/35 rounded-sm shadow-sm transition-all duration-150">
              ✕
            </button>
          </div>
        </div>

        {/* GLUE SYSTEM CONTROL SUB-BAR (ADDRESS BAR CONCEPT) */}
        <div className="bg-slate-900/60 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-sky-300">Aero Accents:</span>
            {(['cyan', 'emerald', 'graphite', 'ruby'] as const).map(color => (
              <button
                key={color}
                onClick={() => setGlassColor(color)}
                className={`w-4 h-4 rounded-full border border-white/40 shadow-sm capitalize text-[9px] font-black cursor-pointer transition-transform hover:scale-110 ${
                  color === 'cyan' ? 'bg-cyan-500' :
                  color === 'emerald' ? 'bg-emerald-500' :
                  color === 'graphite' ? 'bg-zinc-600' : 'bg-rose-500'
                } ${glassColor === color ? 'ring-2 ring-white scale-120' : ''}`}
                title={color}
              />
            ))}
          </div>

          {/* GREEN HIGH-GLOSS EXCEL EXPORT BUTTON (VISTA "START ENGINE" ENERGY LOOK) */}
          <button
            onClick={exportToExcel}
            type="button"
            className="group relative flex items-center justify-center gap-2 overflow-hidden bg-gradient-to-b from-emerald-450 to-emerald-700 hover:to-emerald-600 text-white font-black px-5 py-2.5 rounded-full shadow-[0_4px_12px_rgba(16,185,129,0.3),inset_0_1.5px_0_rgba(255,255,255,0.6)] hover:shadow-[0_6px_18px_rgba(16,185,129,0.5)] transition-all uppercase text-[11px] tracking-wider select-none shrink-0 cursor-pointer border border-emerald-500/50 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/45 before:to-transparent before:h-[50%]"
          >
            <FileSpreadsheet className="w-4 h-4 animate-bounce" /> 
            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-semibold">Xuất Báo Cáo Excel (Aero Core)</span>
          </button>
        </div>

        {/* WORK WINDOW INTERIOR (CLEAN MATTE METALLIC BACKGROUND / SHELL CONSOLE) */}
        <div className="bg-slate-50 p-6 space-y-6">

          {/* FILTER BAR GADGET */}
          <div className="bg-white/80 border border-slate-200 shadow-md p-4 rounded-xl relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-2 before:bg-gradient-to-r before:from-sky-500 before:via-cyan-400 before:to-emerald-400">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center border border-sky-200">
                  <Clock className="w-4 h-4 text-sky-650" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wide">Bộ lọc thời gian kinh doanh</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">Dựa trên cơ sở dữ liệu đã đồng bộ</p>
                </div>
              </div>
              
              <div className="flex items-center flex-wrap gap-1.5">
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'today', label: 'Hôm nay' },
                  { key: 'yesterday', label: 'Hôm qua' },
                  { key: '7days', label: '7 ngày qua' },
                  { key: 'month_this', label: 'Tháng này' },
                  { key: 'month_last', label: 'Tháng trước' },
                  { key: 'custom', label: 'Tùy chọn...' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setTimeRange(p.key as TimeRangeType)}
                    className={`relative overflow-hidden text-[11px] font-black uppercase px-3.5 py-2 rounded-lg transition-all border ${
                      timeRange === p.key
                        ? 'bg-gradient-to-b from-sky-400 to-sky-700 hover:to-sky-600 text-white shadow-[0_2px_8px_rgba(3,105,161,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] border-sky-600 before:absolute before:inset-z-0 before:top-0 before:left-0 before:right-0 before:h-[50%] before:bg-white/30'
                        : 'bg-gradient-to-b from-white to-slate-100 hover:from-white hover:to-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm active:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CUSTOM DATES CONTAINER */}
            {timeRange === 'custom' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 mt-3 border-t border-slate-150 animate-slide-down">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase w-16 shrink-0">Từ ngày:</span>
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate || todayStr}
                      className="w-full bg-slate-50 border border-slate-250 hover:border-slate-350 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white pl-8 font-mono shadow-inner"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase w-16 shrink-0">Đến ngày:</span>
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      max={todayStr}
                      className="w-full bg-slate-50 border border-slate-250 hover:border-slate-350 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-sky-500 focus:bg-white pl-8 font-mono shadow-inner"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COMPARATIVE DOUBLE GADGET (POLISHED GLOSSY VISTA GLASS PLATES) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* FOODS GADGET (EMERALD GEL EFFECT) */}
            <div className="group relative rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-50 via-emerald-100/40 to-emerald-500/10 p-6 shadow-md overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:to-transparent before:h-[50%] before:pointer-events-none hover:shadow-lg transition-shadow">
              <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-emerald-550/10 flex items-center justify-center text-emerald-600 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] border border-emerald-250">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="font-extrabold text-emerald-800 uppercase text-xs mb-4 tracking-wider flex items-center gap-1.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
                🥗 THỐNG KÊ MÓN ĂN (FOODS)
              </h3>
              <div className="grid grid-cols-2 gap-6 relative z-10">
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Doanh thu mảng</p>
                  <p className="font-mono font-black text-slate-900 text-lg md:text-xl drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] mt-1">
                    {reportData.totals.food.revenue.toLocaleString('vi-VN')} <span className="text-xs font-bold">đ</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-emerald-600 font-black uppercase tracking-wider">Lợi nhuận mảng</p>
                  <p className="font-mono font-black text-emerald-600 text-lg md:text-xl drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] mt-1">
                    {reportData.totals.food.profit.toLocaleString('vi-VN')} <span className="text-xs font-bold">đ</span>
                  </p>
                </div>
              </div>
              {/* Gloss shine gradient layer */}
              <div className="absolute -inset-y-2 -left-12 w-28 bg-white/20 transform rotate-12 skew-x-12 filter blur-sm pointer-events-none group-hover:translate-x-[450px] transition-transform duration-1000 ease-out" />
            </div>

            {/* DRINKS GADGET (CYAN GEL EFFECT) */}
            <div className="group relative rounded-2xl border border-sky-450/40 bg-gradient-to-br from-sky-50 via-sky-100/40 to-sky-500/10 p-6 shadow-md overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:to-transparent before:h-[50%] before:pointer-events-none hover:shadow-lg transition-shadow">
              <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-sky-550/10 flex items-center justify-center text-sky-650 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)] border border-sky-250">
                <Info className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="font-extrabold text-sky-850 uppercase text-xs mb-4 tracking-wider flex items-center gap-1.5 drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
                🍺 THỐNG KÊ ĐỒ UỐNG / BIA (DRINKS)
              </h3>
              <div className="grid grid-cols-2 gap-6 relative z-10">
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Doanh thu mảng</p>
                  <p className="font-mono font-black text-slate-900 text-lg md:text-xl drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] mt-1">
                    {reportData.totals.drink.revenue.toLocaleString('vi-VN')} <span className="text-xs font-bold">đ</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-sky-600 font-black uppercase tracking-wider">Lợi nhuận mảng</p>
                  <p className="font-mono font-black text-sky-600 text-lg md:text-xl drop-shadow-[0_1px_0_rgba(255,255,255,0.8)] mt-1">
                    {reportData.totals.drink.profit.toLocaleString('vi-VN')} <span className="text-xs font-bold">đ</span>
                  </p>
                </div>
              </div>
              {/* Gloss shine gradient layer */}
              <div className="absolute -inset-y-2 -left-12 w-28 bg-white/20 transform rotate-12 skew-x-12 filter blur-sm pointer-events-none group-hover:translate-x-[450px] transition-transform duration-1000 ease-out" />
            </div>

          </div>

          {/* VISTA EXPLORER FILE-LIST GRID CONTAINER */}
          <div className="bg-white rounded-xl border border-slate-250 overflow-hidden shadow-lg">
            
            {/* INSTRUCTION SUBTITLE */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-50 p-4 border-b border-slate-250 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Bảng chi tiết các sản phẩm</span>
              </div>
              <div className="text-[10px] text-slate-400 font-black uppercase bg-slate-200/50 px-2.5 py-1 rounded-md border border-slate-250/60 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-600" /> Bấm tên cột để Sắp Xếp dữ liệu chuẩn
              </div>
            </div>

            {/* DATA GRID TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                {/* VISTA STYLE GLASS COLUMN HEADS */}
                <thead className="bg-gradient-to-b from-slate-100 to-slate-250 text-slate-700 font-extrabold uppercase select-none border-b border-slate-250 relative before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-white/80">
                  <tr>
                    <th 
                      onClick={() => handleSort('name')} 
                      className="p-3.5 cursor-pointer hover:bg-slate-300 active:bg-slate-350 transition-colors group text-left w-2/5 border-r border-slate-200 relative"
                    >
                      <div className="flex items-center">
                        Sản phẩm {getSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('qty')} 
                      className="p-3.5 cursor-pointer hover:bg-slate-300 active:bg-slate-350 transition-colors group text-right w-1/12 border-r border-slate-200"
                    >
                      <div className="flex items-center justify-end">
                        SL bán {getSortIcon('qty')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('revenue')} 
                      className="p-3.5 cursor-pointer hover:bg-slate-300 active:bg-slate-350 transition-colors group text-right w-1/6 border-r border-slate-200"
                    >
                      <div className="flex items-center justify-end">
                        Doanh thu {getSortIcon('revenue')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('cost')} 
                      className="p-3.5 cursor-pointer hover:bg-slate-300 active:bg-slate-350 transition-colors group text-right w-1/6 border-r border-slate-200"
                    >
                      <div className="flex items-center justify-end">
                        Chi phí (Cost) {getSortIcon('cost')}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('profit')} 
                      className="p-3.5 cursor-pointer hover:bg-slate-300 active:bg-slate-350 transition-colors group text-right w-1/6"
                    >
                      <div className="flex items-center justify-end">
                        Lợi nhuận {getSortIcon('profit')}
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* TABLE ROWS - HIGHLY CONTRASTED GLASS SELECTION LOOK */}
                <tbody className="divide-y divide-slate-150">
                  {sortedSales.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 font-extrabold uppercase font-mono tracking-widest bg-slate-50/50">
                        Không có số liệu kinh tế trong khoảng thời gian này
                      </td>
                    </tr>
                  ) : (
                    sortedSales.map((s, idx) => {
                      const p = products.find(prod => prod.id === s.id);
                      const cat = p ? categories.find(c => c.id === p.categoryId) : undefined;
                      const isD = p ? getGroupType(p, cat) === 'drink' : false;
                      return (
                        <tr 
                          key={s.id} 
                          className="hover:bg-sky-100/50 even:bg-slate-50/45 odd:bg-white transition-all duration-100 group/row"
                        >
                          {/* PRODUCT METRICS */}
                          <td className="p-3 border-r border-slate-150">
                            <div className="font-extrabold text-slate-850 text-sm">{p?.name}</div>
                            <div className="text-[9px] text-slate-450 font-black flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="bg-slate-100 border border-slate-250 rounded-md px-1.5 py-0.5 text-slate-600 font-mono">
                                ID: #{s.id.substring(0,6)}
                              </span>
                              <span className="text-slate-555">{s.categoryName}</span>
                              <span className={`text-[8px] px-1.5 py-[1px] rounded-full font-black uppercase tracking-wider ${
                                isD 
                                  ? 'bg-gradient-to-r from-sky-450 to-sky-550 text-sky-850 border border-sky-300 shadow-sm' 
                                  : 'bg-gradient-to-r from-emerald-450 to-emerald-555 text-emerald-850 border border-emerald-300 shadow-sm'
                              }`}>
                                {isD ? 'Đồ uống' : 'Đồ ăn'}
                              </span>
                            </div>
                          </td>

                          {/* QUANTITY SOLD */}
                          <td className="p-3 text-right font-mono font-black text-slate-700 text-sm border-r border-slate-150">
                            {s.qty}
                          </td>

                          {/* REVENUE */}
                          <td className="p-3 text-right font-mono font-semibold text-slate-805 text-sm border-r border-slate-150">
                            {s.revenue.toLocaleString('vi-VN')} <span className="text-[10px] text-slate-400 font-bold">đ</span>
                          </td>

                          {/* COST */}
                          <td className="p-3 text-right font-mono font-bold text-slate-555 text-sm border-r border-slate-150">
                            {s.cost.toLocaleString('vi-VN')} <span className="text-[10px] text-slate-400 font-bold">đ</span>
                          </td>

                          {/* PROFIT */}
                          <td className="p-3 text-right font-mono text-emerald-600 font-black text-sm bg-emerald-50/25 group-hover/row:bg-emerald-50/55 transition-colors">
                            {s.profit.toLocaleString('vi-VN')} <span className="text-[10px] text-emerald-500 font-black">đ</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* VISTA RUNNING LEDGER STATUS FOOTER */}
            <div className="p-3 bg-slate-100 border-t border-slate-250 flex flex-col sm:flex-row items-center justify-between text-[10px] font-bold text-slate-550 uppercase tracking-widest font-mono">
              <div>Hệ thống thống kê: Chuẩn Aero Glass (Offline/Online Synced)</div>
              <div className="text-sky-650 flex items-center gap-1 mt-1 sm:mt-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" /> Đầy đủ {sortedSales.length} sản phẩm
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
