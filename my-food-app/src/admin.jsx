import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [newRiders, setNewRiders] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMenu, setNewMenu] = useState({ name: '', price: '', image_url: '', category: '' });

  // 1. ฟังก์ชันส่งเสียงแจ้งเตือน
  const playNotificationSound = () => {
    // ใช้เสียง Beep พื้นฐาน หรือเปลี่ยน URL เป็นไฟล์เสียงที่คุณชอบได้ครับ
    const audio = new Audio('https://assets.mixkit.co');
    audio.play().catch(err => console.log("รอการตอบโต้จากผู้ใช้เพื่อเล่นเสียง:", err));
  };

  const fetchData = async () => {
    const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: riderData } = await supabase.from('users').select('*').eq('is_approved', false);
    const { data: menuData } = await supabase.from('menus').select('*').order('name', { ascending: true });
    
    setOrders(orderData || []);
    setNewRiders(riderData || []);
    setMenus(menuData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // 2. ระบบ Real-time แจ้งเตือนเสียง (ออเดอร์ใหม่ & ไรเดอร์ใหม่)
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        playNotificationSound();
        alert("🚀 มีออเดอร์ใหม่เข้ามา!");
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
        if (payload.new.role === 'rider') {
          playNotificationSound();
          alert("🛵 มีไรเดอร์ใหม่สมัครเข้ามา!");
          fetchData();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // --- ส่วนคำนวณยอดขายรายวัน ---
  const getDailySales = () => {
    const sales = {};
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('th-TH');
      sales[date] = (sales[date] || 0) + (Number(order.total_price) || 0);
    });
    return Object.entries(sales).sort((a, b) => b[0].localeCompare(a[0]));
  };

  // --- ส่วนจัดการเมนูอาหาร ---
  const handleAddMenu = async (e) => {
    e.preventDefault();
    if (!newMenu.name || !newMenu.price) return alert("กรุณากรอกข้อมูลให้ครบ");
    const { error } = await supabase.from('menus').insert([newMenu]);
    if (!error) { alert("✅ เพิ่มเมนูสำเร็จ!"); setNewMenu({ name: '', price: '', image_url: '', category: '' }); fetchData(); }
  };

  const handleDeleteMenu = async (id) => {
    if (window.confirm("ลบเมนูนี้ใช่หรือไม่?")) {
      const { error } = await supabase.from('menus').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handleApproveRider = async (id) => {
    const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', id);
    if (!error) { alert('✅ อนุมัติไรเดอร์แล้ว'); fetchData(); }
  };

  if (loading) return <div className="p-10 text-center font-bold text-orange-500">กำลังเชื่อมต่อระบบแอดมิน...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-800">🕵️ แผงควบคุมแอดมิน</h1>
        <div className="bg-orange-100 text-orange-700 px-4 py-1 rounded-full text-sm font-bold animate-pulse">
          ระบบแจ้งเตือนเสียงเปิดใช้งานอยู่
        </div>
      </header>

      {/* สรุปยอดขาย & อนุมัติไรเดอร์ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-md border-l-8 border-green-500">
          <h2 className="text-xl font-bold mb-4 text-green-700">💰 ยอดขายรายวัน</h2>
          <div className="space-y-2">
            {getDailySales().map(([date, total]) => (
              <div key={date} className="flex justify-between border-b pb-1">
                <span>{date}</span>
                <span className="font-bold text-green-600">฿{total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-md border-l-8 border-blue-500">
          <h2 className="text-xl font-bold mb-4 text-blue-700">⏳ ไรเดอร์รออนุมัติ ({newRiders.length})</h2>
          {newRiders.map(rider => (
            <div key={rider.id} className="flex justify-between items-center bg-blue-50 p-3 rounded-xl mb-2">
              <span className="text-xs truncate">{rider.email}</span>
              <button onClick={() => handleApproveRider(rider.id)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs">อนุมัติ</button>
            </div>
          ))}
        </div>
      </div>

      {/* จัดการเมนูอาหาร */}
      <div className="bg-white p-6 rounded-3xl shadow-md">
        <h2 className="text-xl font-bold mb-4 text-orange-600">🍲 จัดการเมนูอาหาร</h2>
        <form onSubmit={handleAddMenu} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 bg-orange-50 p-4 rounded-2xl">
          <input type="text" placeholder="ชื่ออาหาร" className="p-2 rounded-lg text-sm border" value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} />
          <input type="number" placeholder="ราคา" className="p-2 rounded-lg text-sm border" value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} />
          <input type="text" placeholder="URL รูปภาพ" className="p-2 rounded-lg text-sm border" value={newMenu.image_url} onChange={e => setNewMenu({...newMenu, image_url: e.target.value})} />
          <button type="submit" className="bg-orange-600 text-white font-bold rounded-lg text-sm">เพิ่มเมนู</button>
        </form>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {menus.map(item => (
            <div key={item.id} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
              <img src={item.image_url} className="w-full h-16 object-cover" />
              <button onClick={() => handleDeleteMenu(item.id)} className="absolute top-0 right-0 bg-red-500 text-white p-1 text-[8px] opacity-0 group-hover:opacity-100">ลบ</button>
            </div>
          ))}
        </div>
      </div>

      {/* รายการออเดอร์ล่าสุด */}
      <div className="bg-white p-6 rounded-3xl shadow-md">
        <h2 className="text-xl font-bold mb-4 text-gray-700">🚚 ออเดอร์ล่าสุด</h2>
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100"><th className="p-3">เมนู</th><th className="p-3">ยอดรวม</th><th className="p-3 text-center">สถานะ</th></tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-t">
                  <td className="p-3 font-bold">{order.food_menu}</td>
                  <td className="p-3 text-orange-600 font-bold">฿{order.total_price}</td>
                  <td className="p-3 text-center"><span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px]">{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
