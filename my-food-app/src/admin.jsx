import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [newRiders, setNewRiders] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMenu, setNewMenu] = useState({ name: '', price: '', image_url: '' });

  const playSound = () => {
    const audio = new Audio('https://assets.mixkit.co');
    audio.play().catch(() => {});
  };

  const fetchData = async () => {
    const { data: ord } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    const { data: rid } = await supabase.from('users').select('*').eq('is_approved', false);
    const { data: men } = await supabase.from('menus').select('*').order('name');
    setOrders(ord || []); setNewRiders(rid || []); setMenus(men || []); setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('admin-db').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
      playSound(); alert("🚀 มีออเดอร์ใหม่!"); fetchData();
    }).subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const getDailySales = () => {
    const sales = {};
    orders.forEach(o => {
      const d = new Date(o.created_at).toLocaleDateString('th-TH');
      sales[d] = (sales[d] || 0) + (Number(o.total_price) || 0);
    });
    return Object.entries(sales).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const handleApprove = async (id) => {
    const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', id);
    if (!error) { alert('อนุมัติแล้ว!'); fetchData(); }
  };

  if (loading) return <div className="p-20 text-center text-white bg-gray-900 min-h-screen">กำลังโหลดระบบแอดมิน...</div>;

  return (
    <div className="bg-gray-900 min-h-screen p-6 text-gray-200">
      <h1 className="text-3xl font-black mb-10 text-center text-orange-500">🕵️ ADMIN CONTROL PANEL</h1>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-green-500">💰 ยอดขายรายวัน</h2>
          {getDailySales().map(([date, total]) => (
            <div key={date} className="flex justify-between border-b border-gray-700 py-2">
              <span>{date}</span><span className="font-bold">฿{total.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="bg-gray-800 p-6 rounded-3xl border border-gray-700 text-center">
          <h2 className="text-xl font-bold mb-4 text-blue-500">⏳ รออนุมัติ ({newRiders.length})</h2>
          {newRiders.map(r => (
            <div key={r.id} className="flex justify-between items-center bg-gray-900 p-3 rounded-2xl mb-2">
              <span className="text-xs">{r.email}</span>
              <button onClick={() => handleApprove(r.id)} className="bg-blue-600 text-white px-4 py-1 rounded-xl text-xs">อนุมัติ</button>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto bg-gray-800 p-6 rounded-3xl border border-gray-700 mb-10">
        <h2 className="text-xl font-bold mb-6 text-orange-500">🍲 จัดการเมนูอาหาร</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <input className="bg-gray-900 border-none rounded-xl p-3" placeholder="ชื่ออาหาร" value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} />
          <input className="bg-gray-900 border-none rounded-xl p-3" placeholder="ราคา" type="number" value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} />
          <input className="bg-gray-900 border-none rounded-xl p-3" placeholder="URL รูป" value={newMenu.image_url} onChange={e => setNewMenu({...newMenu, image_url: e.target.value})} />
          <button onClick={async () => { await supabase.from('menus').insert([newMenu]); fetchData(); }} className="bg-orange-600 rounded-xl font-bold">เพิ่มเมนู</button>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {menus.map(m => (
            <div key={m.id} className="relative group rounded-xl overflow-hidden">
              <img src={m.image_url} className="h-16 w-full object-cover" alt="" />
              <button onClick={async () => { await supabase.from('menus').delete().eq('id', m.id); fetchData(); }} className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold">ลบ</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
