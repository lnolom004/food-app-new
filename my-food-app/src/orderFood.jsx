import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

export default function OrderFood() {
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const fetchData = async (currentUser) => {
    setLoading(true);
    const { data: menuData } = await supabase.from('menus').select('*').order('name');
    const { data: orderData } = await supabase.from('orders')
      .select('*')
      .eq('customer_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    setMenus(menuData || []);
    setMyOrders(orderData || []);
    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }
      
      const { data: userData } = await supabase.from('users').select('role, is_approved').eq('id', session.user.id).single();
      if (userData?.role === 'rider' && !userData.is_approved) {
        alert("🚨 โปรดรอการยืนยันบัญชีไรเดอร์");
        await supabase.auth.signOut(); navigate('/login'); return;
      }
      setUser(session.user);
      fetchData(session.user);
    };
    checkAuth();
  }, [navigate]);

  // --- ฟังก์ชันยกเลิกออเดอร์ (ลบจาก Database) ---
  const cancelOrder = async (orderId, status) => {
    if (status !== 'pending') {
      alert("❌ ยกเลิกไม่ได้: ร้านค้ากำลังเตรียมอาหารแล้วครับ");
      return;
    }
    
    if (window.confirm("คุณต้องการยกเลิกออเดอร์นี้ใช่หรือไม่?")) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (!error) {
        alert("✅ ยกเลิกออเดอร์เรียบร้อยแล้ว");
        fetchData(user); // โหลดข้อมูลใหม่
      } else {
        alert("เกิดข้อผิดพลาดในการยกเลิก");
      }
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  if (loading) return <div className="p-20 text-center text-orange-500 bg-black min-h-screen">กำลังโหลด...</div>;

  return (
    <div className="bg-black min-h-screen p-4 md:p-8 text-white font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* รายการอาหาร */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-black mb-8 text-orange-500">🔥 เมนูแนะนำ</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {menus.map(item => (
              <div key={item.id} className="bg-gray-900 rounded-[30px] overflow-hidden border border-gray-800 hover:border-orange-500/50 transition-all group shadow-2xl">
                <div className="relative aspect-video overflow-hidden">
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  <div className="absolute top-2 right-2 bg-black/80 px-3 py-1 rounded-full text-xs font-bold text-orange-400 border border-orange-500/20">฿{item.price}</div>
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-bold text-gray-100 truncate mb-4">{item.name}</h3>
                  <button onClick={() => addToCart(item)} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-orange-900/20">เพิ่มลงตะกร้า</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ตะกร้า & ติดตามออเดอร์ */}
        <div className="space-y-6">
          <div className="bg-gray-900 p-6 rounded-[30px] border border-gray-800 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-orange-500 flex justify-between">🛒 ตะกร้าของฉัน <span>{cart.length}</span></h2>
            <div className="max-h-60 overflow-y-auto mb-6 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm bg-black p-3 rounded-2xl border border-gray-800">
                  <span className="font-bold text-gray-300">{item.name} x{item.qty}</span>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-red-500 font-bold text-lg px-2">×</button>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center text-gray-600 py-6 italic text-sm">ยังไม่มีสินค้าในตะกร้า</p>}
            </div>
          </div>

          {/* ส่วนติดตามสถานะและปุ่มยกเลิก */}
          <div className="bg-gray-900 p-6 rounded-[30px] border border-gray-800 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-gray-400">📄 สถานะออเดอร์ล่าสุด</h2>
            <div className="space-y-3">
              {myOrders.map(order => (
                <div key={order.id} className="p-4 bg-black rounded-2xl border border-gray-800">
                  <p className="font-bold text-gray-300 text-xs mb-2">{order.food_menu}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      order.status === 'pending' ? 'bg-yellow-900/30 text-yellow-500 border border-yellow-500/20' : 'bg-green-900/30 text-green-500'
                    }`}>
                      {order.status === 'pending' ? 'รอรับออเดอร์' : 'กำลังจัดเตรียม'}
                    </span>
                    
                    {/* ปุ่มยกเลิกออเดอร์ (แสดงเฉพาะตอน pending) */}
                    {order.status === 'pending' && (
                      <button 
                        onClick={() => cancelOrder(order.id, order.status)} 
                        className="text-red-500 hover:text-red-400 text-[10px] font-bold underline transition-colors"
                      >
                        ยกเลิกรายการ
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {myOrders.length === 0 && <p className="text-gray-600 text-center py-4 text-xs italic">ไม่มีประวัติการสั่งซื้อ</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
