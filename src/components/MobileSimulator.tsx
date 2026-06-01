import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingBag, 
  X, 
  Plus, 
  Minus, 
  CheckCircle, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  CreditCard, 
  Info,
  Gift,
  ArrowRight,
  ClipboardCheck,
  Smartphone,
  ExternalLink,
  ClipboardList,
  History,
  Calendar,
  ArrowLeft,
  Clock,
  MessageCircle
} from 'lucide-react';
import { Product, Category, Order, StoreConfig, Promotion, CartItem, CustomerCookieData } from '../types';
import { setCustomerCookie, getCustomerCookie } from '../data';

interface MobileSimulatorProps {
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  storeConfig: StoreConfig;
  onAddOrder: (newOrder: Order) => Promise<void> | void;
  isStandaloneMobile?: boolean; // if true, render full layout directly
  onToggleAdminView?: () => void; // toggle to view admin on mobile devices
  viewMode?: 'menu' | 'history' | 'contact';
  onViewModeChange?: (mode: 'menu' | 'history' | 'contact') => void;
  orders?: Order[];
}

export default function MobileSimulator({
  products,
  categories,
  promotions,
  storeConfig,
  onAddOrder,
  isStandaloneMobile = false,
  onToggleAdminView,
  viewMode,
  onViewModeChange,
  orders
}: MobileSimulatorProps) {
  // Controlled or uncontrolled view mode state
  const [internalViewMode, setInternalViewMode] = useState<'menu' | 'history' | 'contact'>('menu');
  const activeViewMode = viewMode !== undefined ? viewMode : internalViewMode;

  const handleViewModeChange = (mode: 'menu' | 'history' | 'contact') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
    setInternalViewMode(mode);
  };

  // Local customer orders
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);

  // Clipboard copy state & handler
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopyText = (text: string, label: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error(err);
    }
    document.body.removeChild(textArea);
  };

  // Load patient/order history on mount
  useEffect(() => {
    const historical = localStorage.getItem('bv_my_placed_orders_v3');
    if (historical) {
      try {
        setCustomerOrders(JSON.parse(historical));
      } catch (e) {
        console.error("Failed to parse previous customer orders:", e);
      }
    }
  }, []);

  // Keep customer orders up-to-date with live Firestore statuses
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    
    const historical = localStorage.getItem('bv_my_placed_orders_v3');
    if (historical) {
      try {
        const parsed: Order[] = JSON.parse(historical);
        let hasChanges = false;
        const updated = parsed.map(localOrder => {
          const live = orders.find(o => o.id === localOrder.id);
          if (live && (live.status !== localOrder.status || JSON.stringify(live) !== JSON.stringify(localOrder))) {
            hasChanges = true;
            return live;
          }
          return localOrder;
        });
        
        if (hasChanges) {
          setCustomerOrders(updated);
          localStorage.setItem('bv_my_placed_orders_v3', JSON.stringify(updated));
        }
      } catch (e) {
        console.error("Failed to sync customer orders with live data:", e);
      }
    }
  }, [orders]);

  // Navigation & UI States
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState<string>('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState<string>('');

  // Shipping & Billing States
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerNote, setCustomerNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cod'); // 'cod' | 'banking'
  const [saveCookie, setSaveCookie] = useState<boolean>(true);

  // Checkout Success Bill State
  const [recentPlacedOrder, setRecentPlacedOrder] = useState<Order | null>(null);
  const [copiedBillText, setCopiedBillText] = useState<boolean>(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Hydrate user cookies data on load
  useEffect(() => {
    const cookieData = getCustomerCookie();
    if (cookieData) {
      setCustomerName(cookieData.customerName || '');
      setCustomerPhone(cookieData.customerPhone || '');
      setCustomerAddress(cookieData.customerAddress || '');
      setPaymentMethod(cookieData.paymentMethod || 'cod');
    }
  }, []);

  // Filter and Sort products
  const filteredProducts = products.filter(product => {
    if (!product.isAvailable) return false;
    const matchesCategory = activeCategory === 'all' || product.categoryId === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (activeCategory === 'all') {
      const categoryIndexA = categories.findIndex(c => c.id === a.categoryId);
      const categoryIndexB = categories.findIndex(c => c.id === b.categoryId);
      return categoryIndexA - categoryIndexB;
    }
    return 0;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (item && item.quantity === 1 && delta === -1) {
        setItemToRemove(item);
        return prev;
      }
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const getCartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);
  const getSubtotal = () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Discount calculation
  const getDiscountAmount = () => {
    const sub = getSubtotal();
    if (!appliedPromo) return 0;
    if (sub < appliedPromo.minOrderValue) return 0; // fallback in case cart items reduced

    if (appliedPromo.type === 'percentage') {
      return Math.round((sub * appliedPromo.value) / 100);
    } else {
      return appliedPromo.value; // fixed amount
    }
  };

  const getTotal = () => {
    const sub = getSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, sub - discount);
  };

  // Keep validation updated if cart prices or items change
  useEffect(() => {
    if (appliedPromo && getSubtotal() < appliedPromo.minOrderValue) {
      setAppliedPromo(null);
      setPromoSuccessMsg('');
      setPromoError(`Mã ${appliedPromo.code} yêu cầu đơn hàng từ ${appliedPromo.minOrderValue.toLocaleString('vi-VN')}đ.`);
    }
  }, [cart, appliedPromo]);

  // Handle promo apply
  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccessMsg('');
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError('Vui lòng nhập mã khuyến mãi');
      return;
    }

    const promo = promotions.find(p => p.code.toUpperCase() === code && p.isActive);
    if (!promo) {
      setPromoError('Mã giảm giá không chính xác hoặc đã hết hạn.');
      return;
    }

    const sub = getSubtotal();
    if (sub < promo.minOrderValue) {
      setPromoError(`Mã này chỉ áp dụng cho đơn hàng từ ${promo.minOrderValue.toLocaleString('vi-VN')}đ.`);
      return;
    }

    setAppliedPromo(promo);
    setPromoSuccessMsg(`Áp dụng mã ${promo.code} thành công!`);
  };

  // Submit Order logic
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isPlacingOrder) return;

    if (!customerName.trim()) {
      alert('Vui lòng nhập họ và tên nhận hàng');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Vui lòng nhập số điện thoại giao hàng');
      return;
    }
    if (!customerAddress.trim()) {
      alert('Vui lòng nhập địa chỉ giao hàng');
      return;
    }

    // Save details in cookie if requested
    if (saveCookie) {
      const cookieData: CustomerCookieData = {
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod
      };
      setCustomerCookie(cookieData);
    }

    const sub = getSubtotal();
    const discount = getDiscountAmount();
    const total = getTotal();

    // Generate readable random bill code
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const billCode = `BV-${dateStr}${randSuffix}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      billCode,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      paymentMethod,
      items: cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        priceOnOrder: item.product.price
      })),
      subTotal: sub,
      discountAmount: discount,
      totalAmount: total,
      promoCodeUsed: appliedPromo?.code || undefined,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      note: customerNote.trim() || undefined
    };

    setIsPlacingOrder(true);
    try {
      // Direct integration await so the order registers on Firebase before success
      await onAddOrder(newOrder);
      setRecentPlacedOrder(newOrder);

      // Save order in customer orders local storage list
      const updatedCustomerOrders = [newOrder, ...customerOrders];
      setCustomerOrders(updatedCustomerOrders);
      localStorage.setItem('bv_my_placed_orders_v3', JSON.stringify(updatedCustomerOrders));

      // Reset customer cart and ui states
      setCart([]);
      setIsCartOpen(false);
      setPromoCode('');
      setAppliedPromo(null);
      setPromoSuccessMsg('');
      setCustomerNote('');
    } catch (firebaseErr: any) {
      console.error("Firestore Upload Error caught:", firebaseErr);
      alert('⚠️ GỬI ĐƠN HÀNG LÊN CLOUD THẤT BẠI!\n\nHệ thống không thể tải đơn hàng lên máy chủ Google Firestore.\nDo lỗi: ' + (firebaseErr.message || String(firebaseErr)) + '\n\nChúng tôi vẫn lưu tạm lịch sử đơn hàng này trên trình duyệt điện thoại của bạn.');
      
      // Still allow placement locally so they don't lose progress, but warn
      setRecentPlacedOrder(newOrder);
      const updatedCustomerOrders = [newOrder, ...customerOrders];
      setCustomerOrders(updatedCustomerOrders);
      localStorage.setItem('bv_my_placed_orders_v3', JSON.stringify(updatedCustomerOrders));
      
      setCart([]);
      setIsCartOpen(false);
      setPromoCode('');
      setAppliedPromo(null);
      setPromoSuccessMsg('');
      setCustomerNote('');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Generate complete formatted text invoice for Zalo clipboard sharing
  const generateZaloBillText = (order: Order) => {
    const itemsText = order.items.map(item => 
      `- ${item.productName} (x${item.quantity}): ${(item.priceOnOrder * item.quantity).toLocaleString('vi-VN')}đ`
    ).join('\n');

    const promoText = order.promoCodeUsed 
      ? `Khuyến mãi: -${order.discountAmount.toLocaleString('vi-VN')}đ (${order.promoCodeUsed})` 
      : 'Khuyến mãi: Khác';

    const payMethodText = order.paymentMethod === 'cod' 
      ? 'Tiền mặt khi giao hàng (COD)' 
      : `Chuyển khoản (${storeConfig.bankName})`;

    return `=== ĐƠN HÀNG BẾP VIỆT ONLINE ===
Mã Đơn: ${order.billCode}
Khách hàng: ${order.customerName}
SĐT liên hệ: ${order.customerPhone}
Địa chỉ giao: ${order.customerAddress}
-------------------------------
CHI TIẾT MÓN ĂN:
${itemsText}
-------------------------------
Tạm tính: ${order.subTotal.toLocaleString('vi-VN')}đ
${order.promoCodeUsed ? `${promoText}\n` : ''}Tổng thanh toán: ${order.totalAmount.toLocaleString('vi-VN')}đ
Thanh toán: ${payMethodText}
${order.note ? `Ghi chú khách: ${order.note}\n` : ''}-------------------------------
Hotline cửa hàng: ${storeConfig.zaloHotline}
Cảm ơn quý khách đã tin cậy nâng niu khẩu vị cùng Quán Nhậu KHAI VỊ!`;
  };

  // Copy structured bill to clipboard and redirect to Zalo chat client
  const handleZaloShare = (order: Order) => {
    const billText = generateZaloBillText(order);
    
    // Attempt standard navigator clipboard copy with fallback
    if (navigator.clipboard) {
      navigator.clipboard.writeText(billText)
        .then(() => {
          setCopiedBillText(true);
          setTimeout(() => setCopiedBillText(false), 4000);
        })
        .catch(err => {
          console.error('Could not copy text to clipboard: ', err);
        });
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = billText;
      textArea.style.position = "fixed"; 
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedBillText(true);
        setTimeout(() => setCopiedBillText(false), 4000);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    }

    // Direct url to zalo.me/0969320229 or dynamic API
    setTimeout(() => {
      window.open(`https://zalo.me/${storeConfig.zaloHotline}`, '_blank');
    }, 800);
  };

  const getProductImageSymbol = (product: Product) => {
    if (product.image && (product.image.startsWith('data:image') || product.image.startsWith('http'))) {
      return (
        <img 
          src={product.image} 
          alt={product.name} 
          className="w-full h-full object-cover rounded-[10px]"
        />
      );
    }
    return product.image || '🍛';
  };

  // Standard standalone mobile header/footer
  return (
    <div className={`w-full h-full flex flex-col bg-slate-50 relative ${!isStandaloneMobile ? 'h-[640px] overflow-hidden' : 'min-h-screen'}`}>
      {/* Floating Copy Feedback Toast */}
      {copiedText && (
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 bg-slate-800 text-white font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-xl z-50 flex items-center gap-1 animate-fade-in border border-slate-700">
          <span>✓</span> Đã sao chép {copiedText}
        </div>
      )}
      
      {/* Mobile Top Header */}
      <div className="pt-6 pb-4 px-5 bg-white border-b border-slate-100 z-10 sticky top-0 shadow-xs">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-100">B</span>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-800 italic block">BẾP VIỆT</span>
              <div className="flex items-center gap-1 -mt-1.5">
                <span className="text-[10px] text-orange-600 uppercase font-extrabold tracking-widest block">Trực tuyến</span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse block" title="Đồng bộ đám mây hoạt động"></span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Direct Admin toggle badge on mobile viewport */}
            {onToggleAdminView && (
              <button 
                onClick={onToggleAdminView}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 uppercase"
              >
                <Smartphone className="w-3.5 h-3.5 text-orange-600" />
                Vào Admin
              </button>
            )}

            <button 
              onClick={() => cart.length > 0 && setIsCartOpen(true)}
              className="p-2 relative bg-slate-100 hover:bg-orange-50 hover:text-orange-600 rounded-full transition-all"
            >
              <ShoppingBag className="w-5 h-5 text-slate-700" />
              {getCartCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white font-mono text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {getCartCount()}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeViewMode === 'menu' ? (
          <>
            {/* Searching Interface */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Tìm món: phở, bún, nem..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-8 text-xs font-medium focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 bg-slate-200 rounded-full p-0.5 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dynamic Categories Scrollbar */}
            <div className="flex gap-2 mt-3.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 ${
                  activeCategory === 'all'
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 flex items-center gap-1 ${
                    activeCategory === cat.id
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : activeViewMode === 'history' ? (
          <div className="flex items-center gap-2 py-0.5 animate-fade-in">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-current" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Đơn hàng của tôi</h2>
              <p className="text-[9px] text-slate-400 font-semibold uppercase -mt-0.5">Lịch sử {customerOrders.length} đơn đặt trên thiết bị</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-0.5 animate-fade-in">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Phone className="w-5 h-5 text-current" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Liên hệ quán</h2>
              <p className="text-[9px] text-slate-400 font-semibold uppercase -mt-0.5">Hotline, địa chỉ & hoạt động quán</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Dishes Area */}
      {activeViewMode === 'menu' ? (
        <div 
          className={`flex-1 overflow-y-auto px-4 pt-3 bg-slate-50/70 ${
            getCartCount() > 0 
              ? (isStandaloneMobile ? 'pb-[210px]' : 'pb-[180px]') 
              : (isStandaloneMobile ? 'pb-16' : 'pb-20')
          }`} 
          id="mobile-menu-viewport"
        >
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <span className="text-4xl mb-2">🔍</span>
              <p className="font-bold text-sm text-slate-700">Không tìm thấy món ăn!</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng thử tìm kiếm với từ khóa khác hoặc chuyển danh mục.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mb-1 px-1">
                Thực đơn ({filteredProducts.length} món sẵn có)
              </p>
              {filteredProducts.map(product => (
                <div 
                  key={product.id}
                  className="bg-white p-3 rounded-2xl shadow-xs border border-slate-100 flex gap-3 hover:border-orange-200 transition-colors"
                >
                  {/* Product Image representation */}
                  <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center text-4xl shrink-0 select-none">
                    {getProductImageSymbol(product)}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-slate-800 truncate">{product.name}</h3>
                      <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">{product.description}</p>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-orange-600 font-extrabold text-xs">
                        {product.price.toLocaleString('vi-VN')}đ
                      </span>
                      
                      {/* Cart counter indicator for this product */}
                      {cart.find(c => c.product.id === product.id) ? (
                        <div className="flex items-center gap-1.5 bg-orange-50 rounded-lg p-0.5">
                          <button 
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-5 h-5 bg-white text-orange-600 border border-orange-100 rounded flex items-center justify-center text-xs font-extrabold shadow-sm active:scale-90"
                          >
                            -
                          </button>
                          <span className="text-[10px] font-bold text-orange-600 px-0.5 min-w-3 text-center">
                            {cart.find(c => c.product.id === product.id)?.quantity}
                          </span>
                          <button 
                            onClick={() => addToCart(product)}
                            className="w-5 h-5 bg-orange-600 text-white rounded flex items-center justify-center text-xs font-extrabold shadow-sm active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(product)}
                          className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-extrabold rounded-lg transition-transform active:scale-95 flex items-center gap-1 shadow-xs shadow-orange-100"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Simple operating notice */}
          <div className="mt-8 mb-4 text-center">
            <p className="text-[9px] text-slate-400">Giờ phục vụ: {storeConfig.openHours} hằng ngày</p>
            <p className="text-[9px] text-slate-300 mt-0.5">Cam kết nguyên liệu sạch, thơm nóng giao nhanh</p>
          </div>
        </div>
      ) : activeViewMode === 'history' ? (
        /* History View Area */
        <div 
          className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50/70 pb-20 animate-fade-in"
          id="mobile-history-viewport"
        >
          {customerOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mb-4 text-slate-400 select-none">
                📥
              </div>
              <p className="font-extrabold text-sm text-slate-700">Chưa có đơn hàng nào!</p>
              <p className="text-[10px] text-slate-400 mt-1.5 max-w-[240px] leading-relaxed">
                Các đơn hàng bạn đặt tại quán sẽ xuất hiện ở đây để bạn tiện theo dõi trạng thái món ăn.
              </p>
              <button 
                onClick={() => handleViewModeChange('menu')}
                className="mt-6 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] rounded-xl shadow-md uppercase tracking-wider"
              >
                Trở lại Thực Đơn
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5 pb-20">
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-1">
                Lịch sử đặt món ({customerOrders.length} đơn hàng)
              </p>
              {customerOrders.map((localOrder) => {
                const liveOrder = orders?.find(o => o.id === localOrder.id);
                const order = liveOrder || localOrder;
                const isPaidViaBank = order.paymentMethod === 'banking';
                const statusLabels: Record<string, { text: string, color: string, bg: string }> = {
                  'pending': { text: 'Chờ duyệt', color: 'text-orange-600', bg: 'bg-orange-50 border border-orange-100' },
                  'preparing': { text: 'Đang nấu', color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100' },
                  'delivering': { text: 'Đang giao', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100' },
                  'shipping': { text: 'Đang giao', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100' },
                  'completed': { text: 'Đã giao', color: 'text-green-600', bg: 'bg-green-50 border border-green-100' },
                  'cancelled': { text: 'Đã hủy', color: 'text-rose-600', bg: 'bg-rose-50 border border-rose-100' }
                };
                const statusMeta = statusLabels[order.status] || { text: 'Chờ duyệt', color: 'text-orange-600', bg: 'bg-orange-50 border border-orange-100' };

                const paymentStatusLabels: Record<string, { text: string, color: string, bg: string }> = {
                  'unpaid': { text: 'Chưa TT', color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-100' },
                  'paid': { text: 'Đã TT', color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100' },
                  'debt': { text: 'Ghi nợ', color: 'text-rose-600', bg: 'bg-rose-50 border border-rose-100' }
                };
                const payStatusMeta = paymentStatusLabels[order.paymentStatus || 'unpaid'] || paymentStatusLabels['unpaid'];

                return (
                  <div 
                    key={order.id}
                    className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-100 hover:border-slate-200 transition-colors space-y-2.5 relative overflow-hidden"
                  >
                    {/* Status badge in top-right corner */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-orange-600 font-extrabold text-[13px] block tracking-wide">
                          {order.billCode}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono">
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${statusMeta.color} ${statusMeta.bg}`}>
                          {statusMeta.text}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${payStatusMeta.color} ${payStatusMeta.bg}`}>
                          {payStatusMeta.text}
                        </span>
                      </div>
                    </div>

                    {/* Displayer for ordered dishes */}
                    <div className="bg-slate-50/70 p-2.5 rounded-xl text-xs text-slate-700 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="font-medium text-slate-800">
                            {item.productName} <span className="text-slate-400 text-[10px]">x{item.quantity}</span>
                          </span>
                          <span className="font-mono text-slate-600">
                            {(item.priceOnOrder * item.quantity).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Technical values summary */}
                    <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-2 font-medium">
                      <span className="text-[10px] text-slate-400">
                        Thanh toán: <span className="font-bold text-slate-600 uppercase">{order.paymentMethod === 'cod' ? 'COD' : 'Momo/Bank'}</span>
                      </span>
                      <span className="text-slate-800 font-extrabold text-[11px]">
                        Tổng: <span className="text-orange-600 text-sm font-mono">{order.totalAmount.toLocaleString('vi-VN')}đ</span>
                      </span>
                    </div>

                    {/* Utilities footer action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50 shrink-0">
                      <button
                        onClick={() => handleZaloShare(order)}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 rounded-xl text-[9px] font-extrabold transition-colors flex items-center justify-center gap-1 uppercase"
                      >
                        <div className="w-3.5 h-3.5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[7.5px] font-black">Z</div>
                        Gửi lại Zalo
                      </button>

                      {isPaidViaBank && order.status === 'pending' ? (
                        <button
                          onClick={() => {
                            setRecentPlacedOrder(order);
                          }}
                          className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 py-2 rounded-xl text-[9px] font-extrabold transition-colors flex items-center justify-center gap-1 uppercase"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-current" />
                          Xem QR CK
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            // Copy complete details
                            const billText = generateZaloBillText(order);
                            const textArea = document.createElement("textarea");
                            textArea.value = billText;
                            textArea.style.position = "fixed"; 
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            try {
                              document.execCommand('copy');
                              alert(`Đã sao chép hóa đơn ${order.billCode} vào bộ nhớ tạm!`);
                            } catch (e) {
                              console.error(e);
                            }
                            document.body.removeChild(textArea);
                          }}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-[9px] font-extrabold transition-colors flex items-center justify-center gap-1 uppercase"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-current" />
                          Sao chép bill
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Contact/Liên hệ View Area */
        <div 
          className="flex-1 overflow-y-auto px-4 pt-4 bg-slate-50/70 pb-20 animate-fade-in text-slate-800"
          id="mobile-contact-viewport"
        >
          <div className="flex flex-col gap-4 pb-16">
            
            {/* 1. Shop Info & Operating Hours */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                  🏪
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Thông tin quán</h3>
                  <p className="text-[9px] text-slate-400 font-medium font-sans">Giới thiệu quán ăn của chúng tôi</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Store Name */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Tên cửa hàng</label>
                  <p className="font-black text-slate-850 text-xs">{storeConfig.name}</p>
                </div>

                {/* Address */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Địa chỉ quán</label>
                  <div className="flex items-start gap-1.5 justify-between">
                    <p className="font-medium text-slate-600 leading-normal text-[11px] max-w-[80%]">{storeConfig.address}</p>
                    <button 
                      onClick={() => handleCopyText(storeConfig.address, 'địa chỉ')}
                      className="text-[9px] font-extrabold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100/80 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Sao chép
                    </button>
                  </div>
                </div>

                {/* Operating Hours */}
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Thời gian mở cửa</label>
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px] mt-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase shrink-0">Đang phục vụ</span>
                    <span className="font-bold text-slate-800">{storeConfig.openHours}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Hotline & Zalo Contact Area */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                  📞
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Hotline & Chat Zalo</h3>
                  <p className="text-[9px] text-slate-400 font-medium font-sans">Liên hệ khẩn cấp hoặc đặt trước</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100/50">
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Số Điện Thoại</span>
                    <p className="font-black text-slate-800 text-sm font-mono tracking-wider">{storeConfig.phone}</p>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleCopyText(storeConfig.phone, 'hotline')}
                      className="text-[9px] font-extrabold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Sao chép
                    </button>
                    <a 
                      href={`tel:${storeConfig.phone.replace(/\s+/g, '')}`}
                      className="text-[9px] font-black uppercase text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs shadow-orange-100 flex items-center gap-1"
                    >
                      Gọi điện
                    </a>
                  </div>
                </div>

                {/* ZALO CHAT REDIRECT CLIENT BUTTON */}
                <div className="pt-1">
                  <a 
                    href={`https://zalo.me/${storeConfig.phone.replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#0068ff] hover:bg-[#005ad4] text-white py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-100/50 transition-all uppercase tracking-wide cursor-pointer text-center"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-transparent" />
                    Nhắn tin trực tuyến Zalo
                  </a>
                  <p className="text-[8px] text-center text-slate-400 mt-2 font-medium leading-relaxed">
                    *Khách hàng click để tự động chuyển sang ứng dụng Zalo bắt đầu trò chuyện trực tiếp với chúng tôi qua số điện thoại trên.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Bank Transfer Details & VietQR Code */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                  💳
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Tài khoản thanh toán</h3>
                  <p className="text-[9px] text-slate-400 font-medium font-sans">Chuyển khoản thanh toán đơn hàng</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Account metadata Table */}
                <div className="space-y-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-200/50">
                    <span className="text-slate-400 font-semibold">Tên ngân hàng</span>
                    <span className="font-extrabold text-slate-800">{storeConfig.bankName}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-200/50">
                    <span className="text-slate-400 font-semibold">Chủ tài khoản</span>
                    <span className="font-black text-slate-800 uppercase tracking-wide">{storeConfig.bankAccountName}</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-semibold">Số tài khoản</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-850 font-mono tracking-wider">{storeConfig.bankAccount}</span>
                      <button 
                        onClick={() => handleCopyText(storeConfig.bankAccount, 'số tài khoản')}
                        className="text-[8px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                      >
                        Sao chép
                      </button>
                    </div>
                  </div>
                </div>

                {/* Real-time VietQR render */}
                <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 font-extrabold text-[8px] uppercase tracking-wider rounded-full mb-3">
                    Mã QR Thanh Toán Bằng Camera
                  </span>
                  
                  <div className="relative w-40 h-40 bg-white border border-slate-100 rounded-2xl p-2 flex items-center justify-center shadow-xs overflow-hidden">
                    <img 
                      src={storeConfig.customQrCodeUrl || `https://img.vietqr.io/image/${storeConfig.bankName?.replace(/\s+/g, '') || 'MB'}-${storeConfig.bankAccount?.replace(/\s+/g, '') || '0000'}-compact2.png?amount=0&addInfo=Thanh%20Toan%20Bep%20Viet`} 
                      alt="Quét để chuyển khoản" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <p className="text-[8.5px] text-center text-slate-400 font-bold max-w-[210px] leading-relaxed mt-2.5">
                    {storeConfig.customQrCodeUrl 
                      ? 'Hình ảnh mã QR thanh toán cá nhân được tải lên bởi cửa hàng.' 
                      : 'Quét nhanh để thanh toán không chạm. Hệ thống tự nhận diện ngân hàng nhận mà không cần nhập thủ công.'}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Floating Cart Tab */}
      {getCartCount() > 0 && (
        <div className={`absolute ${isStandaloneMobile ? 'bottom-20' : 'bottom-4'} inset-x-4 bg-orange-600 text-white p-3 rounded-2xl shadow-xl shadow-orange-200 flex justify-between items-center z-10 animate-bounce-subtle`}>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2"
          >
            <div className="p-1.5 bg-white/20 rounded-lg relative">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="absolute -top-1 -right-1 bg-white text-orange-600 text-[8px] font-extrabold w-3 h-3 rounded-full flex items-center justify-center">
                {getCartCount()}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-white/95">Đang chọn {getCartCount()} món</p>
              <p className="text-xs font-extrabold block -mt-0.5">{getTotal().toLocaleString('vi-VN')}đ</p>
            </div>
          </button>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-white text-orange-600 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 uppercase tracking-wide hover:bg-orange-50 whitespace-nowrap"
          >
            Xem giỏ hàng <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Cart & Checkout Drawer Panel */}
      {isCartOpen && (
        <div className={`${isStandaloneMobile ? 'fixed' : 'absolute'} inset-0 bg-slate-900/40 z-50 flex flex-col justify-end ${isStandaloneMobile ? 'pb-[64px]' : ''}`}>
          <div className="bg-white w-full max-h-[95%] rounded-t-3xl shadow-[0_-15px_30px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-600" />
                <h2 className="font-bold text-sm text-slate-800">Giỏ hàng ({getCartCount()} món)</h2>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 bg-slate-200/60 hover:bg-slate-200 rounded-full text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Cart Content & Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* Added Items List */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Món ăn đã chọn</p>
                <div className="divide-y divide-slate-100">
                  {cart.map(item => (
                    <div key={item.product.id} className="py-2.5 flex justify-between items-center gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Remove or minimize the image part */}
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800">{item.product.name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.product.price.toLocaleString('vi-VN')}đ / phần
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5">
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-6 h-6 bg-white text-slate-700 border border-slate-200 rounded flex items-center justify-center text-xs font-bold active:scale-95"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold text-slate-800 px-1 min-w-4 text-center">
                            {item.quantity}
                          </span>
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-6 h-6 bg-white text-slate-700 border border-slate-200 rounded flex items-center justify-center text-xs font-bold active:scale-95"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          {(item.product.price * item.quantity).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Removal Modal */}
              {itemToRemove && (
                <div className="absolute inset-0 bg-slate-900/50 z-[60] flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl animate-fade-in">
                    <p className="text-sm font-bold text-slate-800 text-center mb-4">
                      Bạn có muốn xóa <span className="text-orange-600">"{itemToRemove.product.name}"</span> khỏi giỏ hàng?
                    </p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setItemToRemove(null)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={() => {
                          setCart(prev => prev.filter(i => i.product.id !== itemToRemove.product.id));
                          setItemToRemove(null);
                        }}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Promo code Section */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-orange-600" /> Mã khuyến mãi
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Mã: FREE_SHIP, GIAM10_PHO..." 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white outline-none uppercase text-slate-800"
                  />
                  <button 
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-bold transition-all shrink-0 uppercase"
                  >
                    Áp dụng
                  </button>
                </div>
                {promoError && <p className="text-[9px] text-red-500 font-semibold px-1">{promoError}</p>}
                {promoSuccessMsg && <p className="text-[9px] text-green-600 font-semibold px-1">{promoSuccessMsg}</p>}
              </div>

              {/* Delivery Checkout Info Form */}
              <form onSubmit={handlePlaceOrder} className="pt-3 border-t border-slate-100 space-y-3 pb-8">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-600" /> Thông tin giao hàng
                </p>

                <div className="space-y-2.5">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Họ và tên người nhận" 
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800"
                    />
                    <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="relative">
                    <input 
                      type="tel" 
                      placeholder="Số điện thoại nhận hàng" 
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800 font-mono"
                    />
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Địa chỉ giao cụ thể" 
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800"
                    />
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  </div>

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ghi chú người bán (ví dụ: Không hành, nhiều ớt...)" 
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-1 focus:ring-orange-200 focus:bg-white transition-all outline-none text-slate-800"
                    />
                    <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  </div>
                </div>

                {/* Cookie Checkbox Option */}
                <div className="flex items-start gap-2 pt-1 font-sans">
                  <input 
                    type="checkbox" 
                    id="save_cookie" 
                    checked={saveCookie} 
                    onChange={(e) => setSaveCookie(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 accent-orange-600 focus:ring-orange-400 h-3.5 w-3.5"
                  />
                  <label htmlFor="save_cookie" className="text-[10px] font-medium text-slate-500 cursor-pointer select-none">
                    Ghi nhớ thông tin giao hàng của tôi cho lần sau <span className="text-orange-600 font-semibold">(Sử dụng Cookie)</span>
                  </label>
                </div>

                {/* Payment Method Selector */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-orange-600" /> Hình thức thanh toán
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-2.5 border rounded-xl text-left transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-orange-600 bg-orange-50/50 text-orange-600 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 font-semibold'
                      }`}
                    >
                      <p className="text-[11px]">Tiền mặt COD</p>
                      <p className="text-[8px] text-slate-400 font-medium">Nhận hàng trả tiền</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('banking')}
                      className={`p-2.5 border rounded-xl text-left transition-all ${
                        paymentMethod === 'banking'
                          ? 'border-orange-600 bg-orange-50/50 text-orange-600 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 font-semibold'
                      }`}
                    >
                      <p className="text-[11px]">Chuyển khoản</p>
                      <p className="text-[8px] text-slate-400 font-medium">Quét mã QR ngân hàng</p>
                    </button>
                  </div>
                </div>

                {/* Display Banking Transfer Instructions if selected */}
                {paymentMethod === 'banking' && (
                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1 text-slate-700 animate-fade-in text-[10px] leading-relaxed">
                    <p className="font-bold text-blue-800 flex items-center gap-1">
                      <Info className="w-3 h-3 text-blue-700" /> HƯỚNG DẪN CHUYỂN KHOẢN NGÂN HÀNG:
                    </p>
                    <div className="pl-1 space-y-0.5 text-slate-600">
                      <p>🏦 Ngân hàng: <strong className="text-slate-800">{storeConfig.bankName}</strong></p>
                      <p>💳 Số tài khoản: <strong className="text-slate-800">{storeConfig.bankAccount}</strong></p>
                      <p>👤 Chủ tài khoản: <strong className="text-slate-800 uppercase">{storeConfig.bankAccountName}</strong></p>
                      <p>📝 Nội dung chuyển khoản cần ghi: <strong className="text-orange-600 text-[11px] font-mono font-bold tracking-wider">{customerName ? customerName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toUpperCase() : "TEN KHACH HANG"} Chuyen tien</strong></p>
                    </div>
                  </div>
                )}

                {/* Summary prices */}
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between items-center">
                    <span>Tạm tính ({getCartCount()} món)</span>
                    <span className="font-mono">{getSubtotal().toLocaleString('vi-VN')}đ</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between items-center text-green-600 font-semibold">
                      <span>Giảm giá ({appliedPromo.code})</span>
                      <span className="font-mono">-{getDiscountAmount().toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold text-slate-800 pt-0.5 text-sm">
                    <span>Tổng thanh toán</span>
                    <span className="font-mono text-orange-600 text-base">{getTotal().toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                {/* Place Order CTA */}
                <button
                  type="submit"
                  disabled={isPlacingOrder}
                  className={`w-full text-white font-extrabold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4 uppercase text-xs tracking-wider shadow-md ${
                    isPlacingOrder 
                      ? 'bg-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-orange-600 hover:bg-orange-700 shadow-orange-100'
                  }`}
                >
                  {isPlacingOrder ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang gửi đơn lên đám mây...
                    </>
                  ) : (
                    `Xác nhận đặt hàng • ${getTotal().toLocaleString('vi-VN')}đ`
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Success Bill Modal Screen */}
      {recentPlacedOrder && (
        <div className={`${isStandaloneMobile ? 'fixed' : 'absolute'} inset-0 bg-white z-50 p-5 flex flex-col justify-between overflow-y-auto ${isStandaloneMobile ? 'pb-24' : ''}`}>
          
          <div className="space-y-4">
            
            {/* Success icon header */}
            <div className="text-center pt-4">
              <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md shadow-green-100">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h1 className="text-lg font-black text-slate-800">Đặt hàng thành công!</h1>
              <p className="text-[10px] text-slate-400 font-medium">Quán Nhậu KHAI VỊ đã nhận đơn hàng và chuẩn bị chế biến</p>
            </div>

            {/* Bill Details Invoice */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 font-sans relative overflow-hidden">
              <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded-bl-lg uppercase">
                Hóa đơn chính thức
              </div>

              <div className="border-b border-dashed border-slate-200 pb-2 mb-2">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Mã đơn đặt hàng</p>
                <p className="text-sm font-black font-mono text-orange-600 tracking-wider -mt-0.5">{recentPlacedOrder.billCode}</p>
                <p className="text-[8px] text-slate-400 font-mono mt-0.5">Đặt lúc: {new Date(recentPlacedOrder.createdAt).toLocaleString('vi-VN')}</p>
              </div>

              {/* Items Table details */}
              <div className="space-y-1 mb-2 border-b border-slate-100 pb-2">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Món ăn chi tiết</p>
                {recentPlacedOrder.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-xs text-slate-700">
                    <span className="font-semibold line-clamp-1">{item.productName} <span className="text-slate-400 text-[10px]">x{item.quantity}</span></span>
                    <span className="font-mono shrink-0">{(item.priceOnOrder * item.quantity).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))}
              </div>

              {/* Customer summary */}
              <div className="text-[10px] space-y-0.5 text-slate-600 border-b border-slate-100 pb-2 mb-2">
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-1">Thông tin giao nhận</p>
                <p>🙋‍♂️ Người nhận: <strong className="text-slate-800">{recentPlacedOrder.customerName}</strong></p>
                <p>📞 Điện thoại: <strong className="text-slate-800 font-mono">{recentPlacedOrder.customerPhone}</strong></p>
                <p>📍 Địa chỉ: <strong className="text-slate-800 line-clamp-1">{recentPlacedOrder.customerAddress}</strong></p>
                {recentPlacedOrder.note && <p>💬 Ghi chú: <strong className="text-slate-600 italic">"{recentPlacedOrder.note}"</strong></p>}
              </div>

              {/* Financial summary calculations */}
              <div className="text-[11px] text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span className="font-mono">{recentPlacedOrder.subTotal.toLocaleString('vi-VN')}đ</span>
                </div>
                {recentPlacedOrder.promoCodeUsed && (
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>Mã giảm ({recentPlacedOrder.promoCodeUsed}):</span>
                    <span className="font-mono">-{recentPlacedOrder.discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between text-[13px] font-black text-orange-600 pt-1 border-t border-slate-100">
                  <span>Tổng thanh toán:</span>
                  <span className="font-mono">{recentPlacedOrder.totalAmount.toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="text-[9px] font-semibold text-slate-500 mt-1 uppercase text-right">
                  Hình thức: {recentPlacedOrder.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : `Chuyển khoản Vietcombank`}
                </div>
              </div>
            </div>

            {/* Banking scan helper details after checkout */}
            {recentPlacedOrder.paymentMethod === 'banking' && (
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-slate-600 space-y-2">
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1">🏦 Thao tác Chuyển khoản QR:</p>
                <p className="text-[9px] leading-relaxed">
                  Ngân hàng: <strong>{storeConfig.bankName}</strong><br />
                  Số tài khoản: <strong>{storeConfig.bankAccount}</strong><br />
                  Số tiền chuyển: <strong className="text-orange-600 text-[10px] font-mono">{recentPlacedOrder.totalAmount.toLocaleString('vi-VN')}đ</strong><br />
                  Nội dung chuyển khoản cần ghi: <strong className="text-blue-800 font-mono font-bold">{recentPlacedOrder.customerName ? recentPlacedOrder.customerName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toUpperCase() : "TEN KHACH HANG"} Chuyen tien</strong>
                </p>
                {/* Visual QR Image */}
                <div className="flex flex-col items-center justify-center bg-white p-2 border border-blue-100 rounded-lg mt-1">
                  <div className="w-24 h-24 relative bg-slate-50 border border-slate-100 rounded-md overflow-hidden flex items-center justify-center shadow-xs">
                    <img 
                      src={storeConfig.customQrCodeUrl || `https://img.vietqr.io/image/${storeConfig.bankName?.replace(/\s+/g, '') || 'MB'}-${storeConfig.bankAccount?.replace(/\s+/g, '') || '0000'}-compact2.png?amount=${recentPlacedOrder.totalAmount}&addInfo=${(recentPlacedOrder.customerName ? recentPlacedOrder.customerName.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toUpperCase() : "TEN KHACH HANG") + " Chuyen tien"}`} 
                      alt="Quét Mã Chuyển Khoản" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-[7.5px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Mở app ngân hàng quét mã</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4 shrink-0">
            {/* Zalo Button Integration (Zalo code, copies order details to clipboard) */}
            <button 
              onClick={() => handleZaloShare(recentPlacedOrder)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-100"
            >
              <div className="w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[11px] font-black">Z</div>
              <div className="text-left leading-normal">
                <span className="block font-extrabold text-[12px] uppercase">Gửi qua Zalo (Hotline)</span>
                <span className="block text-[8px] text-blue-100 font-medium -mt-0.5">Tự động sao chép hóa đơn và mở Zalo</span>
              </div>
            </button>

            {/* Feedback alert for Clipboard copying */}
            {copiedBillText && (
              <div className="p-1 px-3 bg-blue-50 text-blue-600 font-semibold border border-blue-200 rounded-lg text-[9px] text-center flex items-center justify-center gap-1 animate-bounce">
                <ClipboardCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                Sao chép hóa đơn thành công! Hãy dán để gửi cho Zalo Hotline <strong>{storeConfig.zaloHotline}</strong>.
              </div>
            )}

            <button 
              onClick={() => setRecentPlacedOrder(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-normal"
            >
              Quay lại Thực đơn chính
            </button>
            <p className="text-[8px] text-center text-slate-300">Tổng đài hỗ trợ gấp: {storeConfig.phone}</p>
          </div>
        </div>
      )}

      {/* Embedded Simulated Bottom Navigation Bar inside Desktop mockup */}
      {!isStandaloneMobile && (
        <div className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-100 p-2 flex justify-around items-center z-40 shadow-xs">
          <button
            onClick={() => handleViewModeChange('menu')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-black uppercase transition-all ${
              activeViewMode === 'menu' ? 'text-orange-600 scale-102 font-black' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Smartphone className="w-4.5 h-4.5 text-current" />
            Mua Hàng
          </button>
          
          <button
            onClick={() => handleViewModeChange('history')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-black uppercase transition-all ${
              activeViewMode === 'history' ? 'text-orange-600 scale-102 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            <ClipboardList className="w-4.5 h-4.5 text-current" />
            Đơn Của Tôi
          </button>

          <button
            onClick={() => handleViewModeChange('contact')}
            className={`flex flex-col items-center gap-0.5 text-[9px] font-black uppercase transition-all ${
              activeViewMode === 'contact' ? 'text-orange-600 scale-102 font-black' : 'text-slate-400 hover:text-slate-600 font-bold'
            }`}
          >
            <Phone className="w-4.5 h-4.5 text-current" />
            Liên Hệ
          </button>
        </div>
      )}

    </div>
  );
}
