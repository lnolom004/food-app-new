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

    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        alert("🔔 มีออเดอร์ใหม่เข้ามา!");
        fetchOrders();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  if (loading) return <div className="text-center p-10">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">🕵️ แผงควบคุมแอดมิน</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">เวลา</th>
              <th className="p-4">รายการ</th>
              <th className="p-4">ราคา</th>
              <th className="p-4">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="4" className="p-10 text-center">ยังไม่มีข้อมูลออเดอร์</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="p-4 text-sm">{new Date(order.created_at).toLocaleString('th-TH')}</td>
                  <td className="p-4 font-medium">{order.food_menu}</td>
                  <td className="p-4 text-orange-600">฿{order.price}</td>
                  <td className="p-4">{order.status || 'รอดำเนินการ'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
