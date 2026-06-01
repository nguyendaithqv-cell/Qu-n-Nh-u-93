import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Clipboard, 
  Trash2, 
  Check, 
  Settings, 
  Utensils, 
  Layers, 
  Tag, 
  Database, 
  Plus, 
  Edit3, 
  DollarSign, 
  ShoppingBag, 
  Smartphone,
  CheckCircle,
  Clock,
  MapPin,
  FileText,
  Save,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Upload
} from 'lucide-react';
import { Product, Category, Order, OrderStatus, PaymentStatus, StoreConfig, Promotion, Customer } from '../types';

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  promotions: Promotion[];
  storeConfig: StoreConfig;
  orders: Order[];
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdatePromotions: (promotions: Promotion[]) => void;
  onUpdateStoreConfig: (config: StoreConfig) => void;
  onLogout?: () => void;
}

export default function AdminPanel({
  products,
  categories,
  promotions,
  storeConfig,
  orders,
  onUpdateOrders,
  onUpdateProducts,
  onUpdateCategories,
  onUpdatePromotions,
  onUpdateStoreConfig,
  onLogout
}: AdminPanelProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'promotions' | 'store' | 'customers'>('orders');
  const [productFilter, setProductFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sub States
  const [editingConfig, setEditingConfig] = useState<StoreConfig>({ ...storeConfig });

  useEffect(() => {
    setEditingConfig({ ...storeConfig });
  }, [storeConfig]);

  // Adding product modal/form states
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    categoryId: categories[0]?.id || 'pho',
    price: 30000,
    image: '🍜',
    description: '',
    isAvailable: true
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Adding category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({
    name: '',
    icon: '🥡'
  });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Adding promotion state
  const [isAddingPromotion, setIsAddingPromotion] = useState(false);
  const [newPromo, setNewPromo] = useState<Omit<Promotion, 'id'>>({
    code: '',
    type: 'percentage',
    value: 10,
    minOrderValue: 50000,
    isActive: true
  });
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Order Edits & Safe Delete States
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);

  type TimeRange = 'all' | 'today' | 'yesterday' | 'week_this' | 'week_last' | 'month_this' | 'month_last' | 'year_this' | 'year_last';
  
  // Unified master filters state
  const [masterFilters, setMasterFilters] = useState<{
    timeRange: TimeRange;
    status: OrderStatus | 'all';
    paymentStatus: PaymentStatus | 'all';
    search: string;
  }>({
    timeRange: 'all',
    status: 'all',
    paymentStatus: 'all',
    search: ''
  });
  
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
  const thisWeekStart = new Date(todayStart); thisWeekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);

  const isInRange = (date: Date) => {
    if (masterFilters.timeRange === 'all') return true;
    if (masterFilters.timeRange === 'today') return date >= todayStart;
    if (masterFilters.timeRange === 'yesterday') return date >= yesterdayStart && date < todayStart;
    if (masterFilters.timeRange === 'week_this') return date >= thisWeekStart;
    if (masterFilters.timeRange === 'week_last') return date >= lastWeekStart && date < thisWeekStart;
    if (masterFilters.timeRange === 'month_this') return date >= thisMonthStart;
    if (masterFilters.timeRange === 'month_last') return date >= lastMonthStart && date < thisMonthStart;
    if (masterFilters.timeRange === 'year_this') return date >= thisYearStart;
    if (masterFilters.timeRange === 'year_last') return date >= lastYearStart && date < thisYearStart;
    return true;
  };

  const getOrdersMatchingBaseFilters = (includeStatus: boolean, includePayment: boolean) => orders.filter(o => {
     const matchesStatus = !includeStatus || (masterFilters.status === 'all' || o.status === masterFilters.status);
     const matchesPayment = !includePayment || (masterFilters.paymentStatus === 'all' || (o.paymentStatus || 'unpaid') === masterFilters.paymentStatus);
     const matchesTime = isInRange(new Date(o.createdAt));
     const matchesSearch = !masterFilters.search || 
        o.billCode.toLowerCase().includes(masterFilters.search.toLowerCase()) || 
        o.customerName.toLowerCase().includes(masterFilters.search.toLowerCase()) || 
        o.customerPhone.includes(masterFilters.search);
     return matchesStatus && matchesPayment && matchesTime && matchesSearch;
  });

  const ordersForStatusCounts = getOrdersMatchingBaseFilters(false, true);
  const ordersForPaymentCounts = getOrdersMatchingBaseFilters(true, false);

  const calculateStats = () => {
    const isInRange = (date: Date) => {
      if (masterFilters.timeRange === 'all') return true;
      if (masterFilters.timeRange === 'today') return date >= todayStart;
      if (masterFilters.timeRange === 'yesterday') return date >= yesterdayStart && date < todayStart;
      if (masterFilters.timeRange === 'week_this') return date >= thisWeekStart;
      if (masterFilters.timeRange === 'week_last') return date >= lastWeekStart && date < thisWeekStart;
      if (masterFilters.timeRange === 'month_this') return date >= thisMonthStart;
      if (masterFilters.timeRange === 'month_last') return date >= lastMonthStart && date < thisMonthStart;
      if (masterFilters.timeRange === 'year_this') return date >= thisYearStart;
      if (masterFilters.timeRange === 'year_last') return date >= lastYearStart && date < thisYearStart;
      return true;
    };

    const filteredOrders = orders.filter(o => isInRange(new Date(o.createdAt)) && (masterFilters.paymentStatus === 'all' || o.paymentStatus === masterFilters.paymentStatus));
    
    const totalRev = filteredOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);
    const newOrdCount = filteredOrders.filter(o => o.status === 'pending').length;
    const preparingOrdCount = filteredOrders.filter(o => o.status === 'preparing').length;
    const activeCoupons = promotions.filter(p => p.isActive).length;

    return {
      totalRevenue: totalRev,
      newCount: newOrdCount,
      preparingCount: preparingOrdCount,
      activePromos: activeCoupons,
      totalFilteredOrdersCount: filteredOrders.length
    };
  };

  const stats = calculateStats();

  // Customers aggregation
  const customers: Customer[] = React.useMemo(() => {
    const custMap = orders.reduce((acc, order) => {
      const { customerPhone, customerName, totalAmount, paymentStatus, customerAddress } = order;
      if (!acc[customerPhone]) {
        acc[customerPhone] = {
          phone: customerPhone,
          firstName: customerName,
          totalOrders: 0,
          totalSpent: 0,
          address: customerAddress,
          debtOrders: 0,
          debtAmount: 0,
          notes: new Set([customerName])
        };
      }
      const cust = acc[customerPhone];
      cust.totalOrders++;
      cust.totalSpent += totalAmount;
      if (paymentStatus === 'debt') {
        cust.debtOrders++;
        cust.debtAmount += totalAmount;
      }
      cust.notes.add(customerName);
      return acc;
    }, {} as any);

    return Object.values(custMap).map((c: any) => ({
      ...c,
      notes: Array.from(c.notes)
    }));
  }, [orders]);

  // Order Operations
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'cancelled') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            setOrderToCancel(order);
            setCancellationReason('');
            return;
        }
    }
    const updated = orders.map(ord => {
      if (ord.id === orderId) {
        return { ...ord, status: newStatus };
      }
      return ord;
    });
    onUpdateOrders(updated);
  };

  const handleConfirmCancelOrder = () => {
      if (orderToCancel && cancellationReason) {
          const updated = orders.map(ord => {
              if (ord.id === orderToCancel.id) {
                  return { ...ord, status: 'cancelled', cancellationReason: cancellationReason };
              }
              return ord;
          });
          onUpdateOrders(updated);
          setOrderToCancel(null);
          setCancellationReason('');
      }
  };

  const handleDeleteOrderClick = (order: Order) => {
    setOrderToDelete(order);
  };

  const handleConfirmDeleteOrder = () => {
    if (orderToDelete) {
      const updated = orders.filter(o => o.id !== orderToDelete.id);
      onUpdateOrders(updated);
      setOrderToDelete(null);
    }
  };

  // Order Edit Helpers
  const handleAddProductToOrderDraft = (prod: Product) => {
    if (!editingOrder) return;
    const existing = editingOrder.items.find(item => item.productId === prod.id);
    let updatedItems;
    if (existing) {
      updatedItems = editingOrder.items.map(item => 
        item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      updatedItems = [...editingOrder.items, {
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        priceOnOrder: prod.price
      }];
    }
    const subTotal = updatedItems.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0);
    const totalAmount = Math.max(0, subTotal - (editingOrder.discountAmount || 0));
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      subTotal,
      totalAmount
    });
  };

  const handleUpdateItemQuantityInOrderDraft = (productId: string, newQty: number) => {
    if (!editingOrder) return;
    const updatedItems = editingOrder.items.map(item => 
      item.productId === productId ? { ...item, quantity: newQty } : item
    ).filter(item => item.quantity > 0);
    
    const subTotal = updatedItems.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0);
    const totalAmount = Math.max(0, subTotal - (editingOrder.discountAmount || 0));
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      subTotal,
      totalAmount
    });
  };

  const handleRemoveItemFromOrderDraft = (productId: string) => {
    if (!editingOrder) return;
    const updatedItems = editingOrder.items.filter(item => item.productId !== productId);
    const subTotal = updatedItems.reduce((sum, item) => sum + item.quantity * item.priceOnOrder, 0);
    const totalAmount = Math.max(0, subTotal - (editingOrder.discountAmount || 0));
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      subTotal,
      totalAmount
    });
  };

  const handleSaveOrderEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (editingOrder.items.length === 0) {
      alert("Đơn hàng không thể để trống món ăn! Vui lòng chọn món ăn cho khách.");
      return;
    }
    const updated = orders.map(o => o.id === editingOrder.id ? editingOrder : o);
    onUpdateOrders(updated);
    setEditingOrder(null);
  };

  // Product Operations
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;

    const prodToAdd: Product = {
      ...newProduct,
      id: `prod-${Date.now()}`
    };

    onUpdateProducts([...products, prodToAdd]);
    setIsAddingProduct(false);
    setNewProduct({
      name: '',
      categoryId: categories[0]?.id || 'pho',
      price: 30000,
      image: '🍜',
      description: '',
      isAvailable: true
    });
  };

  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    const updated = products.map(p => p.id === editingProduct.id ? editingProduct : p);
    onUpdateProducts(updated);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) setProductToDelete(prod);
  };

  const handleConfirmDeleteProduct = () => {
    if (productToDelete) {
      const updated = products.filter(p => p.id !== productToDelete.id);
      onUpdateProducts(updated);
      setProductToDelete(null);
    }
  };

  const toggleProductAvailability = (productId: string) => {
    const updated = products.map(p => {
      if (p.id === productId) {
        return { ...p, isAvailable: !p.isAvailable };
      }
      return p;
    });
    onUpdateProducts(updated);
  };

  // Category Operations
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    // Generate url friendly id
    const cleanId = newCategory.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const nextSortOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.sortOrder ?? 0)) + 1 
      : 0;

    const catToAdd: Category = {
      id: cleanId || `cat-${Date.now()}`,
      name: newCategory.name.trim(),
      icon: newCategory.icon || '🥡',
      sortOrder: nextSortOrder
    };

    onUpdateCategories([...categories, catToAdd]);
    setIsAddingCategory(false);
    setNewCategory({ name: '', icon: '🥡' });
  };

  const handleEditCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;

    const updated = categories.map(c => c.id === editingCategory.id ? editingCategory : c);
    onUpdateCategories(updated);
    setEditingCategory(null);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Re-assign sequential rank orders
    const finalized = updated.map((cat, idx) => ({
      ...cat,
      sortOrder: idx
    }));

    onUpdateCategories(finalized);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const associatedProds = products.filter(p => p.categoryId === categoryId);
    if (associatedProds.length > 0) {
      alert(`Không thể xóa danh mục này vì có ${associatedProds.length} sản phẩm đang trực thuộc. Vui lòng chuyển danh mục sản phẩm trước.`);
      return;
    }
    const cat = categories.find(c => c.id === categoryId);
    if (cat) setCategoryToDelete(cat);
  };

  const handleConfirmDeleteCategory = () => {
    if (categoryToDelete) {
      const updated = categories.filter(c => c.id !== categoryToDelete.id);
      onUpdateCategories(updated);
      setCategoryToDelete(null);
    }
  };

  // Promotion Operations
  const handleAddPromotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromo.code.trim()) return;

    const promoToAdd: Promotion = {
      ...newPromo,
      id: `promo-${Date.now()}`,
      code: newPromo.code.trim().toUpperCase()
    };

    onUpdatePromotions([...promotions, promoToAdd]);
    setIsAddingPromotion(false);
    setNewPromo({
      code: '',
      type: 'percentage',
      value: 10,
      minOrderValue: 50000,
      isActive: true
    });
  };

  const handleEditPromotionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPromo || !editingPromo.code.trim()) return;

    const promoWithUpperCode = {
      ...editingPromo,
      code: editingPromo.code.trim().toUpperCase()
    };

    const updated = promotions.map(p => p.id === editingPromo.id ? promoWithUpperCode : p);
    onUpdatePromotions(updated);
    setEditingPromo(null);
  };

  const handleDeletePromotion = (promoId: string) => {
    const promo = promotions.find(p => p.id === promoId);
    if (promo) setPromotionToDelete(promo);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const updatedCategories = [...categories];
      const updatedProducts = [...products];

      data.forEach((row) => {
        const catName = row['Danh mục'] || 'Chưa phân loại';
        let category = updatedCategories.find(c => c.name === catName);
        if (!category) {
          const cleanId = catName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
          category = {
            id: cleanId || `cat-${Date.now()}-${Math.random()}`,
            name: catName,
            icon: '🥡',
            sortOrder: updatedCategories.length
          };
          updatedCategories.push(category);
        }

        const prodName = row['Tên món'];
        let product = updatedProducts.find(p => p.name === prodName);
        if (product) {
          product.price = Number(row['Giá (VND)']);
          product.description = row['Mô tả'] || '';
          product.categoryId = category!.id;
          product.isAvailable = row['Trạng thái'] === 'Sẵn sàng';
          product.image = row['Emoji'] || '🍜';
        } else {
          updatedProducts.push({
            id: `prod-${Date.now()}-${Math.random()}`,
            name: prodName,
            price: Number(row['Giá (VND)']),
            description: row['Mô tả'] || '',
            categoryId: category!.id,
            isAvailable: row['Trạng thái'] === 'Sẵn sàng',
            image: row['Emoji'] || '🍜'
          });
        }
      });

      onUpdateCategories(updatedCategories);
      onUpdateProducts(updatedProducts);
      alert('Nhập thực đơn thành công!');
    };
    reader.readAsBinaryString(file);
  };

  const exportMenuToExcel = () => {
    const data = products.map(product => ({
      'Tên món': product.name,
      'Danh mục': categories.find(c => c.id === product.categoryId)?.name || product.categoryId,
      'Giá (VND)': product.price,
      'Mô tả': product.description,
      'Trạng thái': product.isAvailable ? 'Sẵn sàng' : 'Hết món',
      'Emoji': product.image
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ThucDon');
    XLSX.writeFile(workbook, 'ThucDon.xlsx');
  };

  const handleConfirmDeletePromotion = () => {
    if (promotionToDelete) {
      const updated = promotions.filter(p => p.id !== promotionToDelete.id);
      onUpdatePromotions(updated);
      setPromotionToDelete(null);
    }
  };

  // Store Configuration Save
  const handleSaveStoreConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStoreConfig(editingConfig);
    alert('Đã cập nhật thông tin cài đặt cửa hàng thành công!');
  };

  const getStatusColorClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'delivering':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusLabelText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Đang Chờ Duyệt';
      case 'preparing': return 'Đang Chuẩn Bị';
      case 'delivering': return 'Đang Giao Hàng';
      case 'completed': return 'Đã Giao Xong';
      case 'cancelled': return 'Đã Hủy';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 font-sans text-slate-800">
      
      {/* Top Welcome Title */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 uppercase">
            <Settings className="w-6 h-6 text-orange-600 animate-spin-slow" /> Quản Lý Hệ Thống KHAI VỊ
          </h1>
        </div>
        
        {/* Dynamic Sync state display & Admin Logout Lock option */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3.5 py-1" title="Đồng bộ thời gian thực với cơ sở dữ liệu Google Cloud Firestore">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đồng bộ: Google Firebase Cloud
          </div>
          
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[10px] font-black uppercase rounded-full tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              title="Khóa hệ thống quản lý chủ tiệm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
              Khóa Admin
            </button>
          )}
        </div>
      </div>

      {/* Numerical Stats row */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs uppercase font-black text-slate-500 tracking-wider">Thông số tổng quan</h3>
            <select
              value={masterFilters.timeRange}
              onChange={(e) => setMasterFilters(prev => ({ ...prev, timeRange: e.target.value as TimeRange }))}
              className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="week_this">Tuần này</option>
              <option value="week_last">Tuần trước</option>
              <option value="month_this">Tháng này</option>
              <option value="month_last">Tháng trước</option>
              <option value="year_this">Năm này</option>
              <option value="year_last">Năm trước</option>
            </select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* 1. Doanh thu */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doanh thu</p>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {stats.totalRevenue.toLocaleString('vi-VN')} đ
                </p>
              </div>
              <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md mt-3 w-max uppercase tracking-tight">
                Doanh thu thực tính
              </p>
            </div>

            {/* 2. Tổng đơn (Moved from 4th to 2nd) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng đơn</p>
                <p className="text-2xl font-black text-orange-600 mt-1 font-mono">{stats.totalFilteredOrdersCount} Đơn</p>
              </div>
              <p className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-md mt-3 w-max uppercase tracking-tight">
                Toàn hệ thống
              </p>
            </div>

            {/* 3. Mới chờ duyệt (Moved from 2nd to 3rd) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mới chờ duyệt</p>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.newCount} Đơn</p>
              </div>
              <p className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded-md mt-3 w-max uppercase tracking-tight">
                Cần duyệt ngay
              </p>
            </div>

            {/* 4. Đang chuẩn bị (Moved from 3rd to 4th) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đang chuẩn bị</p>
                <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.preparingCount} Đơn</p>
              </div>
              <p className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-md mt-3 w-max uppercase tracking-tight">
                Đang hâm nóng
              </p>
            </div>
          </div>
        </div>

      {/* Internal Tabs Navigator */}
      <div className="flex border-b border-slate-200 mb-6 bg-white rounded-xl p-1 shadow-xs font-semibold text-xs overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'orders' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clipboard className="w-4 h-4" /> Đơn Hàng ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'products' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Utensils className="w-4 h-4" /> Thực Đơn ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'categories' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" /> Danh Mục ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'customers' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="w-4 h-4" /> Khách hàng
        </button>              
        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'promotions' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Tag className="w-4 h-4" /> Khuyến Mãi ({promotions.length})
        </button>
        <button
          onClick={() => setActiveTab('store')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all shrink-0 uppercase tracking-wide font-black ${
            activeTab === 'store' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" /> Thông Tin Cửa Hàng
        </button>
      </div>

      {/* Dynamic Content Views */}

      {/* 1. ORDERS VIEW */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in text-xs">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50">
            <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Danh sách hóa đơn trực tiếp</h2>
            <div className="flex flex-wrap gap-2 text-[10px] w-full md:w-auto">
              <input
                type="text"
                placeholder="Tìm đơn hàng..."
                value={masterFilters.search}
                onChange={(e) => { setMasterFilters(prev => ({ ...prev, search: e.target.value })); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded-lg p-1 font-bold outline-none w-32"
              />
              <select value={masterFilters.status} onChange={(e) => { setMasterFilters(prev => ({ ...prev, status: e.target.value as any })); setCurrentPage(1); }} className="bg-white border border-slate-200 rounded-lg p-1 font-bold uppercase outline-none">
                <option value="all">Trạng thái: Tất cả ({ordersForStatusCounts.length})</option>
                <option value="pending">Chờ duyệt ({ordersForStatusCounts.filter(o => o.status === 'pending').length})</option>
                <option value="preparing">Chế biến ({ordersForStatusCounts.filter(o => o.status === 'preparing').length})</option>
                <option value="delivering">Đang giao ({ordersForStatusCounts.filter(o => o.status === 'delivering').length})</option>
                <option value="completed">Đã giao ({ordersForStatusCounts.filter(o => o.status === 'completed').length})</option>
                <option value="cancelled">Đã hủy ({ordersForStatusCounts.filter(o => o.status === 'cancelled').length})</option>
              </select>
              <select value={masterFilters.paymentStatus} onChange={(e) => { setMasterFilters(prev => ({ ...prev, paymentStatus: e.target.value as any })); setCurrentPage(1); }} className="bg-white border border-slate-200 rounded-lg p-1 font-bold uppercase outline-none">
                <option value="all">Thanh toán: Tất cả ({ordersForPaymentCounts.length})</option>
                <option value="unpaid">Chưa TT ({ordersForPaymentCounts.filter(o => (o.paymentStatus || 'unpaid') === 'unpaid').length})</option>
                <option value="paid">Đã TT ({ordersForPaymentCounts.filter(o => (o.paymentStatus || 'unpaid') === 'paid').length})</option>
                <option value="debt">Ghi nợ ({ordersForPaymentCounts.filter(o => (o.paymentStatus || 'unpaid') === 'debt').length})</option>
              </select>
            </div>
          </div>

          {(() => {
            const filteredOrders = orders
              .filter(o => 
                (masterFilters.status === 'all' || o.status === masterFilters.status) &&
                (masterFilters.paymentStatus === 'all' || (o.paymentStatus || 'unpaid') === masterFilters.paymentStatus) &&
                isInRange(new Date(o.createdAt)) &&
                (!masterFilters.search || 
                  o.billCode.toLowerCase().includes(masterFilters.search.toLowerCase()) || 
                  o.customerName.toLowerCase().includes(masterFilters.search.toLowerCase()) || 
                  o.customerPhone.includes(masterFilters.search))
              )
              .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
            
            const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
            const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

            if (filteredOrders.length === 0) {
              return (
                <div className="p-12 text-center text-slate-400">
                  <Clipboard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold">Không tìm thấy đơn hàng phù hợp</p>
                </div>
              );
            }

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-500 text-[9px] uppercase font-bold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Mã đơn / Đặt lúc</th>
                        <th className="px-4 py-3">Khách hàng / Liên hệ</th>
                        <th className="px-4 py-3">Món ăn tóm tắt</th>
                        <th className="px-4 py-3">Ghi chú</th>
                        <th className="text-right px-4 py-3">Thanh Toán</th>
                        <th className="px-4 py-3 text-center">Trạng Thái</th>
                        <th className="px-4 py-3 text-center">Tình Trạng</th>
                        <th className="px-4 py-3 text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-sans">
                      {paginatedOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/50">
                          
                          {/* Code/Date */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-bold text-orange-600 block text-xs font-mono tracking-wider">{order.billCode}</span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                               {new Date(order.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </td>
    
                          {/* Customer info */}
                          <td className="px-4 py-3.5 max-w-[200px] truncate">
                            <strong className="text-slate-900 block text-xs">{order.customerName}</strong>
                            <span className="text-[10px] text-slate-500 font-mono block">{order.customerPhone}</span>
                            <span className="text-[9px] text-slate-400 line-clamp-1 block mt-0.5 mt-1">📍 {order.customerAddress}</span>
                          </td>
    
                          {/* Detailed dishes text */}
                          <td className="px-4 py-3.5 italic text-slate-600 text-xs max-w-[250px] truncate">
                            {order.items.map(it => `${it.productName} (x${it.quantity})`).join(', ')}
                            {order.note && (
                              <span className="block text-[9px] text-orange-500 font-semibold truncate not-italic mt-1">
                                📝 Ghép Chú: "{order.note}"
                              </span>
                            )}
                          </td>
    
                          <td className="px-4 py-3.5 text-xs text-slate-500 max-w-[150px] truncate" title={order.adminNote || order.cancellationReason || '-'}>
                            {order.adminNote || order.cancellationReason || '-'}
                          </td>
    
                          {/* Value & Pay method */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 text-xs font-mono block">
                              {order.totalAmount.toLocaleString('vi-VN')}đ
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 block tracking-tighter mt-1">
                              {order.paymentMethod === 'cod' ? 'TIỀN MẶT COD' : 'CHUYỂN KHOẢN'}
                            </span>
                          </td>
    
                          {/* Status Selection Pill badge */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                              className={`p-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase border cursor-pointer font-sans outline-none ${getStatusColorClass(order.status)}`}
                            >
                              <option value="pending">Duyệt: Chờ</option>
                              <option value="preparing">Bếp: Chế Biến</option>
                              <option value="delivering">Trình: Đang Giao</option>
                              <option value="completed">Xong: Đã Giao</option>
                              <option value="cancelled">Hủy đơn</option>
                            </select>
                          </td>
    
                          {/* Payment Status */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <select
                              value={order.paymentStatus || 'unpaid'}
                              onChange={(e) => {
                                const updated = orders.map(ord => ord.id === order.id ? {...ord, paymentStatus: e.target.value as any} : ord);
                                onUpdateOrders(updated);
                              }}
                              className={`p-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase border cursor-pointer font-sans outline-none ${
                                 order.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                 order.paymentStatus === 'debt' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              <option value="unpaid">Chưa thanh toán</option>
                              <option value="paid">Đã thanh toán</option>
                              <option value="debt">Ghi nợ</option>
                            </select>
                          </td>
    
                          {/* Actions */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setEditingOrder({ ...order, items: order.items.map(it => ({ ...it })) })}
                                className="p-1 text-slate-400 hover:text-orange-600 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Chỉnh sửa món ăn và thông tin đơn hàng này"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrderClick(order)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                                title="Xóa bỏ đơn hàng khỏi dữ liệu"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
    
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center items-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-100 disabled:opacity-50">Trước</button>
                    <span className="text-[10px] font-bold text-slate-500">Trang {currentPage} / {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-100 disabled:opacity-50">Sau</button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* CUSTOM OVERLAYS FOR ORDERS */}

      {/* 1. Cancellation Reason Confirmation Dialog Overlay */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-600">Lý do hủy đơn hàng {orderToCancel.billCode}</h3>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500">Chọn lý do:</label>
              {['Hết món', 'Khách hủy', 'Sai thông tin', 'Khác'].map(reason => (
                <button
                    key={reason}
                    type="button"
                    onClick={() => setCancellationReason(reason)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold ${cancellationReason === reason ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-100'}`}
                >
                    {reason}
                </button>
              ))}
              <input
                type="text"
                placeholder="Nhập lý do khác..."
                value={cancellationReason === 'Khác' ? '' : cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
              />
            </div>

            <div className="flex gap-2.5 mt-3 justify-end">
              <button
                onClick={() => setOrderToCancel(null)}
                className="px-4 py-2.5 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmCancelOrder}
                disabled={!cancellationReason}
                className="px-4 py-2.5 text-[10px] font-extrabold uppercase bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all disabled:opacity-50"
              >
                Xác nhận Hủy Đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Safe Delete Confirmation Dialog Overlay */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-11 w-11 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Xác nhận xóa đơn hàng</h3>
                <p className="text-[10px] text-red-400 font-extrabold font-mono tracking-widest">{orderToDelete.billCode}</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng của khách hàng <strong>{orderToDelete.customerName}</strong> khỏi Google Cloud Firestore? Hành động này sẽ được đồng bộ ngay lập tức và không thể khôi phục.
            </p>

            <div className="flex gap-2.5 mt-3 justify-end">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all tracking-wider"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteOrder}
                className="px-5 py-2.5 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md cursor-pointer transition-all tracking-wider"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Beautiful Detailed Order Editing overlay panel */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden my-4 text-slate-800">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-orange-100 border border-orange-200 text-orange-600 rounded-xl">
                  <Edit3 className="w-5 h-5 text-orange-600" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">
                    Sửa chi tiết đơn hàng #{editingOrder.billCode}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold font-mono">
                    Thời gian tạo: {new Date(editingOrder.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L12 12M12 12l6-6M12 12l-6 6m6-6l6 6" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Scrollable grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/40 text-xs">
              
              {/* Left Side: General Info & Customer Fields */}
              <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-150 shadow-xs">
                <h4 className="font-extrabold text-[10px] text-orange-600 uppercase tracking-widest border-b border-slate-100 pb-2">
                  Thông tin người nhận hàng
                </h4>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên khách hàng*</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.customerName}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Số điện thoại liên hệ*</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.customerPhone}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerPhone: e.target.value })}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold font-mono outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Địa chỉ nhận hàng*</label>
                  <textarea
                    required
                    value={editingOrder.customerAddress}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerAddress: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ghi chú từ khách hàng</label>
                  <input
                    type="text"
                    value={editingOrder.note || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, note: e.target.value })}
                    placeholder="Ví dụ: giao gấp, không bỏ đá..."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ghi chú ADMIN</label>
                  <textarea
                    rows={2}
                    value={editingOrder.adminNote || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, adminNote: e.target.value })}
                    placeholder="Ghi chú nội bộ..."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Áp dụng Khuyến mãi</label>
                    <select
                      value={editingOrder.promoCodeUsed || ''}
                      onChange={(e) => {
                        const code = e.target.value;
                        const promo = promotions.find(p => p.code === code);
                        if (!promo) {
                          setEditingOrder({
                            ...editingOrder,
                            promoCodeUsed: undefined,
                            discountAmount: 0,
                            totalAmount: editingOrder.subTotal
                          });
                        } else {
                          const discount = promo.type === 'fixed' ? promo.value : (editingOrder.subTotal * promo.value) / 100;
                          setEditingOrder({
                            ...editingOrder,
                            promoCodeUsed: code,
                            discountAmount: discount,
                            totalAmount: Math.max(0, editingOrder.subTotal - discount)
                          });
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none cursor-pointer"
                    >
                      <option value="">Không áp dụng</option>
                      {promotions.filter(p => !p.startDate || p.startDate <= new Date().toISOString()).map(p => (
                        <option key={p.id} value={p.code}>{p.code} (-{p.value}{p.type === 'percentage' ? '%' : 'đ'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hình thức thanh toán</label>
                    <select
                      value={editingOrder.paymentMethod}
                      onChange={(e) => setEditingOrder({ ...editingOrder, paymentMethod: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none cursor-pointer"
                    >
                      <option value="cod">Tiền mặt COD</option>
                      <option value="banking">Chuyển khoản</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tiền giảm giá (giảm thêm)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingOrder.discountAmount}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setEditingOrder({
                          ...editingOrder,
                          discountAmount: val,
                          totalAmount: Math.max(0, (editingOrder.subTotal || 0) - val)
                        });
                      }}
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-2 text-xs font-semibold font-mono outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Right Side: Order Items Manager & Menu Quick Injector */}
              <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex flex-col h-[480px] overflow-hidden">
                <h4 className="font-extrabold text-[10px] text-orange-600 uppercase tracking-widest border-b border-slate-100 pb-2.5 flex justify-between items-center shrink-0">
                  <span>Món đã chọn ({editingOrder.items.length})</span>
                  <span className="font-mono text-orange-600 font-extrabold bg-orange-50 px-2 py-0.5 rounded-lg">
                    Tạm tính: {editingOrder.subTotal.toLocaleString('vi-VN')}đ
                  </span>
                </h4>

                {/* Selected Items Scroller List */}
                <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 my-1">
                  {editingOrder.items.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 flex flex-col items-center justify-center gap-1.5 h-full">
                      <ShoppingBag className="w-8 h-8 text-slate-250" />
                      <p className="font-bold">Đơn hàng trống trơn</p>
                      <p className="text-[10px]">Vui lòng nhấn nút ở danh mục phía dưới để thêm món.</p>
                    </div>
                  ) : (
                    editingOrder.items.map(item => (
                      <div key={item.productId} className="flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-100 rounded-xl transition-all">
                        <div className="flex flex-col gap-0.5 max-w-[50%]">
                          <span className="font-extrabold text-xs text-slate-800 truncate block">{item.productName}</span>
                          <span className="text-[9px] text-slate-400 font-bold font-mono">Đơn giá: {item.priceOnOrder.toLocaleString('vi-VN')}đ</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Decrease / Increase controllers */}
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantityInOrderDraft(item.productId, item.quantity - 1)}
                              className="w-6.5 h-6.5 flex items-center justify-center text-xs font-black text-slate-400 hover:text-orange-600 hover:bg-slate-50 rounded-l-lg transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-[10px] font-black font-mono text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQuantityInOrderDraft(item.productId, item.quantity + 1)}
                              className="w-6.5 h-6.5 flex items-center justify-center text-xs font-black text-slate-400 hover:text-orange-600 hover:bg-slate-50 rounded-r-lg transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          {/* Item total computed cost */}
                          <span className="text-[11px] font-black text-slate-850 font-mono min-w-[65px] text-right">
                            {(item.quantity * item.priceOnOrder).toLocaleString('vi-VN')}đ
                          </span>

                          {/* Remove button completely */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromOrderDraft(item.productId)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="Xóa hẳn món này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Addition lookup in menu */}
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-1.5 max-h-[160px] shrink-0 overflow-hidden">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                    ⚡ Thêm món nhanh từ thực đơn (nếu hết món cũ)
                  </span>
                  <div className="overflow-y-auto space-y-1.5 flex-1 pr-1 pb-1">
                    {products.map(prod => {
                      const orderItemInst = editingOrder.items.find(i => i.productId === prod.id);
                      return (
                        <div key={prod.id} className={`flex justify-between items-center bg-orange-50/20 hover:bg-orange-50 border border-orange-100/30 p-1.5 rounded-xl transition-all ${!prod.isAvailable ? 'opacity-50' : ''}`}>
                          <div className="flex items-center gap-2 max-w-[70%]">
                            {prod.image.startsWith('data:image') || prod.image.startsWith('http') ? (
                              <img src={prod.image} alt={prod.name} className="w-8 h-8 object-cover rounded-full" />
                            ) : (
                              <span className="text-sm shrink-0">{prod.image}</span>
                            )}
                            <div className="flex flex-col truncate">
                              <span className="font-extrabold text-[11px] text-slate-800 truncate block">{prod.name} {!prod.isAvailable && '(Hết)'}</span>
                              <span className="text-[9px] text-orange-600 font-extrabold font-mono">{prod.price.toLocaleString('vi-VN')}đ</span>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleAddProductToOrderDraft(prod)}
                            className="px-2.5 py-1 bg-white hover:bg-orange-600 text-orange-600 hover:text-white border border-orange-200 hover:border-orange-600 rounded-xl font-black text-[9px] uppercase transition-all shadow-xs cursor-pointer"
                          >
                            {orderItemInst ? `đặt (${orderItemInst.quantity})` : 'chọn +'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:justify-between items-center gap-3">
              <div className="flex items-center gap-4">
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tổng cộng thanh toán</span>
                  <span className="text-base font-black text-orange-600 font-mono">
                    {editingOrder.totalAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                {editingOrder.discountAmount > 0 && (
                  <div className="text-[10px] text-slate-400 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 font-semibold">
                    (Đã giảm: <span className="font-mono font-bold text-emerald-600">-{editingOrder.discountAmount.toLocaleString('vi-VN')}đ</span>)
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="w-1/2 sm:w-auto px-5 py-2.5 font-extrabold uppercase bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-[10px] tracking-widest transition-all cursor-pointer"
                >
                  Hủy chỉnh sửa
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrderEditSubmit}
                  className="w-1/2 sm:w-auto px-6 py-2.5 font-extrabold uppercase bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] tracking-widest transition-all shadow-md shadow-orange-100 block text-center cursor-pointer"
                >
                  Xác nhận lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Product Safe Delete Overlay */}
      {productToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-10 w-10 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              <h3 className="font-extrabold text-xs uppercase tracking-wider font-sans">Xóa món ăn?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa món <strong>{productToDelete.name}</strong> ({productToDelete.image}) khỏi thực đơn? Hành động này sẽ gỡ bỏ món ăn vĩnh viễn khỏi danh sách bán.
            </p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Category Safe Delete Overlay */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-10 w-10 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              <h3 className="font-extrabold text-xs uppercase tracking-wider font-sans">Xóa danh mục?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa danh mục <strong>{categoryToDelete.name}</strong> ({categoryToDelete.icon})? Hành động này không thể khôi phục.
            </p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Promotion Safe Delete Overlay */}
      {promotionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <span className="p-2.5 h-10 w-10 flex items-center justify-center bg-red-50 rounded-2xl text-red-600">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </span>
              <h3 className="font-extrabold text-xs uppercase tracking-wider font-sans">Xóa mã khuyến mãi?</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Bạn có chắc chắn muốn xóa mã khuyễn mãi <strong>{promotionToDelete.code}</strong>? Khách hàng sẽ không thể áp dụng mã này khi đặt hàng được nữa.
            </p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setPromotionToDelete(null)}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDeletePromotion}
                className="px-4 py-2 text-[10px] font-extrabold uppercase bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 2. PRODUCTS VIEW */}
      {activeTab === 'products' && (
        <div className="space-y-4 animate-fade-in text-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Quản lý món ăn</h2>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <select
                value={categoryIdFilter}
                onChange={(e) => setCategoryIdFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none w-32"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none w-32"
              >
                <option value="all">Tất cả TT</option>
                <option value="available">Còn món</option>
                <option value="unavailable">Hết món</option>
              </select>
              <input
                type="text"
                placeholder="Tìm kiếm món..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none w-48"
              />
              <button
                onClick={exportMenuToExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px]"
              >
                <FileText className="w-3.5 h-3.5" /> Xuất Excel
              </button>
              <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px] cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Nhập Excel
                <input type="file" onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" />
              </label>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingProduct(!isAddingProduct);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px]"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm Món Ăn Mới
              </button>
            </div>
          </div>

          {/* Add product expandable section */}
          {isAddingProduct && (
            <form onSubmit={handleAddProductSubmit} className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <h3 className="font-extrabold text-orange-600 uppercase text-[11px] tracking-wide flex items-center gap-1">
                <Utensils className="w-4 h-4" /> Thêm Món Vào Vườn Bếp
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên món ăn*</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: Phở Nạm Gầu Bò"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Danh mục*</label>
                  <select
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:bg-white outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá bán (VND)*</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Emoji / Ảnh</label>
                  {newProduct.image && (newProduct.image.startsWith('data:image') || newProduct.image.startsWith('http')) ? (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-200">
                      <img src={newProduct.image} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setNewProduct({...newProduct, image: '🍜'})}
                        className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 text-slate-500 hover:text-red-500"
                        title="Xóa ảnh"
                      >
                        <span className="text-[10px]">✕</span>
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="ví dụ: 🍜"
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-center focus:bg-white outline-none"
                    />
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mô tả tóm tắt món*</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyên liệu chín tái..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
                  />
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tải ảnh lên</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const img = new Image();
                          img.src = event.target?.result as string;
                          await img.decode();
                          const canvas = document.createElement('canvas');
                          const MAX_SIZE = 200;
                          let { width, height } = img;
                          if (width > height) {
                            if (width > MAX_SIZE) { height = height * (MAX_SIZE / width); width = MAX_SIZE; }
                          } else {
                            if (height > MAX_SIZE) { width = width * (MAX_SIZE / height); height = MAX_SIZE; }
                          }
                          canvas.width = width;
                          canvas.height = height;
                          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                          setNewProduct({ ...newProduct, image: canvas.toDataURL('image/jpeg', 0.5) });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[9px] p-2 border border-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="px-3.5 py-1.5 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-[10px] uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-orange-600 font-bold rounded-lg text-white hover:bg-orange-700 text-[10px] uppercase"
                >
                  Nâng Đơn Thực Đơn
                </button>
              </div>
            </form>
          )}

          {/* Edit product modal/form section */}
          {editingProduct && (
            <form onSubmit={handleEditProductSubmit} className="bg-white p-4 border-2 border-orange-200 rounded-2xl shadow-sm space-y-3 animate-fade-in">
              <h3 className="font-extrabold text-orange-600 uppercase text-[11px] tracking-wide flex items-center gap-1">
                <Edit3 className="w-4 h-4 text-orange-600" /> Sửa món: {editingProduct.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên món ăn*</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Danh mục*</label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:bg-white outline-none"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá bán (VND)*</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Emoji / Ảnh</label>
                  {editingProduct.image && (editingProduct.image.startsWith('data:image') || editingProduct.image.startsWith('http')) ? (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-200">
                      <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setEditingProduct({...editingProduct, image: '🍜'})}
                        className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 text-slate-500 hover:text-red-500"
                        title="Xóa ảnh"
                      >
                        <span className="text-[10px]">✕</span>
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      value={editingProduct.image}
                      onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-center focus:bg-white outline-none"
                    />
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mô tả món ăn*</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
                  />
                </div>
                
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tải ảnh lên</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const img = new Image();
                          img.src = event.target?.result as string;
                          await img.decode();
                          const canvas = document.createElement('canvas');
                          const MAX_SIZE = 200;
                          let { width, height } = img;
                          if (width > height) {
                            if (width > MAX_SIZE) { height = height * (MAX_SIZE / width); width = MAX_SIZE; }
                          } else {
                            if (height > MAX_SIZE) { width = width * (MAX_SIZE / height); height = MAX_SIZE; }
                          }
                          canvas.width = width;
                          canvas.height = height;
                          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
                          setEditingProduct({ ...editingProduct, image: canvas.toDataURL('image/jpeg', 0.5) });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[9px] p-2 border border-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3.5 py-1.5 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-[10px] uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-orange-600 font-bold rounded-lg text-white hover:bg-orange-700 text-[10px] uppercase"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}

          {/* Grid list of dishes in catalog */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products
              .filter(p => {
                const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesFilter = productFilter === 'all' || (productFilter === 'available' ? p.isAvailable : !p.isAvailable);
                const matchesCategory = categoryIdFilter === 'all' || p.categoryId === categoryIdFilter;
                return matchesSearch && matchesFilter && matchesCategory;
              })
              .sort((a,b) => a.name.localeCompare(b.name))
              .map(prod => {
                const catObj = categories.find(c => c.id === prod.categoryId);
                return (
                  <div 
                    key={prod.id}
                    className={`bg-white p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      prod.isAvailable ? 'border-slate-200 shadow-xs' : 'border-slate-200/50 opacity-100 bg-slate-50 shadow-none'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        {prod.image.startsWith('data:image') || prod.image.startsWith('http') ? (
                          <img src={prod.image} alt={prod.name} className="w-12 h-12 object-cover rounded-full" />
                        ) : (
                          <span className="text-3xl select-none">{prod.image}</span>
                        )}
                        <div className="flex gap-1.5 items-center">
                          <button
                            onClick={() => toggleProductAvailability(prod.id)}
                            className={`p-1.5 border rounded-lg text-[9px] uppercase font-bold tracking-tighter ${
                              prod.isAvailable 
                                ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' 
                                : 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                            }`}
                            title="Click để thay đổi khả năng phục vụ"
                          >
                            {prod.isAvailable ? 'Còn món' : 'Hết món'}
                          </button>
                        </div>
                      </div>

                      <h3 className={`font-black text-sm mb-0.5 ${prod.isAvailable ? 'text-slate-800' : 'text-slate-500'}`}>{prod.name} {!prod.isAvailable && '(Hết món)'}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        📁 {catObj?.name || 'Chưa nhóm'}
                      </p>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-3">{prod.description}</p>
                    </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center mt-3">
                    <span className="font-extrabold text-orange-600 text-sm font-mono">{prod.price.toLocaleString('vi-VN')} đ</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setIsAddingProduct(false);
                        }}
                        className="p-1.5 bg-slate-100 text-slate-800 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 rounded-lg"
                        title="Chỉnh sửa chi tiết"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-lg text-slate-400"
                        title="Xóa món"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* 3. CATEGORIES VIEW */}
      {activeTab === 'categories' && (
        <div className="space-y-4 animate-fade-in text-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50 p-4 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Quản lý danh mục</h2>
            <button
              onClick={() => {
                setEditingCategory(null);
                setIsAddingCategory(!isAddingCategory);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px]"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Danh Mục Mới
            </button>
          </div>

          {/* Add Category Section */}
          {isAddingCategory && (
            <form onSubmit={handleAddCategorySubmit} className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <h3 className="font-extrabold text-orange-600 uppercase text-[11px] tracking-wide flex items-center gap-1">
                <Layers className="w-4 h-4" /> Thêm Danh mục mới
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên danh mục*</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: Món Lẩu Bò, Tráng Miệng Tây"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Emoji Biểu Tượng (Icon)*</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: 🥗, 🍲, 🥤"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-center focus:bg-white outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(false)}
                  className="px-3.5 py-1.5 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-[10px] uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-orange-600 font-bold rounded-lg text-white hover:bg-orange-700 text-[10px] uppercase"
                >
                  Tạo Danh Mục
                </button>
              </div>
            </form>
          )}

          {/* Edit Category Section */}
          {editingCategory && (
            <form onSubmit={handleEditCategorySubmit} className="bg-white p-4 border-2 border-orange-200 rounded-2xl shadow-sm space-y-3">
              <h3 className="font-extrabold text-orange-600 uppercase text-[11px] tracking-wide flex items-center gap-1">
                <Edit3 className="w-4 h-4" /> Sửa Danh Mục: {editingCategory.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên danh mục*</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Emoji Icon*</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.icon}
                    onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-center focus:bg-white outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3.5 py-1.5 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-[10px] uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-orange-600 font-bold rounded-lg text-white hover:bg-orange-700 text-[10px] uppercase"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}

          {/* Categories Grid displays with counters of associated products */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, idx) => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              return (
                <div key={cat.id} className="bg-white p-4 border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl select-none bg-orange-50 p-2 rounded-xl shrink-0">{cat.icon}</span>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">{cat.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{count} sản phẩm trực thuộc</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Move up / down controls */}
                    <div className="flex flex-col gap-0.5 mr-0.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveCategory(idx, 'up')}
                        className={`p-1.5 rounded-md border text-slate-500 transition-all cursor-pointer ${
                          idx === 0 
                            ? 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-300' 
                            : 'bg-white hover:bg-orange-50 hover:text-orange-600 border-slate-200 hover:border-orange-100'
                        }`}
                        title="Di chuyển lên"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveCategory(idx, 'down')}
                        className={`p-1.5 rounded-md border text-slate-500 transition-all cursor-pointer ${
                          idx === categories.length - 1 
                            ? 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-300' 
                            : 'bg-white hover:bg-orange-50 hover:text-orange-600 border-slate-200 hover:border-orange-100'
                        }`}
                        title="Di chuyển xuống"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => setEditingCategory(cat)}
                      className="p-1 px-2 border border-slate-200 hover:border-orange-105 hover:bg-orange-50 hover:text-orange-600 text-slate-700 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Sửa
                    </button>
                    
                    {/* Delete block */}
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1 px-2 border border-slate-200 hover:border-red-105 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}


      {/* 4. PROMOTIONS VIEW */}
      {activeTab === 'promotions' && (
        <div className="space-y-4 animate-fade-in text-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Quản lý mã giảm giá</h2>
            <button
              onClick={() => {
                setEditingPromo(null);
                setIsAddingPromotion(!isAddingPromotion);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 uppercase tracking-wide text-[10px]"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo Tặng Mã Ưu Đãi
            </button>
          </div>

          {/* Add Promotion layout */}
          {isAddingPromotion && (
            <form onSubmit={handleAddPromotionSubmit} className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <h3 className="font-extrabold text-orange-600 uppercase text-[11px] tracking-wide flex items-center gap-1">
                <Tag className="w-4 h-4" /> Thêm Mã Khuyến Mãi Mới
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mã Code (viết liền, hoa)*</label>
                  <input
                    type="text"
                    required
                    placeholder="ví dụ: GIAM20K, FREESHIP"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Loại chiết khấu*</label>
                  <select
                    value={newPromo.type}
                    onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:bg-white outline-none"
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed">Gia giảm cố định (đ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá trị chiết khấu*</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newPromo.value}
                    onChange={(e) => setNewPromo({ ...newPromo, value: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Yêu cầu Đơn hàng tối thiểu*</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newPromo.minOrderValue}
                    onChange={(e) => setNewPromo({ ...newPromo, minOrderValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 flex-wrap pb-3">
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border p-2 rounded-xl text-[10px] font-bold text-slate-600">
                  <input type="checkbox" checked={newPromo.isActive} onChange={(e) => setNewPromo({...newPromo, isActive: e.target.checked})} /> Kích hoạt
                </label>
                <input type="number" placeholder="Giới hạn số lần (0 = ko giới hạn)" value={newPromo.maxUsageCount || 0} onChange={(e) => setNewPromo({...newPromo, maxUsageCount: Number(e.target.value)})} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold w-full md:w-auto" />
                <input type="datetime-local" value={newPromo.startDate || ''} onChange={(e) => setNewPromo({...newPromo, startDate: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-auto" />
                <input type="datetime-local" value={newPromo.endDate || ''} onChange={(e) => setNewPromo({...newPromo, endDate: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-auto" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingPromotion(false)}
                  className="px-3.5 py-1.5 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-[10px] uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-orange-600 font-bold rounded-lg text-white hover:bg-orange-700 text-[10px] uppercase"
                >
                  Tạo Mã
                </button>
              </div>
            </form>
          )}

          {/* Edit Promotion Layout */}
          {editingPromo && (
            <form onSubmit={handleEditPromotionSubmit} className="bg-white p-4 border-2 border-orange-200 rounded-2xl shadow-sm space-y-3 animate-fade-in">
              <h3 className="font-extrabold text-orange-600 uppercase text-[11px] tracking-wide flex items-center gap-1">
                <Edit3 className="w-4 h-4 text-orange-600" /> Sửa khuyến mãi: {editingPromo.code}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mã Code (viết liền, hoa)*</label>
                  <input
                    type="text"
                    required
                    value={editingPromo.code}
                    onChange={(e) => setEditingPromo({ ...editingPromo, code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Loại chiết khấu*</label>
                  <select
                    value={editingPromo.type}
                    onChange={(e) => setEditingPromo({ ...editingPromo, type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:bg-white outline-none"
                  >
                    <option value="percentage">Phần trăm (%)</option>
                    <option value="fixed">Gia giảm cố định (đ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Giá trị chiết khấu*</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingPromo.value}
                    onChange={(e) => setEditingPromo({ ...editingPromo, value: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Yêu cầu Đơn hàng tối thiểu*</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingPromo.minOrderValue}
                    onChange={(e) => setEditingPromo({ ...editingPromo, minOrderValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 flex-wrap pb-3">
                <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border p-2 rounded-xl text-[10px] font-bold text-slate-600">
                  <input type="checkbox" checked={editingPromo.isActive} onChange={(e) => setEditingPromo({...editingPromo, isActive: e.target.checked})} /> Kích hoạt
                </label>
                <input type="number" placeholder="Giới hạn số lần (0 = ko giới hạn)" value={editingPromo.maxUsageCount || 0} onChange={(e) => setEditingPromo({...editingPromo, maxUsageCount: Number(e.target.value)})} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold w-full md:w-auto" />
                <input type="datetime-local" value={editingPromo.startDate || ''} onChange={(e) => setEditingPromo({...editingPromo, startDate: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-auto" />
                <input type="datetime-local" value={editingPromo.endDate || ''} onChange={(e) => setEditingPromo({...editingPromo, endDate: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs w-full md:w-auto" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPromo(null)}
                  className="px-3.5 py-1.5 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-[10px] uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-orange-600 font-bold rounded-lg text-white hover:bg-orange-700 text-[10px] uppercase"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}

          {/* Table list of codes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã giảm giá ưu đãi</th>
                  <th className="px-4 py-3">Kiểu chiết khấu</th>
                  <th className="px-4 py-3 text-right">Mức gia giảm</th>
                  <th className="px-4 py-3 text-right">Đơn tối thiểu</th>
                  <th className="px-4 py-3 text-center">Đã dùng (lần)</th>
                  <th className="px-4 py-3 text-right">Tổng KM (đ)</th>
                  <th className="px-4 py-3 text-center">Trạng thái phát</th>
                  <th className="px-4 py-3 text-center">Xóa bỏ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {promotions.map(promo => {
                   const usedOrders = orders.filter(o => o.promoCodeUsed === promo.code && (o.paymentStatus === 'paid' || o.paymentStatus === 'debt'));
                   const usageCount = usedOrders.length;
                   const totalSaved = usedOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
                   return (
                  <tr key={promo.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-orange-600 text-xs">
                      {promo.code}
                    </td>
                    <td className="px-4 py-3 italic text-xs">
                      {promo.type === 'percentage' ? 'Phần trăm (%)' : 'Giảm tiền mặt trực tiếp'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 text-xs">
                      {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value.toLocaleString('vi-VN')} đ`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">
                      {promo.minOrderValue.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-mono font-bold text-indigo-600">
                      {usageCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 text-xs">
                      {totalSaved.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          const updated = promotions.map(p => p.id === promo.id ? { ...p, isActive: !p.isActive } : p);
                          onUpdatePromotions(updated);
                        }}
                        className={`p-1 px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                          promo.isActive 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        {promo.isActive ? 'Đang chạy' : 'Hết hạn'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setEditingPromo(promo);
                          setIsAddingPromotion(false);
                        }}
                        className="p-1 px-2 border hover:bg-orange-50 hover:text-orange-600 rounded-lg text-slate-700 text-[10px] font-bold uppercase transition-all mr-1"
                      >
                         Sửa
                      </button>
                      <button
                        onClick={() => handleDeletePromotion(promo.id)}
                        className="p-1 px-2 border hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-700 text-[10px] font-bold uppercase transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                   )
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 6. CUSTOMER VIEW */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in text-xs">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Danh sách khách hàng</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-500 text-[9px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">SDT / Tên</th>
                  <th className="px-4 py-3">Địa chỉ</th>
                  <th className="px-4 py-3 text-right">Tổng Đơn</th>
                  <th className="px-4 py-3 text-right">Đã Mua</th>
                  <th className="px-4 py-3 text-right">Công Nợ</th>
                  <th className="px-4 py-3">Ghi Chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-sans">
                {customers.map(cust => (
                  <tr key={cust.phone} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-orange-600 block text-xs font-mono tracking-wider">{cust.phone}</span>
                      <span className="text-[10px] block">{cust.firstName}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[10px] text-slate-500">{cust.address}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">{cust.totalOrders}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">{cust.totalSpent.toLocaleString('vi-VN')}đ</td>
                    <td className="px-4 py-3.5 text-right text-rose-600 font-bold font-mono">
                      {cust.debtOrders > 0 ? `${cust.debtOrders} đơn / ${cust.debtAmount.toLocaleString('vi-VN')}đ` : '0đ'}
                    </td>
                    <td className="px-4 py-3.5 text-[10px] text-slate-500 italic">{cust.notes.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* 5. STORE INFO CONFIGURATION */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveStoreConfig} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fade-in text-xs">
          
          <h2 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-2 mb-4 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-orange-600" /> Cấu hình thông tin cơ sở mâm súp
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tên cửa hiệu*</label>
              <input
                type="text"
                required
                value={editingConfig.name}
                onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Giờ mở cửa phục vụ hàng ngày*</label>
              <input
                type="text"
                required
                value={editingConfig.openHours}
                onChange={(e) => setEditingConfig({ ...editingConfig, openHours: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Điện thoại hotline*</label>
              <input
                type="text"
                required
                value={editingConfig.phone}
                onChange={(e) => setEditingConfig({ ...editingConfig, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">SĐT nhận Zalo đặt hàng*</label>
              <input
                type="text"
                required
                value={editingConfig.zaloHotline}
                onChange={(e) => setEditingConfig({ ...editingConfig, zaloHotline: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none font-mono"
              />
              <p className="text-[10px] text-orange-500 italic font-semibold mt-1">Đơn hàng sau khi đặt xong sẽ tự động mời quét & chuyển hướng chat trực tiếp tới SĐT Zalo này.</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Địa chỉ quán chính*</label>
            <input
              type="text"
              required
              value={editingConfig.address}
              onChange={(e) => setEditingConfig({ ...editingConfig, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none"
            />
          </div>

          <h3 className="font-extrabold text-slate-800 tracking-tight uppercase text-[11px] pt-3 border-t border-slate-100 flex items-center gap-1.5">
            💳 Tài khoản ngân hàng số thụ hưởng (Dùng hiển thị cho khách hàng thanh toán)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tên Ngân hàng*</label>
              <input
                type="text"
                required
                value={editingConfig.bankName}
                onChange={(e) => setEditingConfig({ ...editingConfig, bankName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Số tài khoản*</label>
              <input
                type="text"
                required
                value={editingConfig.bankAccount}
                onChange={(e) => setEditingConfig({ ...editingConfig, bankAccount: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Tên chủ tài khoản*</label>
              <input
                type="text"
                required
                value={editingConfig.bankAccountName}
                onChange={(e) => setEditingConfig({ ...editingConfig, bankAccountName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none uppercase"
              />
            </div>
          </div>

          {/* Custom QR Code Upload Section */}
          <div className="bg-slate-50 p-4 border border-slate-200 border-dashed rounded-2xl space-y-3.5">
            <h4 className="font-extrabold text-[11px] text-slate-700 uppercase tracking-wider flex items-center gap-1">
              📷 Mã QR Thanh Toán Tiệm Tự Tải Lên (Tùy Chọn)
            </h4>
            <p className="text-[10px] text-slate-400 font-medium font-sans leading-normal">
              Nếu bạn muốn dùng ảnh QR riêng của tiệm (mã QR có ảnh đại diện, logo ngộ nghĩnh, hoặc mã cứng MoMo, VNPay, Zalopay...), hãy bấm để tải lên hoặc dán link ảnh. Nếu trống, hệ thống sẽ tự động tạo QR Ngân Hàng chuyên nghiệp (VietQR) theo config phía trên.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Left Column: Direct File Selector or Image Url Text field */}
              <div className="space-y-3">
                {/* 1. File Upload Dropzone / Button */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase">Chọn ảnh QR từ máy</span>
                  <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 bg-white flex flex-col items-center justify-center text-center hover:border-orange-500 transition-colors cursor-pointer group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditingConfig(prev => ({
                              ...prev,
                              customQrCodeUrl: reader.result as string
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    />
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-orange-600 transition-colors mb-2" />
                    <span className="text-[10px] font-black text-slate-700 capitalize">Bấm chọn tệp ảnh QR</span>
                    <span className="text-[9px] text-slate-400 mt-1">Hỗ trợ định dạng hình ảnh PNG, JPG, WEBP</span>
                  </div>
                </div>

                {/* 2. Manual URL Text field fallback */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Hoặc dán link ảnh QR</label>
                  <input
                    type="text"
                    placeholder="https://example.com/my-qr-code.png"
                    value={editingConfig.customQrCodeUrl || ''}
                    onChange={(e) => setEditingConfig({ ...editingConfig, customQrCodeUrl: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800 outline-none text-[11px]"
                  />
                </div>
              </div>

              {/* Right Column: Dynamic Preview with current selected custom image */}
              <div className="flex flex-col items-center justify-center bg-white p-3.5 border border-slate-200 rounded-2xl h-full min-h-[160px]">
                {editingConfig.customQrCodeUrl ? (
                  <div className="flex flex-col items-center justify-center text-center w-full space-y-2">
                    <div className="relative w-28 h-28 border border-slate-100 rounded-xl overflow-hidden shadow-xs flex items-center justify-center bg-slate-50">
                      <img 
                        src={editingConfig.customQrCodeUrl} 
                        alt="Custom QR Preview" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[8.5px] font-bold text-emerald-600 uppercase tracking-wider">✓ Đang dùng QR tự tải lên</span>
                    <button 
                      type="button"
                      onClick={() => setEditingConfig({ ...editingConfig, customQrCodeUrl: "" })}
                      className="text-[9px] font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Xóa ảnh QR tải lên
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <span className="text-3xl">🤖</span>
                    <h5 className="font-extrabold text-[10px] text-slate-700 uppercase tracking-wide mt-2">Dùng VietQR Tự Động</h5>
                    <p className="text-[9px] text-slate-400 mt-1 leading-normal">
                      Chưa tải lên ảnh QR. Hệ thống sẽ tự tạo mã quét thông minh VietQR chuẩn xác với Số Tài Khoản đã điền.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-all shadow-md shadow-orange-100 flex items-center gap-1.5 uppercase text-[10px] tracking-wide"
            >
              <Save className="w-4 h-4" /> Lưu thông tin thiết lập
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
