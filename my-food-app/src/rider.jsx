import React, { useState, useEffect } from 'react';
import { supabase } from './src/supabase';

function Rider() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. ดึงข้อมูลออเดอร์ที่ "รอไรเดอร์" (pending) และระบบเสียงแจ้งเตือน ---
  useEffect(() => {
    fetchPendingOrders();

    // 🔔 ระบบ Real-time: ดักฟังออเดอร์ใหม่เข้าตาราง orders
    const channel = supabase.channel('rider-job-board')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        // ถ้าเป็นออเดอร์ใหม่และสถานะเป็น pending
        if (payload.new.status === 'pending') {
          playAlert(); // 🔊 สั่งเล่นเสียง!
          alert("🔔 มีออเดอร์ใหม่เข้ามาแล้วเพื่อน! รีบกดรับงานนะ");
          fetchPendingOrders(); // อัปเดตรายการบนหน้าจอ
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchPendingOrders(); // อัปเดตถ้ามีไรเดอร์คนอื่นกดรับไปก่อน
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending') // ดึงเฉพาะงานที่ยังว่าง
      .order('created_at', { ascending: false });

    if (!error) setOrders(data);
    setLoading(false);
  };

  // --- 2. ฟังก์ชันเล่นเสียงแจ้งเตือน ---
  const playAlert = () => {
    const audio = new Audio('/alert.mp3'); // ไฟล์ต้องอยู่ในโฟลเดอร์ public นะครับ
    audio.play().catch(err => console.log("รอคนคลิกหน้าจอหนึ่งครั้งก่อนเพื่อให้เสียงดัง:", err));
  };

  // --- 3. ฟังก์ชันกดรับงาน ---
  const acceptOrder = async (orderId) => {
    const riderName = localStorage.getItem('user_name') || 'ไรเดอร์นิรนาม';
    
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'accepted', // เปลี่ยนสถานะเป็นรับงานแล้ว
        rider_name: riderName 
      })
      .eq('id', orderId);

    if (error) {
      alert('รับงานไม่สำเร็จ: ' + error.message);
    } else {
      alert('✅ รับงานเรียบร้อย! ไปส่งของกันเลย');
      fetchPendingOrders();
    }
  };

  return (
    <div className="container" style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2 style={{ textAlign: 'center', color: '#2196f3' }}>🛵 กระดานงานไรเดอร์ (Real-time)</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>คลิกหน้าจอสัก 1 ครั้งเพื่อเปิดระบบเสียงแจ้งเตือน</p>
      <hr />

      {loading ? <p>กำลังตรวจสอบงานว่าง...</p> : (
        <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
          {orders.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999' }}>ยังไม่มีออเดอร์ใหม่ในขณะนี้...</p>
          ) : orders.map(order => (
            <div key={order.id} className="card" style={orderCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, color: '#333' }}>🍔 {order.food_menu}</h3>
                <span className="badge badge-pending">รอกดรับ</span>
              </div>
              
              <div style={{ margin: '15px 0', fontSize: '14px', color: '#555' }}>
                <p>👤 <b>ลูกค้า:</b> {order.customer_name}</p>
                <p>📞 <b>โทร:</b> {order.customer_phone}</p>
                <p>🏠 <b>ที่อยู่:</b> {order.address}</p>
                <p>💰 <b>ราคารวม:</b> <span style={{ color: '#28a745', fontWeight: 'bold' }}>฿{order.total_price}</span></p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {/* 📍 ปุ่มนำทาง Google Maps */}
                <button 
                  onClick={() => window.open(`https://www.google.com{order.lat},${order.lng}`)}
                  style={{ ...btnStyle, backgroundColor: '#4285F4' }}
                >
                  📍 นำทาง (GPS)
                </button>

                {/* ✅ ปุ่มกดรับงาน */}
                <button 
                  onClick={() => acceptOrder(order.id)}
                  style={{ ...btnStyle, backgroundColor: '#28a745' }}
                >
                  ✅ รับออเดอร์นี้
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Styles ---
const orderCardStyle = {
  border: '1px solid #ddd',
  padding: '20px',
  borderRadius: '12px',
  backgroundColor: 'white',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
};

const btnStyle = {
  flex: 1,
  color: 'white',
  border: 'none',
  padding: '12px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px'
};

export default Rider;
