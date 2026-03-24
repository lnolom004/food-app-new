import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // ระบบ Real-time แจ้งเตือนออเดอร์ใหม่
    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        alert("🚀 มีออเดอร์ใหม่เข้ามา!");
        fetchOrders();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // คำนวณสถิติจากข้อมูลที่มี
  const totalSales = orders.reduce((sum, order) => sum + (Number(order.price) || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'รอรับงาน' || o.status === 'Pending').length;

  if (loading) return <div className="text-center p-10">กำลังดึงข้อมูลแผงควบคุม...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">🕵️ แผงควบคุมแอดมิน (Admin Panel)</h1>
      
      {/* ส่วนสรุปยอด */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow text-center border-t-4 border-green-500">
          <p className="text-gray-500">ยอดขายทั้งหมด</p>
          <p className="text-3xl font-bold text-green-600">฿{totalSales}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow text-center border-t-4 border-blue-500">
          <p className="text-gray-500">ออเดอร์ทั้งหมด</p>
          <p className="text-3xl font-bold text-blue-600">{orders.length} รายการ</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow text-center border-t-4 border-yellow-500">
          <p className="text-gray-500">รอรับงาน</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingOrders} รายการ</p>
        </div>
      </div>

      {/* ตารางรายการออเดอร์ */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b font-bold bg-gray-50">📝 รายการออเดอร์ล่าสุด</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100 text-sm">
                <th className="p-3">วัน/เวลา</th>
                <th className="p-3">รายการอาหาร</th>
                <th className="p-3">ยอดชำระ</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">ที่อยู่จัดส่ง</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="5" className="p-10 text-center text-gray-400">ยังไม่มีข้อมูลการสั่งซื้อ</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-xs">{new Date(order.created_at).toLocaleString('th-TH')}</td>
                    <td className="p-3 font-medium">{order.food_menu}</td>
                    <td className="p-3 text-orange-600 font-bold">฿{order.price}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${order.status === 'สำเร็จ' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {order.status || 'รอดำเนินการ'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{order.address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
