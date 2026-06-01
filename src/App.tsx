import React, { useState, useEffect } from 'react';
import { 
  getInitialData, 
  saveToLocalStorage 
} from './data';
import { 
  Product, 
  Category, 
  Order, 
  StoreConfig, 
  Promotion 
} from './types';
import MobileSimulator from './components/MobileSimulator';
import AdminPanel from './components/AdminPanel';
import AdminLockScreen from './components/AdminLockScreen';
import { 
  Sparkles, 
  Smartphone, 
  Sliders, 
  Settings, 
  Database, 
  ChevronRight,
  Info,
  ClipboardList,
  Phone
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  db, 
  handleFirestoreError, 
  OperationType,
  cleanForFirestore
} from './firebase';

export default function App() {
  // Load initial local dataset as high-performance local cache
  const initialData = getInitialData();

  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [promotions, setPromotions] = useState<Promotion[]>(initialData.promotions);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(initialData.storeConfig);
  const [orders, setOrders] = useState<Order[]>(initialData.orders);
  
  // Real-time synchronization loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Layout states
  // On desktop views, we show the split workspace (Admin central, Simulator right)
  // On mobile devices, we switch view mode: 'client' (the customer ordering app), 'history' (their personal orders history), or 'admin' (the dashboard)
  const [mobileMode, setMobileMode] = useState<'client' | 'history' | 'contact' | 'admin'>('client');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  // Monitor screen size to supply genuine mobile adaptation
  useEffect(() => {
    const checkViewport = () => {
      setIsMobileViewport(window.innerWidth < 1024);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Sync to localStorage on every state modification as a fast-load local mirror
  useEffect(() => {
    saveToLocalStorage('bv_categories_v2', categories);
  }, [categories]);

  useEffect(() => {
    saveToLocalStorage('bv_products_v2', products);
  }, [products]);

  useEffect(() => {
    saveToLocalStorage('bv_promotions_v2', promotions);
  }, [promotions]);

  useEffect(() => {
    saveToLocalStorage('bv_store_config_v2', storeConfig);
  }, [storeConfig]);

  useEffect(() => {
    saveToLocalStorage('bv_orders_v2', orders);
  }, [orders]);

  // Hook real-time Firebase listeners upon mounting
  useEffect(() => {
    let resolvedCount = 0;
    const checkLogged = () => {
      resolvedCount++;
      if (resolvedCount >= 5) {
        setIsLoading(false);
      }
    };

    // 1. Synchronize Categories (autofill with defaults if DB is fresh and unpopulated)
    const unsubCategories = onSnapshot(collection(db, 'categories'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const init = getInitialData();
          for (const cat of init.categories) {
            await setDoc(doc(db, 'categories', cat.id), cat);
          }
        } catch (e) {
          console.error("Failed to seed default categories", e);
        }
      } else {
        const list: Category[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Category);
        });
        // Sắp xếp theo sortOrder tăng dần, nếu bằng nhau thì theo tên Tiếng Việt
        list.sort((a, b) => {
          const orderA = a.sortOrder !== undefined ? a.sortOrder : 999;
          const orderB = b.sortOrder !== undefined ? b.sortOrder : 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name, 'vi');
        });
        setCategories(list);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'categories');
    });

    // 2. Synchronize Products
    const unsubProducts = onSnapshot(collection(db, 'products'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const init = getInitialData();
          for (const prod of init.products) {
            await setDoc(doc(db, 'products', prod.id), prod);
          }
        } catch (e) {
          console.error("Failed to seed default products", e);
        }
      } else {
        const list: Product[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Product);
        });
        setProducts(list);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    // 3. Synchronize Promotions
    const unsubPromotions = onSnapshot(collection(db, 'promotions'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const init = getInitialData();
          for (const promo of init.promotions) {
            await setDoc(doc(db, 'promotions', promo.id), promo);
          }
        } catch (e) {
          console.error("Failed to seed default promotions", e);
        }
      } else {
        const list: Promotion[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Promotion);
        });
        setPromotions(list);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'promotions');
    });

    // 4. Synchronize Store configuration
    const unsubStoreConfig = onSnapshot(doc(db, 'storeConfig', 'global'), async (snapshot) => {
      if (!snapshot.exists()) {
        try {
          const init = getInitialData();
          await setDoc(doc(db, 'storeConfig', 'global'), init.storeConfig);
        } catch (e) {
          console.error("Failed to seed store config", e);
        }
      } else {
        setStoreConfig(snapshot.data() as StoreConfig);
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'storeConfig/global');
    });

    // 5. Synchronize Customer Orders list
    const unsubOrders = onSnapshot(collection(db, 'orders'), async (snapshot) => {
      if (snapshot.empty) {
        try {
          const init = getInitialData();
          for (const order of init.orders) {
            await setDoc(doc(db, 'orders', order.id), order);
          }
        } catch (e) {
          console.error("Failed to seed default orders", e);
        }
      } else {
        const list: Order[] = [];
        let hasNewAddedOrder = false;
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data() as Order;
            if (data.status === 'pending') {
              hasNewAddedOrder = true;
            }
          }
        });

        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Order);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setOrders(prev => {
          if (prev.length > 0 && hasNewAddedOrder) {
            const audioEnabled = localStorage.getItem('system-audio-enabled') !== 'false';
            if (audioEnabled) {
              try {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContext) {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                  osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
                  gain.gain.setValueAtTime(0.15, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.5);
                }
              } catch (e) {
                console.warn(e);
              }
            }
          }
          return list;
        });
      }
      checkLogged();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => {
      unsubCategories();
      unsubProducts();
      unsubPromotions();
      unsubStoreConfig();
      unsubOrders();
    };
  }, []);

  // Unified dynamic sync helper for modifying collections based on arrays of data
  const syncWithFirestore = async <T extends { id: string }>(
    collectionName: string,
    newArray: T[],
    currentArray: T[]
  ) => {
    try {
      const newKeys = new Set(newArray.map(x => x.id));
      
      // Update additions and modifications
      for (const item of newArray) {
        const currentItem = currentArray.find(x => x.id === item.id);
        if (!currentItem || JSON.stringify(currentItem) !== JSON.stringify(item)) {
          // Wrapped item with cleanForFirestore to omit undefined values
          await setDoc(doc(db, collectionName, item.id), cleanForFirestore(item));
        }
      }

      // Handle deletions smoothly in Firestore
      for (const item of currentArray) {
        if (!newKeys.has(item.id)) {
          await deleteDoc(doc(db, collectionName, item.id));
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, collectionName);
    }
  };

  // Actions triggerable by Mobile app and Admin app, synced immediately to Firebase
  const handleAddOrder = async (newOrder: Order) => {
    // 1. Local optimistic update to show instantly in local UI tabs
    setOrders(prev => {
      if (prev.some(o => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });

    try {
      // 2. Perform live setDoc in Firestore - wrap in cleanForFirestore
      await setDoc(doc(db, 'orders', newOrder.id), cleanForFirestore(newOrder));
    } catch (e) {
      // Revert optimistic state back on write failure
      setOrders(prev => prev.filter(o => o.id !== newOrder.id));
      handleFirestoreError(e, OperationType.WRITE, `orders/${newOrder.id}`);
    }
  };

  const handleUpdateOrders = async (updatedOrders: Order[]) => {
    await syncWithFirestore('orders', updatedOrders, orders);
  };

  const handleUpdateProducts = async (updatedProducts: Product[]) => {
    await syncWithFirestore('products', updatedProducts, products);
  };

  const handleUpdateCategories = async (updatedCategories: Category[]) => {
    await syncWithFirestore('categories', updatedCategories, categories);
  };

  const handleUpdatePromotions = async (updatedPromotions: Promotion[]) => {
    await syncWithFirestore('promotions', updatedPromotions, promotions);
  };

  const handleUpdateStoreConfig = async (updatedConfig: StoreConfig) => {
    try {
      await setDoc(doc(db, 'storeConfig', 'global'), cleanForFirestore(updatedConfig));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'storeConfig/global');
    }
  };

  // Real-time Cloud Synced Database Loading Veil
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-white p-6">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-600/10 border-2 border-orange-500 border-t-transparent animate-spin flex items-center justify-center mb-6">
            <span className="sr-only">Đang đồng bộ</span>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center font-black text-orange-600 text-[10px] shadow-lg mb-4 select-none">
            KV
            <span className="text-[5px] text-orange-800 font-extrabold uppercase tracking-tighter block -mt-1">Khai Vị</span>
          </div>
          <h2 className="text-sm font-black text-slate-100 uppercase tracking-wider">Hệ Thống Đang Đồng Bộ...</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Đang đồng bộ thực đơn món ăn, cấu hình nhà hàng và danh sách hóa đơn từ dịch vụ đám mây Google Firebase.
          </p>
          <div className="mt-8 flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] text-orange-400 font-semibold uppercase tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
            Cloud Firestore Online
          </div>
        </div>
      </div>
    );
  }

  // Render on actual Mobile viewport (phone screen)
  if (isMobileViewport) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Content view */}
        <div className="flex-1 w-full relative">
          {mobileMode === 'client' || mobileMode === 'history' || mobileMode === 'contact' ? (
            <MobileSimulator
              products={products}
              categories={categories}
              promotions={promotions}
              storeConfig={storeConfig}
              onAddOrder={handleAddOrder}
              isStandaloneMobile={true}
              onToggleAdminView={() => setMobileMode('admin')}
              viewMode={mobileMode === 'history' ? 'history' : mobileMode === 'contact' ? 'contact' : 'menu'}
              onViewModeChange={(mode) => setMobileMode(mode === 'history' ? 'history' : mode === 'contact' ? 'contact' : 'client')}
              orders={orders}
            />
          ) : !isAdminAuthenticated ? (
            <div className="bg-slate-900 min-h-screen pb-16 flex flex-col justify-center">
              <AdminLockScreen 
                onSuccess={() => setIsAdminAuthenticated(true)}
                onCancel={() => setMobileMode('client')}
              />
            </div>
          ) : (
            <div className="bg-white min-h-screen pb-16 flex flex-col">
              <AdminPanel
                products={products}
                categories={categories}
                promotions={promotions}
                storeConfig={storeConfig}
                orders={orders}
                onUpdateOrders={handleUpdateOrders}
                onUpdateProducts={handleUpdateProducts}
                onUpdateCategories={handleUpdateCategories}
                onUpdatePromotions={handleUpdatePromotions}
                onUpdateStoreConfig={handleUpdateStoreConfig}
                onLogout={() => {
                  setIsAdminAuthenticated(false);
                  setMobileMode('client');
                }}
              />
            </div>
          )}
        </div>

        {/* Fixed mobile bottom quick switcher */}
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-2.5 px-6 flex justify-around items-center z-50 shadow-lg">
          <button
            onClick={() => setMobileMode('client')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-black uppercase ${
              mobileMode === 'client' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Smartphone className="w-5 h-5 text-current" />
            Mua Hàng
          </button>
          
          <button
            onClick={() => setMobileMode('history')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-black uppercase ${
              mobileMode === 'history' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ClipboardList className="w-5 h-5 text-current" />
            Đơn Của Tôi
          </button>

          <button
            onClick={() => setMobileMode('contact')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-black uppercase ${
              mobileMode === 'contact' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Phone className="w-5 h-5 text-current" />
            Liên Hệ
          </button>
        </div>
      </div>
    );
  }

  // Render on Desktop/Tablet viewport (Majestic dual workspace representing Geometric Balance UI preview)
  return (
    <div className="w-full h-screen flex bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {/* 1. Left Navigation Control Sidebar */}
      <nav className="w-20 bg-orange-600 flex flex-col items-center py-8 justify-between border-r border-orange-700 shrink-0">
        
        <div className="flex flex-col items-center gap-10">
          {/* Logo brand */}
          <div className="w-12 h-12 bg-white rounded-2xl flex flex-col items-center justify-center font-black text-orange-600 text-lg shadow-lg border border-orange-100 select-none cursor-default">
            KV
            <span className="text-[7px] text-orange-800 font-extrabold uppercase tracking-tighter block -mt-1">Khai Vị</span>
          </div>

          {/* Quick Menu Icons (Stylized layout decorations) */}
          <div className="flex flex-col gap-5">
            <div 
              className="p-3 bg-orange-500 rounded-xl text-white shadow-md shadow-orange-700/55 cursor-pointer hover:bg-orange-400 transition-all group relative"
              title="Tổng quản trị viên"
            >
              <Database className="w-5 h-5" />
              <div className="absolute left-16 bg-slate-900 text-white rounded p-1 text-[9px] uppercase font-bold tracking-wider hidden group-hover:block z-50 shadow-xs">
                Hệ_Thống
              </div>
            </div>

            <div 
              className="p-3 text-orange-200 hover:text-white rounded-xl hover:bg-orange-500 transition-all cursor-pointer group relative"
              title="Đồng bộ sản phẩm"
            >
              <Sparkles className="w-5 h-5" />
              <div className="absolute left-16 bg-slate-900 text-white rounded p-1 text-[9px] uppercase font-bold tracking-wider hidden group-hover:block z-50">
                Làm_Mới
              </div>
            </div>

            <div 
              className="p-3 text-orange-200 hover:text-white rounded-xl hover:bg-orange-500 transition-all cursor-pointer group relative"
              onClick={() => alert(`QR Hotline Zalo hỗ trợ: ${storeConfig.zaloHotline}`)}
              title="Liên hệ Hotline"
            >
              <Settings className="w-5 h-5" />
              <div className="absolute left-16 bg-slate-900 text-white rounded p-1 text-[9px] uppercase font-bold tracking-wider hidden group-hover:block z-50">
                Thông_Tin
              </div>
            </div>
          </div>
        </div>

        {/* Profile Avatar mimic decoration */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-500/80 border-2 border-orange-400/50 shadow-inner flex items-center justify-center text-white font-bold select-none text-sm uppercase">
            AD
          </div>
        </div>

      </nav>

      {/* 2. Middle Main Custom Admin Workspace Pane */}
      <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden relative">
        {!isAdminAuthenticated ? (
          <AdminLockScreen 
            onSuccess={() => setIsAdminAuthenticated(true)}
          />
        ) : (
          <AdminPanel
            products={products}
            categories={categories}
            promotions={promotions}
            storeConfig={storeConfig}
            orders={orders}
            onUpdateOrders={handleUpdateOrders}
            onUpdateProducts={handleUpdateProducts}
            onUpdateCategories={handleUpdateCategories}
            onUpdatePromotions={handleUpdatePromotions}
            onUpdateStoreConfig={handleUpdateStoreConfig}
            onLogout={() => setIsAdminAuthenticated(false)}
          />
        )}
      </div>

      {/* 3. Right Sidebar: Mobile Smartphone Simulator Preview */}
      <div className="w-[380px] bg-slate-100/90 flex flex-col items-center justify-center p-6 border-l border-slate-200 shrink-0">
        
        {/* Helper title above mockup */}
        <div className="w-[332px] text-center mb-3">
          <h2 className="text-xs font-black text-slate-500 tracking-wider uppercase flex items-center justify-center gap-1">
            <Smartphone className="w-4 h-4 text-orange-600" /> Giả Lập Ứng Dụng Điện Thoại
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
            Khách hàng đặt món phía dưới sẽ tự động chuyển hóa đơn tới Admin bên trái ngay lập tức!
          </p>
        </div>

        {/* Smartphone Hardware Frame Model Mockup */}
        <div className="w-[332px] h-[670px] bg-white rounded-[44px] shadow-[0_25px_60px_-15px_rgba(15,23,42,0.22)] border-[10px] border-slate-900 relative overflow-hidden flex flex-col select-none ring-1 ring-slate-950/5">
          
          {/* Smartphone Top Speaker and camera notch */}
          <div className="absolute top-0 inset-x-0 h-6 bg-transparent flex justify-center items-start z-50 pointer-events-none">
            <div className="w-28 h-4.5 bg-slate-900 rounded-b-xl flex items-center justify-center gap-1.5 px-3">
              {/* Camera lens */}
              <span className="w-2 h-2 rounded-full bg-slate-800"></span>
              {/* Speaker bar */}
              <span className="w-10 h-1 bg-slate-800 rounded-full"></span>
            </div>
          </div>

          {/* Screen Content embedded frame */}
          <div className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">
            <MobileSimulator
              products={products}
              categories={categories}
              promotions={promotions}
              storeConfig={storeConfig}
              onAddOrder={handleAddOrder}
              isStandaloneMobile={false}
              orders={orders}
            />
          </div>

          {/* Smartphone Hardware bottom Home slide indicator bar */}
          <div className="h-4 bg-white flex items-center justify-center shrink-0 border-t border-slate-50/50">
            <div className="h-1 w-24 bg-slate-800 rounded-full"></div>
          </div>

        </div>

        {/* Instruction footer banner */}
        <div className="bg-orange-50/80 rounded-xl p-2.5 px-4 max-w-[320px] border border-orange-100/70 mt-3 text-center">
          <p className="text-[9.5px] leading-relaxed text-slate-500">
            💡 <strong className="text-orange-600 uppercase font-black text-[9px] tracking-wide block mb-0.5">Đặt Hàng Thử Nghiệm:</strong> 
            Chọn món trên điện thoại sọc phải, điền thông tin và bấm đặt hàng. Sau đó quét lấy Zalo sao chép bill, đồng thời kiểm chứng bảng Admin bên trái tăng vù vù nhé!
          </p>
        </div>

      </div>

    </div>
  );
}
