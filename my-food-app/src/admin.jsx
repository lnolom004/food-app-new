import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [menus, setMenus] = useState([]);
  const [riders, setRiders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menuForm, setMenuForm] = useState({ name: '', price: '', category: 'อาหาร', image_url: '' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
    // ระบบแจ้งเตือน Realtime สำหรับออเดอร์ใหม่
    const orderSub = supabase.channel('admin-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => {
        alert("🔔 มีออเดอร์ใหม่เข้ามา!"); // แจ้งเตือนหน้าจอ
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchAllData)
      .subscribe();

    return () => supabase.removeChannel(orderSub);
  }, []);

  const fetchAllData = async () => {
    const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false });
    const { data: r } = await supabase.from('users').select('*').eq('role', 'rider').eq('is_approved', false);
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10);
    setMenus(m || []);
    setRiders(r || []);
    setOrders(o || []);
  };

  // --- 1. จัดการเมนู ---
  const handleAddMenu = async (e) => {
    e.preventDefault();
    await supabase.from('menus').insert([menuForm]);
    setMenuForm({ name: '', price: '', category: 'อาหาร', image_url: '' });
    fetchAllData();
  };

  const deleteMenu = async (id) => {
    if (confirm("ลบเมนูนี้?")) {
      await supabase.from('menus').delete().eq('id', id);
      fetchAllData();
    }
  };

  // --- 2. อนุมัติไรเดอร์ ---
  const approveRider = async (id) => {
    const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', id);
    if (!error) alert("อนุมัติไรเดอร์สำเร็จ!");
    fetchAllData();
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={{ color: '#ff6600' }}>⚙️ ระบบจัดการหลังบ้าน (Admin)</h2>
        <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>ออกจากระบบ</button>
      </header>

      <div style={styles.gridContainer}>
        
        {/* ส่วนที่ 1: จัดการเมนูอาหาร */}
        <section style={styles.section}>
          <h3>🍔 จัดการเมนูอาหาร</h3>
          <form onSubmit={handleAddMenu} style={styles.form}>
            <input type="text" placeholder="ชื่อเมนู" value={menuForm.name} onChange={e=>setMenuForm({...menuForm, name:e.target.value})} required style={styles.input} />
            <input type="number" placeholder="ราคา" value={menuForm.price} onChange={e=>setMenuForm({...menuForm, price:e.target.value})} required style={styles.input} />
            <button type="submit" style={styles.addBtn}>เพิ่มเมนู</button>
          </form>
          <div style={styles.list}>
            {menus.map(m => (
              <div key={m.id} style={styles.item}>
                <span>{m.name} - ฿{m.price}</span>
                <button onClick={() => deleteMenu(m.id)} style={{color: 'red', border:'none', background:'none', cursor:'pointer'}}>ลบ</button>
              </div>
            ))}
          </div>
        </section>

        {/* ส่วนที่ 2: อนุมัติไรเดอร์ (Wait for Approval) */}
        <section style={styles.section}>
          <h3>🛵 อนุมัติไรเดอร์ใหม่ ({riders.length})</h3>
          {riders.length === 0 ? <p style={{color:'#666'}}>ไม่มีผู้สมัครใหม่</p> : 
            riders.map(r => (
              <div key={r.id} style={styles.item}>
                <span>{r.email}</span>
                <button onClick={() => approveRider(r.id)} style={styles.approveBtn}>อนุมัติ</button>
              </div>
            ))
          }
        </section>

        {/* ส่วนที่ 3: ออเดอร์ล่าสุด & แชทตอบกลับ */}
        <section style={styles.section}>
          <h3>📦 ออเดอร์ล่าสุด & ติดต่อลูกค้า</h3>
          {orders.map(o => (
            <div key={o.id} style={styles.orderCard}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <small>ID: {o.id.slice(0,8)}</small>
                <b style={{color:'#ff6600'}}>฿{o.total_price}</b>
              </div>
              <p style={{fontSize:'12px', margin:'5px 0'}}>สถานะ: {o.status}</p>
              <button onClick={() => navigate(`/chat/${o.id}`)} style={styles.chatBtn}>💬 ตอบแชทลูกค้า</button>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'Kanit' },
  header: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '10px', marginBottom: '20px' },
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  section: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #222' },
  input: { padding: '8px', marginBottom: '10px', width: '100%', boxSizing: 'border-box', backgroundColor: '#222', color: '#fff', border: '1px solid #333', borderRadius: '5px' },
  addBtn: { width: '100%', padding: '10px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' },
  list: { marginTop: '15px', maxHeight: '200px', overflowY: 'auto' },
  item: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #222' },
  approveBtn: { backgroundColor: '#00ff00', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' },
  orderCard: { backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #333' },
  chatBtn: { width: '100%', padding: '8px', backgroundColor: '#333', color: '#ff6600', border: '1px solid #ff6600', borderRadius: '5px', cursor: 'pointer', marginTop: '5px' },
  logoutBtn: { background: 'none', border: '1px solid #444', color: '#888', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' }
};

export default AdminDashboard;
