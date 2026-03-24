import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function OrderFood() {
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(null); // เก็บ ID ออเดอร์ที่กำลังจะรีวิว
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });

  const fetchData = async () => {
    setLoading(true);
    const { data: menuData } = await supabase.from('menus').select('*').order('name');
    const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setMenus(menuData || []);
    setMyOrders(orderData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- ส่วนจัดการตะกร้าสินค้า ---
  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // --- ส่วนจัดการออเดอร์ ---
  const placeOrder = async () => {
    if (cart.length === 0) return alert("กรุณาเลือกอาหารก่อนสั่งซื้อ");
    const foodList = cart.map(i => `${i.name} x${i.qty}`).join(', ');
    
    const { error } = await supabase.from('orders').insert([{
      food_menu: foodList,
      total_price: calculateTotal(),
      status: 'pending',
      is_notified: false
    }]);

    if (!error) {
      alert("🚀 สั่งซื้อสำเร็จ! กรุณารอรับอาหาร");
      setCart([]);
      fetchData();
    }
  };

  const handleCancelOrder = async (orderId, status) => {
    if (status !== 'pending') return alert("❌ ไม่สามารถยกเลิกได้ เนื่องจากร้านค้าหรือไรเดอร์รับงานแล้ว");
    if (window.confirm("คุณต้องการยกเลิกออเดอร์นี้ใช่หรือไม่?")) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (!error) { alert("🗑️ ยกเลิกออเดอร์เรียบร้อย"); fetchData(); }
    }
  };

  // --- ส่วนระบบรีวิว ---
  const submitReview = async (orderId) => {
    const { error } = await supabase.from('reviews').insert([{
      order_id: orderId,
      rating: reviewData.rating,
      comment: reviewData.comment
    }]);

    if (!error) {
      alert("⭐ ขอบคุณสำหรับคะแนนรีวิวครับ!");
      setShowReview(null);
      setReviewData({ rating: 5, comment: '' });
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-orange-500 animate-bounce">กำลังเตรียมความอร่อย...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 1. ส่วนรายการเมนูอาหาร */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-extrabold text-gray-800 mb-8 flex items-center gap-3">
            <span className="bg-orange-500 text-white p-2 rounded-2xl">🍕</span> เมนูอาหารแนะนำ
          </h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {menus.map(item => (
              <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 group">
                <div className="relative overflow-hidden">
                  <img src={item.image_url} className="w-full aspect-[4/3] object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-full text-xs font-bold text-orange-600">฿{item.price}</div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 truncate mb-3">{item.name}</h3>
                  <button onClick={() => addToCart(item)} className="w-full bg-gray-900 text-white py-2 rounded-2xl text-sm font-bold hover:bg-orange-600 transition-colors">
                    เพิ่มลงตะกร้า
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. ส่วนตะกร้าสินค้า & ติดตามออเดอร์ */}
        <div className="space-y-6">
          {/* ตะกร้าสินค้า */}
          <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-orange-100 sticky top-4">
            <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
              <span>🛒 ตะกร้าของฉัน</span>
              <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs">{cart.length} รายการ</span>
            </h2>
            <div className="max-h-60 overflow-y-auto mb-4 space-y-3">
              {cart.length === 0 ? <p className="text-center text-gray-400 py-6 italic text-sm">ยังไม่ได้เลือกอาหารเลย...</p> : 
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-xl">
                    <div className="flex-1">
                      <p className="font-bold text-gray-700">{item.name}</p>
                      <p className="text-xs text-gray-400">฿{item.price} x {item.qty}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 ml-2 hover:text-red-600 text-lg">×</button>
                  </div>
                ))
              }
            </div>
            {cart.length > 0 && (
              <div className="pt-4 border-t border-dashed">
                <div className="flex justify-between text-lg font-black mb-4">
                  <span>รวมทั้งสิ้น:</span>
                  <span className="text-orange-600">฿{calculateTotal()}</span>
                </div>
                <button onClick={placeOrder} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all">
                  สั่งซื้อเลย (Confirm Order)
                </button>
              </div>
            )}
          </div>

          {/* ติดตามสถานะออเดอร์ & รีวิว */}
          <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100">
            <h2 className="text-lg font-bold mb-4">📄 สถานะออเดอร์ล่าสุด</h2>
            <div className="space-y-4">
              {myOrders.map(order => (
                <div key={order.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm relative">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-700 max-w-[150px]">{order.food_menu}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-black text-orange-600">฿{order.total_price}</span>
                    
                    {/* ปุ่มยกเลิก */}
                    {order.status === 'pending' && (
                      <button onClick={() => handleCancelOrder(order.id, order.status)} className="text-[10px] text-red-500 underline">ยกเลิก</button>
                    )}
                    
                    {/* ปุ่มรีวิว (โชว์เมื่อสำเร็จแล้ว) */}
                    {order.status === 'สำเร็จ' && (
                      <button onClick={() => setShowReview(order.id)} className="bg-blue-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold">⭐ รีวิว</button>
                    )}
                  </div>

                  {/* Modal รีวิวแบบย่อย */}
                  {showReview === order.id && (
                    <div className="mt-4 p-3 bg-white rounded-xl border-2 border-blue-100 shadow-inner">
                      <p className="font-bold mb-2 text-blue-600 text-xs">ให้คะแนนความอร่อย</p>
                      <input type="number" min="1" max="5" className="w-full border p-1 rounded-md mb-2 text-sm" value={reviewData.rating} onChange={e => setReviewData({...reviewData, rating: e.target.value})} />
                      <textarea placeholder="รสชาติเป็นอย่างไรบ้าง?" className="w-full border p-2 rounded-md text-xs mb-2" value={reviewData.comment} onChange={e => setReviewData({...reviewData, comment: e.target.value})} />
                      <div className="flex gap-2">
                        <button onClick={() => submitReview(order.id)} className="flex-1 bg-green-500 text-white py-1 rounded-lg text-[10px]">บันทึก</button>
                        <button onClick={() => setShowReview(null)} className="flex-1 bg-gray-200 text-gray-600 py-1 rounded-lg text-[10px]">ยกเลิก</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
