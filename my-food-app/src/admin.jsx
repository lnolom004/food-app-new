import { useEffect, useState } from 'react'
import PocketBase from 'pocketbase'

const pb = new PocketBase('https://sky-managed.pockethost.io');

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. ฟังก์ชันดึงข้อมูลออเดอร์ (เรียงใหม่ไปเก่า)
  const fetchOrders = async () => {
    try {
      const records = await pb.collection('orders').getList(1, 50, {
        sort: '-created',
        expand: 'customer'
      });
      setOrders(records.items);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchOrders();

    // 2. หัวใจหลัก: ระบบ Real-time Sync กับลูกค้า
    pb.collection('orders').subscribe('*', (e) => {
      if (e.action === 'create') {
        // เมื่อลูกค้าสั่งใหม่: เล่นเสียง + แจ้งเตือน
        const audio = new Audio('/notify.mp3');
        audio.play().catch(() => {});
        alert("🔔 มีออเดอร์ใหม่เข้าเเล้ว!");
      }
      
      if (e.action === 'delete') {
        // เมื่อลูกค้ายกเลิก (Cancel): แจ้งเตือนแอดมิน
        alert("⚠️ ออเดอร์ #" + e.record.id.slice(0, 5) + " ถูกลูกค้ายกเลิกแล้ว");
      }

      // รีโหลดข้อมูลทุกครั้งที่มีการสร้าง/ลบ/อัปเดต เพื่อความแม่นยำ
      fetchOrders();
    });

    return () => pb.collection('orders').unsubscribe();
  }, []);

  // 3. ฟังก์ชันอัปเดตสถานะ (สอดคล้องกับ UI ลูกค้า)
  const updateStatus = async (id, nextStatus) => {
    try {
      await pb.collection('orders').update(id, { status: nextStatus });
      // ไม่ต้องสั่ง fetchOrders เพราะระบบ subscribe จะทำงานให้อัตโนมัติ
    } catch (err) {
      alert("ไม่สามารถเปลี่ยนสถานะได้: " + err.message);
    }
  };

  // 4. สรุปยอดขาย (เฉพาะรายการที่ completed)
  const revenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>กำลังเข้าสู่ระบบจัดการร้านค้า...</div>;

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      
      {/* Dashboard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>🏪 แผงควบคุมร้านค้า</h1>
          <p style={{ margin: 0, color: '#666' }}>จัดการรายการอาหารและสถานะแบบ Real-time</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '14px', color: '#888' }}>รายได้ที่สำเร็จแล้ว</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2e7d32' }}>฿{revenue.toLocaleString()}</div>
        </div>
      </div>

      {/* สรุปจำนวนออเดอร์ค้างทำ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '10px', textAlign: 'center', borderBottom: '4px solid #ffc107' }}>
          <b>รอรับออเดอร์</b><br/>{orders.filter(o => o.status === 'pending').length} รายการ
        </div>
        <div style={{ background: '#cfe2ff', padding: '15px', borderRadius: '10px', textAlign: 'center', borderBottom: '4px solid #0d6efd' }}>
          <b>กำลังจัดเตรียม</b><br/>{orders.filter(o => o.status === 'cooking').length} รายการ
        </div>
      </div>

      {/* รายการออเดอร์ */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px', color: '#999' }}>ยังไม่มีคำสั่งซื้อเข้ามา...</div>
        ) : (
          orders.map(order => (
            <div key={order.id} style={{ 
              background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              borderLeft: `12px solid ${
                order.status === 'pending' ? '#ffc107' : 
                order.status === 'cooking' ? '#0d6efd' : 
                order.status === 'ready_to_pick' ? '#198754' : '#6c757d'
              }`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <div>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>ออเดอร์ #{order.id.slice(0, 5)}</span>
                  <div style={{ fontSize: '13px', color: '#999' }}>สั่งโดย: {order.expand?.customer?.name || 'ลูกค้าทั่วไป'}</div>
                </div>
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  {new Date(order.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.
                </div>
              </div>

              {/* รายการอาหารที่สั่ง */}
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                {order.items?.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>🍱 {it.name}</span>
                    <span>x 1</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #ddd', marginTop: '10px', paddingTop: '10px', textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }}>
                  ยอดรวม: ฿{order.total_price}
                </div>
              </div>

              {/* ปุ่มควบคุมสถานะ (Contextual Actions) */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {order.status === 'pending' && (
                  <button onClick={() => updateStatus(order.id, 'cooking')} style={{ flex: 1, padding: '12px', background: '#ffc107', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    👨‍🍳 เริ่มทำอาหาร
                  </button>
                )}

                {order.status === 'cooking' && (
                  <button onClick={() => updateStatus(order.id, 'ready_to_pick')} style={{ flex: 1, padding: '12px', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ✅ ทำเสร็จแล้ว (เรียกไรเดอร์)
                  </button>
                )}

                {order.status === 'ready_to_pick' && (
                  <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#d1e7dd', color: '#0f5132', borderRadius: '8px', fontWeight: 'bold' }}>
                    ⏳ รอไรเดอร์มารับอาหาร
                  </div>
                )}

                {order.status === 'delivering' && (
                  <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#fff3cd', color: '#664d03', borderRadius: '8px', fontWeight: 'bold' }}>
                    🏍️ ไรเดอร์กำลังไปส่งให้ลูกค้า
                  </div>
                )}

                {order.status === 'completed' && (
                  <div style={{ flex: 1, textAlign: 'center', padding: '12px', background: '#e2e3e5', color: '#383d41', borderRadius: '8px', fontWeight: 'bold' }}>
                    🏁 ออเดอร์สำเร็จเรียบร้อย
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
