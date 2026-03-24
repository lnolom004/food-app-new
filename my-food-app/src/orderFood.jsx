import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function OrderFood() {
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: menuData } = await supabase.from('menus').select('*').order('name');
    const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setMenus(menuData || []);
    setMyOrders(orderData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) return alert("กรุณาเลือกอาหารก่อนครับ");
    const foodNames = cart.map(i => `${i.name} x${i.qty}`).join(', ');
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

    const { error } = await supabase.from('orders').insert([{
      food_menu: foodNames,
      total_price: total,
      status: 'pending'
    }]);

    if (!error) { alert('🚀 สั่งซื้อสำเร็จ!'); setCart([]); fetchData(); }
  };

  const cancelOrder = async (id, status) => {
    if (status !== 'pending') return alert('❌ ยกเลิกไม่ได้: ร้านรับงานแล้ว');
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) { alert('✅ ยกเลิกสำเร็จ'); fetchData(); }
  };

  if (loading) return <div className="p-20 text-center text-orange-500 bg-gray-900 min-h-screen">กำลังโหลดเมนู...</div>;

  return (
    <div className="bg-gray-900 min-h-screen p-4 md:p-8 text-white font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* รายการอาหาร */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-black mb-8 text-orange-500 border-b border-gray-800 pb-4">🔥 เมนูแนะนำ</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {menus.map(item => (
              <div key={item.id} className="bg-gray-800 rounded-3xl overflow-hidden border border-gray-700 hover:border-orange-500 transition-all group shadow-2xl">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded-full text-xs font-bold text-orange-400 border border-orange-500/30">฿{item.price}</div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-100 truncate mb-4">{item.name}</h3>
                  <button onClick={() => addToCart(item)} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2.5 rounded-xl text-sm font-black transition-all active:scale-95">เพิ่มลงตะกร้า</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ตะกร้า & ติดตามออเดอร์ */}
        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-3xl shadow-2xl border border-gray-700 sticky top-4">
            <h2 className="text-xl font-bold mb-6 text-orange-500 flex justify-between">🛒 ตะกร้าของฉัน <span>{cart.length}</span></h2>
            <div className="max-h-60 overflow-y-auto mb-6 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm bg-gray-900 p-3 rounded-2xl border border-gray-700">
                  <span className="font-bold text-gray-200">{item.name} x{item.qty}</span>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-red-500 font-bold text-lg">×</button>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center text-gray-500 py-6">ตะกร้าว่างเปล่า...</p>}
            </div>
            {cart.length > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <div className="flex justify-between text-xl font-black mb-6"><span>ยอดรวม:</span><span className="text-orange-500">฿{cart.reduce((s, i) => s + (i.price * i.qty), 0)}</span></div>
                <button onClick={placeOrder} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black text-lg shadow-lg">ยืนยันสั่งซื้อ</button>
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
            <h2 className="text-lg font-bold mb-4 text-gray-400">📄 สถานะออเดอร์ล่าสุด</h2>
            {myOrders.map(order => (
              <div key={order.id} className="mb-3 p-3 bg-gray-900 rounded-2xl border border-gray-700 text-xs">
                <p className="font-bold text-gray-300">{order.food_menu}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${order.status === 'pending' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-green-900/30 text-green-500'}`}>{order.status}</span>
                  {order.status === 'pending' && <button onClick={() => cancelOrder(order.id, order.status)} className="text-red-500 underline">ยกเลิก</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
