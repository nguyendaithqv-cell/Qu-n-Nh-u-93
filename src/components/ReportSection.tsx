import React, { useMemo, useState } from 'react';
import { Product, Order, Category } from '../types';
import { Calendar, ArrowUpDown, ArrowUp, ArrowDown, Clock, Filter, TrendingUp, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportSectionProps {
  products: Product[];
  orders: Order[];
  categories: Category[];
}

type TimeRangeType = 'all' | 'today' | 'yesterday' | '7days' | 'month_this' | 'month_last' | 'custom';
type SortByType = 'name' | 'qty' | 'revenue' | 'cost' | 'profit';

export default function ReportSection({ products, orders, categories }: ReportSectionProps) {
  // Simple time selector state
  const [timeRange, setTimeRange] = useState<TimeRangeType>('all');
  
  // Custom dates
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Sorting state
  const [sortBy, setSortBy] = useState<SortByType>('revenue');
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  // Helper to determine group type based strictly on category
  const getGroupType = (p: Product, cat: Category | undefined): 'food' | 'drink' => {
    if (cat?.type) {
      return cat.type;
    }
    // Fallback using ONLY category name if type is not defined
    const catName = cat?.name || '';
    const isD = /đồ uống|bia|nước|coca|sting|trà|cafe|café|rượu/i.test(catName);
    return isD ? 'drink' : 'food';
  };

  // Memoized time bounding dates (to avoid redundant recalculations in render loops)
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
  }, [timeRange, startDate, endDate]); // Recalculate on relevant state adjustments

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
      setSortDesc(true); // default to descending for numbers, makes most sense
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
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 ml-1 inline-block" />;
    }
    return sortDesc ? (
      <ArrowDown className="w-3.5 h-3.5 text-orange-600 font-bold ml-1 inline-block" />
    ) : (
      <ArrowUp className="w-3.5 h-3.5 text-orange-600 font-bold ml-1 inline-block" />
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
    const wsData: any[][] = [
      ["BÁO CÁO DOANH THU & LỢI NHUẬN BANH BÈ BIA VÀNG"],
      ["Thời gian áp dụng:", timeStr],
      ["Ngày xuất dữ liệu:", new Date().toLocaleString('vi-VN')],
      [], // Empty row separator
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
    wsData.push([]); // Padding row
    wsData.push([]); // Padding row

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

    // Create the Excel worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style column widths
    ws['!cols'] = [
      { wch: 8 },   // A: STT / Loại
      { wch: 32 },  // B: Tên sản phẩm
      { wch: 18 },  // C: Danh mục
      { wch: 16 },  // D: Phân loại
      { wch: 12 },  // E: SL Bán
      { wch: 18 },  // F: Doanh thu
      { wch: 18 },  // G: Chi phí (Cost)
      { wch: 18 }   // H: Lợi nhuận
    ];

    // Create workbook and package the sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Báo Cáo Doanh Thu");

    // File name format
    const fileDateStr = new Date().toISOString().split('T')[0];
    const rangeSlug = timeRange === 'custom' ? `${startDate}_to_${endDate}` : timeRange;
    const filename = `Bao_Cao_Doanh_Thu_Bia_Vang_${rangeSlug}_${fileDateStr}.xlsx`;

    // Write file to device download directory
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH TITLE AND EXPORT BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="w-5 h-5 text-orange-600" /> Báo cáo doanh thu & lợi nhuận
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
            Thống kê doanh số, chi phí & hiệu quả kinh doanh
          </p>
        </div>
        <button
          onClick={exportToExcel}
          type="button"
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold pb-2 pt-2 px-4 rounded-xl shadow-sm hover:shadow-md transition-all uppercase text-[11px] tracking-wider select-none shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" /> Xuất Báo Cáo Excel
        </button>
      </div>

      {/* TIME RANGE FILTER BAR */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="font-extrabold text-slate-700 tracking-wide uppercase text-xs">Lọc thời gian báo cáo</span>
          </div>
          
          <div className="flex items-center flex-wrap gap-1">
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
                className={`text-[11px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === p.key
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* CUSTOM DATE RANGE SELECTOR */}
        {timeRange === 'custom' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3 border-t border-slate-200 animate-slide-down">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">Từ ngày:</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || todayStr}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-orange-500 pl-8 font-mono"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase w-12 shrink-0">Đến ngày:</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={todayStr}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-orange-500 pl-8 font-mono"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COMPARATIVE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['food', 'drink'].map(type => (
          <div key={type} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute right-4 top-4 bg-slate-50 p-2 rounded-xl text-slate-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-700 uppercase text-xs mb-4 flex items-center gap-1.5">
              {type === 'food' ? '🥗 ĐỒ ĂN' : '🍺 ĐỒ UỐNG / RƯỢU / BIA'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Doanh thu</p>
                <p className="font-mono font-black text-slate-900 text-sm md:text-base mt-0.5">
                  {reportData.totals[type as 'food' | 'drink'].revenue.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Lợi nhuận</p>
                <p className="font-mono font-black text-emerald-600 text-sm md:text-base mt-0.5">
                  {reportData.totals[type as 'food' | 'drink'].profit.toLocaleString('vi-VN')} đ
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* DETAILED STATS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-600">Thống kê chi tiết theo sản phẩm</div>
          <div className="text-[10px] text-slate-400 font-semibold uppercase">
            Bấm vào tiêu đề cột để sắp xếp
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase select-none border-b border-slate-100">
              <tr>
                <th 
                  onClick={() => handleSort('name')} 
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors group text-left w-2/5"
                >
                  <div className="flex items-center">
                    Sản phẩm {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('qty')} 
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors group text-right w-1/12"
                >
                  <div className="flex items-center justify-end">
                    SL bán {getSortIcon('qty')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('revenue')} 
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors group text-right w-1/6"
                >
                  <div className="flex items-center justify-end">
                    Doanh thu {getSortIcon('revenue')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('cost')} 
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors group text-right w-1/6"
                >
                  <div className="flex items-center justify-end">
                    Chi phí (Cost) {getSortIcon('cost')}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('profit')} 
                  className="p-3 cursor-pointer hover:bg-slate-100 transition-colors group text-right w-1/6"
                >
                  <div className="flex items-center justify-end">
                    Lợi nhuận {getSortIcon('profit')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-semibold">
                    Không có số liệu bán hàng trong khoảng thời gian này
                  </td>
                </tr>
              ) : (
                sortedSales.map(s => {
                  const p = products.find(prod => prod.id === s.id);
                  const cat = p ? categories.find(c => c.id === p.categoryId) : undefined;
                  const isD = p ? getGroupType(p, cat) === 'drink' : false;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-extrabold text-slate-800 text-[13px]">{p?.name}</div>
                        <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span>{s.categoryName}</span>
                          <span className={`text-[8px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                            isD 
                              ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {isD ? 'Đồ uống' : 'Đồ ăn'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-700 text-sm">{s.qty}</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-800">{s.revenue.toLocaleString('vi-VN')} đ</td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-500">{s.cost.toLocaleString('vi-VN')} đ</td>
                      <td className="p-3 text-right font-mono text-emerald-600 font-black text-[13px]">{s.profit.toLocaleString('vi-VN')} đ</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
