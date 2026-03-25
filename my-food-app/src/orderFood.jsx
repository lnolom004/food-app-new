import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // s ตัวเล็กตามรูปในเครื่องคุณ
import { useNavigate } from 'react-router-dom';

export default function OrderFood() {
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // ============================================================
  // 1. ฟังก์ชันดึงข้อมูล (Menus และ Orders)
  // ============================================================
  const fetchData = async (currentUser) => {
    try {
      // ดึงเมนูอาหาร
      const { data: menuData } = await supabase.from('menus').select('*').order('name');
      // ดึงออเดอร์ของลูกค้าคนนี้เท่านั้น
      const { data: orderData } = await supabase.from('orders')
        .select('*')
        .eq('customer_id', currentUser.id)
        .order('created_at', { ascending: false });

      setMenus(menuData || []);
      setMyOrders(orderData || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 2. ระบบตรวจสอบสิทธิ์และ Real-time Update
  // ============================================================
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      fetchData(session.user);

      // --- เปิดระบบ Real-time: แจ้งเตือนเมื่อสถานะออเดอร์เปลี่ยน ---
      const channel = supabase
        .channel('order-updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${session.user.id}` },
          (payload) => {
            console.log('Order changed!', payload);
            fetchData(session.user); // โหลดข้อมูลใหม่ทันทีที่มีการเปลี่ยนแปลง
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    };

    init();
  }, [navigate]);

  // ============================================================
  // 3. ฟังก์ชันจัดการตะกร้าและสั่งซื้อ
  // ============================================================
  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    const foodList = cart.map(item => `${item.name} (x${item.qty})`).join(', ');
    
    const { error } = await supabase.from('orders').insert([
      { 
        food_menu: foodList, 
        customer_id: user.id, 
        status: 'pending' 
      }
    ]);

    if (!error) {
      alert("🎉 สั่งอาหารสำเร็จ!");
      setCart([]);
      fetchData(user);
    }
  };

  const cancelOrder = async (orderId, status) => {
    if (status !== 'pending') {
      alert("❌ ไม่สามารถยกเลิกได้ เนื่องจากร้านรับออเดอร์แล้ว");
      return;
    }
    if (window.confirm("คุณต้องการยกเลิกออเดอร์นี้ใช่ไหม?")) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (!error) fetchData(user);
    }
  };

  if (loading) return <div className="bg-black min-h-screen flex items-center justify-center text-orange-500 font-black">PREPARING MENU...</div>;

  return (
    <div className="bg-black min-h-screen text-white font-sans pb-10">
      {/* --- ส่วนหัว (Navbar) --- */}
      <div className="max-w-6xl mx-auto p-6 flex justify-between items-center border-b border-gray-900 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <h1 className="text-2xl font-black text-orange-500 italic tracking-tighter">🍔 FOODAPP PRO</h1>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-gray-500 hidden sm:block">{user?.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="bg-gray-900 px-4 py-2 rounded-xl text-xs font-bold hover:text-red-500 transition-colors">Logout</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* --- ฝั่งซ้าย: รายการอาหาร (GRID 2-3 Columns) --- */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">🔥 เมนูยอดนิยม</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {menus.map((item) => (
              <div key={item.id} className="bg-gray-900 rounded-[32px] overflow-hidden border border-gray-800 group hover:border-orange-500/50 transition-all shadow-2xl">
                {/* 📸 จุดที่ทำให้รูปเท่ากันเป๊ะ: บังคับด้วย aspect-video และ object-cover */}
                <div className="relative aspect-video overflow-hidden bg-gray-800">
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded-full text-[10px] font-black text-orange-400 border border-orange-500/20">฿{item.price}</div>
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-bold text-gray-200 text-xs truncate mb-4">{item.name}</h3>
                  <button onClick={() => addToCart(item)} className="w-full bg-white text-black py-3 rounded-2xl text-[10px] font-black hover:bg-orange-600 hover:text-white transition-all active:scale-95 shadow-lg">เพิ่มลงตะกร้า</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- ฝั่งขวา: ตะกร้า และ สถานะออเดอร์ --- */}
        <div className="space-y-8">
          {/* ส่วนตะกร้า */}
          <div className="bg-gray-900 p-6 rounded-[35px] border border-gray-800 shadow-2xl">
            <h2 className="text-lg font-bold mb-6 text-orange-500 flex justify-between">🛒 ตะกร้าของฉัน <span>{cart.length}</span></h2>
            <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs bg-black/40 p-3 rounded-2xl border border-gray-800">
                  <span className="text-gray-300">{item.name} <span className="text-orange-500">x{item.qty}</span></span>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-red-500 font-black">✕</button>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center text-gray-600 text-xs italic py-4">ยังไม่ได้เลือกอาหารเลย...</p>}
            </div>
            {cart.length > 0 && (
              <button onClick={placeOrder} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-orange-900/20 active:scale-95 transition-all">สั่งอาหารตอนนี้</button>
            )}
          </div>

          {/* ส่วนสถานะออเดอร์ (ยกเลิกได้) */}
          <div className="bg-gray-900 p-6 rounded-[35px] border border-gray-800 shadow-2xl">
            <h2 className="text-lg font-bold mb-6 text-gray-400">📄 ติดตามสถานะ</h2>
            <div className="space-y-4">
              {myOrders.map(order => (
                <div key={order.id} className="p-4 bg-black/60 rounded-2xl border border-gray-800">
                  <p className="text-[10px] text-gray-200 font-bold mb-2 truncate">{order.food_menu}</p>
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase ${
                      order.status === 'pending' ? 'bg-yellow-900/30 text-yellow-500 border border-yellow-500/20' : 'bg-green-900/30 text-green-500 border border-green-500/20'
                    }`}>
                      {order.status === 'pending' ? 'รอรับงาน' : 'รับงานแล้ว'}
                    </span>
                    {order.status === 'pending' && (
                      <button onClick={() => cancelOrder(order.id, order.status)} className="text-[9px] text-red-500 underline font-bold">ยกเลิกรายการ</button>
                    )}
                  </div>
                </div>
              ))}
              {myOrders.length === 0 && <p className="text-center text-gray-600 text-xs italic py-4">ไม่มีประวัติการสั่งซื้อ</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
