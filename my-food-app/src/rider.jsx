import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom'; // เพิ่มสำหรับระบบแชท

export default function Rider() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myJob, setMyJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. เสียงแจ้งเตือนสำหรับไรเดอร์
  const playRiderSound = () => {
    const audio = new Audio('https://assets.mixkit.co');
    audio.play().catch(() => {});
  };

  const fetchData = async () => {
    setLoading(true);
    // ดึงออเดอร์ที่สถานะ "กำลังทำ" และยังไม่มีไรเดอร์รับ
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

    // 2. Real-time แจ้งเตือนเมื่อมีงานใหม่
    const channel = supabase
      .channel('rider-jobs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.new.status === 'กำลังทำ' && !payload.new.rider_id) {
          playRiderSound();
          fetchData();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 3. ฟังก์ชันกดรับงาน พร้อมบันทึกเบอร์โทรไรเดอร์
  const acceptOrder = async (orderId) => {
    const { data: userData } = await supabase.auth.getUser();
    const riderId = userData.user.id;
    const riderPhone = "081-XXX-XXXX"; // ควรดึงจาก profile ไรเดอร์จริงๆ

    const { error } = await supabase
      .from('orders')
      .update({ 
        rider_id: riderId, 
        rider_phone: riderPhone, // เพิ่มเบอร์เพื่อให้ลูกค้าเห็น
        status: 'ไรเดอร์กำลังไปรับ' 
      })
      .eq('id', orderId);

    if (!error) {
      alert("✅ รับงานสำเร็จ! เดินทางปลอดภัยครับ");
      const job = availableOrders.find(o => o.id === orderId);
      setMyJob(job);
      fetchData();
    }
  };

  // 4. ฟังก์ชันเปิดแผนที่นำทางไปยังพิกัดลูกค้า (Google Maps)
  const openNavigation = (lat, lng) => {
    if (!lat || !lng) return alert("ขออภัย ไม่พบพิกัดตำแหน่งของลูกค้า");
    // ลิงก์นำทาง Google Maps ที่ถูกต้อง
    const url = `https://www.google.com{lat},${lng}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="p-10 text-center font-bold text-blue-500">กำลังค้นหางานใกล้ตัว...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-900 min-h-screen text-white"> {/* ปรับเป็น Dark Mode ตามสไตล์แอป */}
      <header className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-2xl shadow-lg border-b-4 border-orange-500">
        <h1 className="text-xl font-bold">🛵 Rider Dashboard</h1>
        <div className="text-xs bg-green-500 text-white px-3 py-1 rounded-full font-bold animate-pulse">
          Online
        </div>
      </header>

      {/* ส่วนงานที่กำลังทำอยู่ (Active Job) */}
      {myJob && (
        <div className="mb-8 p-6 bg-orange-600 text-white rounded-3xl shadow-2xl">
          <h2 className="font-bold text-lg mb-4">🔥 งานปัจจุบันของคุณ</h2>
          <div className="bg-orange-700 p-4 rounded-xl mb-4">
            <p className="text-sm opacity-80">เมนูอาหาร:</p>
            <p className="font-bold">{myJob.food_menu}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => openNavigation(myJob.lat, myJob.lng)}
              className="bg-white text-orange-600 font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              📍 นำทาง (Maps)
            </button>
            <a 
              href={`tel:${myJob.customer_phone}`} 
              className="bg-green-500 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 text-center"
            >
              📞 โทรหาลูกค้า
            </a>
            <button 
              onClick={() => navigate(`/chat/${myJob.id}`)}
              className="col-span-2 bg-gray-800 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-2 mt-2"
            >
              💬 แชทกับลูกค้า
            </button>
          </div>
        </div>
      )}

      {/* ส่วนรายการงานใหม่ */}
      <h2 className="font-bold text-gray-400 mb-4 px-2">📦 ออเดอร์รอคนรับ ({availableOrders.length})</h2>
      <div className="grid gap-4">
        {availableOrders.length === 0 ? (
          <div className="text-center py-20 text-gray-600">เงียบเหงาจัง... ยังไม่มีงานใหม่</div>
        ) : (
          availableOrders.map(order => (
            <div key={order.id} className="bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-700 flex justify-between items-center">
              <div className="flex-1">
                <p className="font-bold text-orange-500 text-lg mb-1">{order.food_menu}</p>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>💰 ค่ารอบ: <b className="text-green-400">฿{order.delivery_fee || 40}</b></span>
                  <span>📍 {order.distance || '2.5'} กม.</span>
                </div>
              </div>
              <button 
                onClick={() => acceptOrder(order.id)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg"
              >
                รับงาน
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
