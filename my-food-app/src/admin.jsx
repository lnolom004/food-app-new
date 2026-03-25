import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  // --- 1. State: จัดการข้อมูลในหน้าจอ ---
  const [activeTab, setActiveTab] = useState('overview'); 
  const [menus, setMenus] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingRiders, setPendingRiders] = useState([]);
  const [approvedRiders, setApprovedRiders] = useState([]);
  const [salesStats, setSalesStats] = useState({ daily: 0, weekly: 0, monthly: 0 });
  
  // State สำหรับฟอร์มเพิ่มเมนู
  const [menuForm, setMenuForm] = useState({ name: '', price: '', image_url: '', category: 'อาหาร' });
  const navigate = useNavigate();

  // --- 2. Logic: ดึงข้อมูลและคำนวณสถิติ ---
  const fetchAllData = useCallback(async () => {
    // ดึงเมนูทั้งหมด
    const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false });
    // ดึงออเดอร์ทั้งหมด
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    // ดึงไรเดอร์ทั้งหมด
    const { data: u } = await supabase.from('users').select('*').eq('role', 'rider');

    setMenus(m || []);
    setOrders(o || []);
    setPendingRiders(u?.filter(r => !r.is_approved) || []);
    setApprovedRiders(u?.filter(r => r.is_approved) || []);

    // คำนวณยอดขายราย วัน/สัปดาห์/เดือน (เฉพาะสถานะ completed)
    if (o) {
      const completed = o.filter(item => item.status === 'completed');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      const daily = completed.filter(i => i.created_at.startsWith(todayStr)).reduce((s, i) => s + (Number(i.total_price) || 0), 0);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const weekly = completed.filter(i => new Date(i.created_at) >= sevenDaysAgo).reduce((s, i) => s + (Number(i.total_price) || 0), 0);

      const monthly = completed.filter(i => {
        const d = new Date(i.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((s, i) => s + (Number(i.total_price) || 0), 0);

      setSalesStats({ daily, weekly, monthly });
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    // ระบบ Realtime (เด้งเตือนเมื่อมีออเดอร์ใหม่ หรือแชทใหม่)
    const channel = supabase.channel('admin-pro-2026')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAllData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => alert("💬 ลูกค้าทักแชทมาครับ!"))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchAllData]);

  // --- 3. Actions: จัดการปุ่มกดต่าง ๆ ---

  // จัดการเมนู (เพิ่ม/ลบ)
  const handleAddMenu = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('menus').insert([menuForm]);
    if (!error) {
      alert("เพิ่มเมนูเรียบร้อย!");
      setMenuForm({ name: '', price: '', image_url: '', category: 'อาหาร' });
      fetchAllData();
    }
  };

  const deleteMenu = async (id) => {
    if (window.confirm("ต้องการลบเมนูนี้ใช่ไหม?")) {
      await supabase.from('menus').delete().eq('id', id);
      fetchAllData();
    }
  };

  // มอบหมายงานให้ไรเดอร์ (Pending -> Shipping)
  const assignOrder = async (orderId, riderId) => {
    if (!riderId) return alert("โปรดเลือกไรเดอร์ก่อนครับ");
    await supabase.from('orders').update({ rider_id: riderId, status: 'shipping' }).eq('id', orderId);
    alert("🚀 ส่งงานให้ไรเดอร์แล้ว!");
    fetchAllData();
  };

  // อนุมัติไรเดอร์
  const approveRider = async (id) => {
    await supabase.from('users').update({ is_approved: true }).eq('id', id);
    fetchAllData();
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={{ color: '#ff6600', margin: 0 }}>🛡️ แผงควบคุมผู้ดูแลระบบ</h2>
        <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>ออกจากระบบ</button>
      </header>

      {/* แถบเมนู Tabs */}
      <div style={styles.tabBar}>
        <button onClick={() => setActiveTab('overview')} style={activeTab === 'overview' ? styles.tabActive : styles.tab}>🏠 ยอดขาย</button>
        <button onClick={() => setActiveTab('orders')} style={activeTab === 'orders' ? styles.tabActive : styles.tab}>📦 ออเดอร์</button>
        <button onClick={() => setActiveTab('menu')} style={activeTab === 'menu' ? styles.tabActive : styles.tab}>🍔 จัดการเมนู</button>
        <button onClick={() => setActiveTab('riders')} style={activeTab === 'riders' ? styles.tabActive : styles.tab}>🛵 ไรเดอร์ ({pendingRiders.length})</button>
      </div>

      <main style={{ marginTop: '20px' }}>
        
        {/* TAB: สรุปยอดขาย */}
        {activeTab === 'overview' && (
          <div style={styles.statsGrid}>
            <div style={{...styles.statCard, borderLeft: '5px solid #00ff00'}}><h4>ยอดวันนี้</h4><h2>฿{salesStats.daily.toLocaleString()}</h2></div>
            <div style={{...styles.statCard, borderLeft: '5px solid #ffcc00'}}><h4>สัปดาห์นี้</h4><h2>฿{salesStats.weekly.toLocaleString()}</h2></div>
            <div style={{...styles.statCard, borderLeft: '5px solid #ff6600'}}><h4>เดือนนี้</h4><h2>฿{salesStats.monthly.toLocaleString()}</h2></div>
          </div>
        )}

        {/* TAB: จัดการออเดอร์ (ระบุไรเดอร์) */}
        {activeTab === 'orders' && (
          <div style={styles.listContainer}>
            {orders.map(o => (
              <div key={o.id} style={styles.orderCard}>
                <div style={styles.rowBetween}>
                  <b>ออเดอร์ #{o.id.slice(0,5)}</b>
                  <span style={styles.badge(o.status)}>{o.status}</span>
                </div>
                <p style={{fontSize: '13px', margin: '5px 0'}}>📍 {o.address} | 💰 ฿{o.total_price}</p>
                {o.status === 'pending' && (
                  <div style={styles.assignRow}>
                    <select id={`rider-${o.id}`} style={styles.select}>
                      <option value="">-- เลือกไรเดอร์ --</option>
                      {approvedRiders.map(r => <option key={r.id} value={r.id}>{r.email}</option>)}
                    </select>
                    <button onClick={() => assignOrder(o.id, document.getElementById(`rider-${o.id}`).value)} style={styles.btnSend}>ส่งงาน</button>
                  </div>
                )}
                <button onClick={() => navigate(`/chat/${o.id}`)} style={styles.btnChat}>💬 เข้าห้องแชท</button>
              </div>
            ))}
          </div>
        )}

        {/* TAB: จัดการเมนูอาหาร (เพิ่มชื่อ/ราคา/รูป) */}
        {activeTab === 'menu' && (
          <div>
            <form onSubmit={handleAddMenu} style={styles.menuForm}>
              <h3 style={{marginBottom: '10px'}}>➕ เพิ่มรายการอาหาร</h3>
              <input placeholder="ชื่อเมนู" style={styles.input} value={menuForm.name} onChange={e=>setMenuForm({...menuForm, name: e.target.value})} required />
              <input placeholder="ราคา (บาท)" type="number" style={styles.input} value={menuForm.price} onChange={e=>setMenuForm({...menuForm, price: e.target.value})} required />
              <input placeholder="ลิงก์ URL รูปภาพ" style={styles.input} value={menuForm.image_url} onChange={e=>setMenuForm({...menuForm, image_url: e.target.value})} required />
              <button type="submit" style={styles.btnPrimary}>ยืนยันเพิ่มเมนู</button>
            </form>

            <div style={styles.menuGrid}>
              {menus.map(m => (
                <div key={m.id} style={styles.menuItem}>
                  <img src={m.image_url} style={styles.menuImg} alt={m.name} />
                  <h4>{m.name}</h4>
                  <p style={{color: '#ff6600'}}>฿{m.price}</p>
                  <button onClick={() => deleteMenu(m.id)} style={styles.btnDelete}>ลบรายการ</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: อนุมัติไรเดอร์ */}
        {activeTab === 'riders' && (
          pendingRiders.map(r => (
            <div key={r.id} style={styles.riderRow}>
              <span>{r.email}</span>
              <button onClick={() => approveRider(r.id)} style={styles.btnApprove}>✔️ อนุมัติ</button>
            </div>
          ))
        )}

      </main>
    </div>
  );
};

// --- 4. Styles: ความสวยงามแบบ Dark Theme ---
const styles = {
  container: { backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: "'Kanit', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '10px' },
  tabBar: { display: 'flex', gap: '15px', marginTop: '20px', overflowX: 'auto', paddingBottom: '10px' },
  tab: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '15px', padding: '10px' },
  tabActive: { background: 'none', border: 'none', color: '#ff6600', borderBottom: '2px solid #ff6600', fontWeight: 'bold', fontSize: '15px', padding: '10px' },
  
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
  statCard: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', textAlign: 'center' },
  
  orderCard: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', marginBottom: '10px', border: '1px solid #222' },
  rowBetween: { display: 'flex', justifyContent: 'space-between' },
  badge: (s) => ({ backgroundColor: s === 'pending' ? '#ff6600' : s === 'shipping' ? '#007bff' : '#28a745', padding: '2px 8px', borderRadius: '5px', fontSize: '11px' }),
  
  menuForm: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', marginBottom: '20px' },
  input: { width: '100%', padding: '12px', marginBottom: '10px', backgroundColor: '#222', border: '1px solid #333', color: '#fff', borderRadius: '8px', boxSizing: 'border-box' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' },
  menuItem: { backgroundColor: '#111', padding: '10px', borderRadius: '12px', textAlign: 'center', border: '1px solid #222' },
  menuImg: { width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' },
  
  btnPrimary: { width: '100%', padding: '12px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  btnDelete: { marginTop: '5px', color: '#ff4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' },
  btnChat: { width: '100%', marginTop: '10px', backgroundColor: '#222', color: '#ff6600', border: '1px solid #ff6600', padding: '5px', borderRadius: '8px', cursor: 'pointer' },
  btnSend: { backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '5px', cursor: 'pointer' },
  
  assignRow: { display: 'flex', gap: '10px', marginTop: '10px' },
  select: { flex: 1, backgroundColor: '#222', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '5px' },
  riderRow: { display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: '#111', marginBottom: '10px', borderRadius: '10px' },
  btnApprove: { backgroundColor: '#28a745', border: 'none', color: '#fff', padding: '5px 15px', borderRadius: '5px' },
  logoutBtn: { background: 'none', border: '1px solid #444', color: '#888', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' }
};

export default AdminDashboard;
