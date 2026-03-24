import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

function Admin() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalIncome: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // 🔔 ระบบ Realtime: อัปเดตทันทีเมื่อมีการสั่งซื้อหรือเปลี่ยนสถานะ
    const channel = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false }); // เอาออเดอร์ใหม่ไว้บนสุด

    if (!error) {
      setOrders(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  // --- คำนวณยอดสรุป ---
  const calculateStats = (data) => {
    const totalIncome = data.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const pending = data.filter(item => item.status === 'pending').length;
    setStats({ totalOrders: data.length, totalIncome, pending });
  };

  // --- ฟังก์ชันเปลี่ยนสถานะออเดอร์โดยแอดมิน ---
  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) alert(error.message);
    else fetchOrders();
  };

  // --- ฟังก์ชันลบออเดอร์ (กรณีข้อมูลผิดพลาด) ---
  const deleteOrder = async (id) => {
    if (window.confirm('ยืนยันที่จะลบออเดอร์นี้หรือไม่?')) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (!error) fetchOrders();
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'Arial' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>🕵️ แผงควบคุมแอดมิน (Admin Panel)</h1>
      <hr />

      {/* --- ส่วนสรุปตัวเลข (Stats Cards) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <h3>ยอดขายทั้งหมด</h3>
          <p style={{ fontSize: '24px', color: '#28a745', fontWeight: 'bold' }}>฿{stats.totalIncome.toLocaleString()}</p>
        </div>
        <div style={cardStyle}>
          <h3>ออเดอร์ทั้งหมด</h3>
          <p style={{ fontSize: '24px', color: '#007bff' }}>{stats.totalOrders} รายการ</p>
        </div>
        <div style={cardStyle}>
          <h3>รอคนรับงาน</h3>
          <p style={{ fontSize: '24px', color: '#ffc107' }}>{stats.pending} รายการ</p>
        </div>
      </div>

      {/* --- รายการออเดอร์ --- */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2>📝 รายการออเดอร์ทั้งหมด</h2>
        {loading ? <p>กำลังโหลดข้อมูล...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={thStyle}>วัน/เวลา</th>
                <th style={thStyle}>ลูกค้า / เบอร์โทร</th>
                <th style={thStyle}>รายการอาหาร</th>
                <th style={thStyle}>ยอดชำระ</th>
                <th style={thStyle}>สถานะ</th>
                <th style={thStyle}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{new Date(order.created_at).toLocaleString('th-TH')}</td>
                  <td style={tdStyle}>
                    <b>{order.customer_name}</b> <br />
                    <small>{order.customer_phone}</small>
                  </td>
                  <td style={tdStyle}>{order.food_menu}</td>
                  <td style={tdStyle}>฿{order.total_price}</td>
                  <td style={tdStyle}>
                    <span style={statusBadge(order.status)}>{order.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <select 
                      value={order.status} 
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      style={{ marginRight: '5px' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="shipping">Shipping</option>
                      <option value="success">Success</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button onClick={() => deleteOrder(order.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- Styles ---
const cardStyle = { backgroundColor: 'white', padding: '15px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' };
const thStyle = { padding: '12px 8px', color: '#666' };
const tdStyle = { padding: '12px 8px' };

const statusBadge = (status) => {
  let color = '#666';
  if (status === 'pending') color = '#ffc107';
  if (status === 'accepted') color = '#17a2b8';
  if (status === 'shipping') color = '#007bff';
  if (status === 'success') color = '#28a745';
  if (status === 'cancelled') color = '#dc3545';
  return {
    backgroundColor: color,
    color: 'white',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold'
  };
};

export default Admin;
