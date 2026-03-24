import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function Rider() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myJob, setMyJob] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. เสียงแจ้งเตือนสำหรับไรเดอร์
  const playRiderSound = () => {
    const audio = new Audio('https://assets.mixkit.co');
    audio.play().catch(() => {});
  };

  const fetchData = async () => {
    setLoading(true);
    // ดึงออเดอร์ที่สถานะ "กำลังทำ" และยังไม่มีไรเดอร์รับ (rider_id เป็น NULL)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'กำลังทำ')
      .is('rider_id', null)
      .order('created_at', { ascending: false });
    
    setAvailableOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // 2. Real-time แจ้งเตือนเมื่อมีงานใหม่ที่สถานะ "กำลังทำ"
    const channel = supabase
      .channel('rider-jobs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.new.status === 'กำลังทำ' && !payload.new.rider_id) {
          playRiderSound();
          alert("🛵 มีออเดอร์ใหม่พร้อมให้คุณไปรับแล้ว!");
          fetchData();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 3. ฟังก์ชันกดรับงาน
  const acceptOrder = async (orderId) => {
    const { data: userData } = await supabase.auth.getUser();
    const riderId = userData.user.id;

    const { error } = await supabase
      .from('orders')
      .update({ 
        rider_id: riderId, 
        status: 'ไรเดอร์กำลังไปรับ' 
      })
      .eq('id', orderId);

    if (!error) {
      alert("✅ รับงานสำเร็จ! เดินทางปลอดภัยครับ");
      // เก็บข้อมูลงานที่รับไว้โชว์แผนที่
      const job = availableOrders.find(o => o.id === orderId);
      setMyJob(job);
      fetchData();
    }
  };

  // 4. ฟังก์ชันเปิดแผนที่นำทางไปยังพิกัดลูกค้า
  const openNavigation = (lat, lng) => {
    if (!lat || !lng) return alert("ขออภัย ไม่พบพิกัดตำแหน่งของลูกค้า");
    const url = `https://www.google.com{lat},${lng}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="p-10 text-center font-bold text-blue-500">กำลังค้นหางานใกล้ตัว...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border-b-4 border-blue-500">
        <h1 className="text-xl font-bold">🛵 งานสำหรับไรเดอร์</h1>
        <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
          ออนไลน์อยู่
        </div>
      </header>

      {/* ส่วนงานที่กำลังทำอยู่ (ถ้ามี) */}
      {myJob && (
        <div className="mb-8 p-6 bg-blue-600 text-white rounded-3xl shadow-xl animate-pulse">
          <h2 className="font-bold text-lg mb-2">🔥 งานที่กำลังทำตอนนี้</h2>
          <p className="text-sm mb-4">ลูกค้า: {myJob.food_menu}</p>
          <button 
            onClick={() => openNavigation(myJob.lat, myJob.lng)}
            className="w-full bg-white text-blue-600 font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            📍 เปิดแผนที่นำทางไปหาลูกค้า
          </button>
        </div>
      )}

      {/* ส่วนรายการงานใหม่ */}
      <h2 className="font-bold text-gray-600 mb-4 px-2">📦 งานใหม่ที่พร้อมรับ ({availableOrders.length})</h2>
      <div className="space-y-4">
        {availableOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">ยังไม่มีออเดอร์ที่ปรุงเสร็จในขณะนี้</div>
        ) : (
          availableOrders.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 flex justify-between items-center">
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-lg mb-1 truncate max-w-[200px]">{order.food_menu}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>💰 ค่าตอบแทน: <b className="text-blue-600">฿{order.delivery_fee || 40}</b></span>
                  <span>📍 ระยะทาง: {order.distance || '-'} กม.</span>
                </div>
              </div>
              <button 
                onClick={() => acceptOrder(order.id)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95"
              >
                กดรับงาน
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
