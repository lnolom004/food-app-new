import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'menu', 'riders', 'orders'
  const [menus, setMenus] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingRiders, setPendingRiders] = useState([]);
  const [availableRiders, setAvailableRiders] = useState([]); // ไรเดอร์ที่อนุมัติแล้ว
  const [menuForm, setMenuForm] = useState({ name: '', price: '', image_url: '', category: 'อาหาร' });
  const [editingMenuId, setEditingMenuId] = useState(null);
  const navigate = useNavigate();

  // 1. เริ่มต้นระบบและ Realtime
  useEffect(() => {
    fetchAllData();

    // ฟังการเปลี่ยนแปลงในฐานข้อมูล (Realtime)
    const channel = supabase.channel('admin-main-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => {
        alert("🔔 มีออเดอร์ใหม่สั่งเข้ามา!");
        fetchAllData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => {
        alert("💬 ลูกค้าส่งข้อความใหม่มาถึงคุณ!");
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchAllData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchAllData = async () => {
    // ดึงเมนู
    const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false });
    // ดึงออเดอร์
    const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    // ดึงไรเดอร์ที่ "รออนุมัติ"
    const { data: pr } = await supabase.from('users').select('*').eq('role', 'rider').eq('is_approved', false);
    // ดึงไรเดอร์ที่ "อนุมัติแล้ว" เพื่อเอาไว้เลือกส่งงาน
    const { data: ar } = await supabase.from('users').select('*').eq('role', 'rider').eq('is_approved', true);

    setMenus(m || []);
    setOrders(o || []);
    setPendingRiders(pr || []);
    setAvailableRiders(ar || []);
  };

  // 2. ฟังก์ชันจัดการเมนู
  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    if (editingMenuId) {
      await supabase.from('menus').update(menuForm).eq('id', editingMenuId);
      setEditingMenuId(null);
    } else {
      await supabase.from('menus').insert([menuForm]);
    }
    setMenuForm({ name: '', price: '', image_url: '', category: 'อาหาร' });
    fetchAllData();
  };

  const deleteMenu = async (id) => {
    if (window.confirm("ยืนยันการลบเมนูนี้?")) {
      await supabase.from('menus').delete().eq('id', id);
      fetchAllData();
    }
  };

  // 3. ฟังก์ชันอนุมัติไรเดอร์
  const approveRider = async (id) => {
    const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', id);
    if (!error) {
      alert("อนุมัติไรเดอร์สำเร็จ!");
      fetchAllData();
    }
  };

  // 4. ฟังก์ชันมอบหมายงานให้ไรเดอร์ (Assign Job)
  const assignOrder = async (orderId, riderId) => {
    if (!riderId) return alert("โปรดเลือกไรเดอร์ก่อนส่งงาน");
    const { error } = await supabase
      .from('orders')
      .update({ 
        rider_id: riderId, 
        status: 'shipping' // เปลี่ยนสถานะเพื่อให้ไรเดอร์เห็นงาน
      })
      .eq('id', orderId);

    if (!error) {
      alert("🚀 ส่งงานให้ไรเดอร์เรียบร้อยแล้ว!");
      fetchAllData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h2 style={{ color: '#ff6600', margin: 0 }}>⚙️ Admin Dashboard</h2>
          <small style={{ color: '#666' }}>FoodApp Pro Management</small>
        </div>
        <div>
          <button onClick={() => navigate('/order')} style={styles.navBtn}>🛒 ดูหน้าแอป</button>
          <button onClick={handleLogout} style={styles.logoutBtn}>ออกจากระบบ</button>
        </div>
      </header>

      {/* Tabs */}
      <div style={styles.tabBar}>
        <button onClick={() => setActiveTab('orders')} style={activeTab === 'orders' ? styles.tabActive : styles.tab}>
          📦 จัดการออเดอร์
        </button>
        <button onClick={() => setActiveTab('riders')} style={activeTab === 'riders' ? styles.tabActive : styles.tab}>
          🛵 ไรเดอร์ {pendingRiders.length > 0 && <span style={styles.badge}>{pendingRiders.length}</span>}
        </button>
        <button onClick={() => setActiveTab('menu')} style={activeTab === 'menu' ? styles.tabActive : styles.tab}>
          🍴 เมนูอาหาร
        </button>
      </div>

      {/* Content: ออเดอร์ & มอบหมายงาน */}
      {activeTab === 'orders' && (
        <section>
          <h3>รายการออเดอร์ล่าสุด</h3>
          <div style={styles.grid}>
            {orders.map(o => (
              <div key={o.id} style={styles.card}>
                <div style={styles.cardRow}>
                  <b>#{o.id.slice(0, 8)}</b>
                  <span style={{ color: o.status === 'pending' ? '#ff6600' : '#00ff00' }}>{o.status}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#ccc' }}>📍 {o.address}</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold' }}>💰 ยอดรวม: ฿{o.total_price}</p>

                {/* เลือกไรเดอร์ (เฉพาะงานที่ยังว่าง) */}
                {o.status === 'pending' && (
                  <div style={styles.assignArea}>
                    <select id={`rider-${o.id}`} style={styles.select}>
                      <option value="">-- เลือกไรเดอร์ --</option>
                      {availableRiders.map(r => (
                        <option key={r.id} value={r.id}>{r.username || r.email}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => assignOrder(o.id, document.getElementById(`rider-${o.id}`).value)}
                      style={styles.assignBtn}
                    >
                      ส่งงาน
                    </button>
                  </div>
                )}
                
                <button onClick={() => navigate(`/chat/${o.id}`)} style={styles.chatBtn}>💬 ตอบแชทลูกค้า</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Content: จัดการเมนู */}
      {activeTab === 'menu' && (
        <section>
          <div style={styles.menuForm}>
            <h3>{editingMenuId ? '📝 แก้ไขเมนู' : '➕ เพิ่มเมนูใหม่'}</h3>
            <form onSubmit={handleMenuSubmit} style={styles.inlineForm}>
              <input type="text" placeholder="ชื่อเมนู" value={menuForm.name} onChange={e=>setMenuForm({...menuForm, name:e.target.value})} style={styles.input} required />
              <input type="number" placeholder="ราคา" value={menuForm.price} onChange={e=>setMenuForm({...menuForm, price:e.target.value})} style={styles.input} required />
              <input type="text" placeholder="URL รูปภาพ" value={menuForm.image_url} onChange={e=>setMenuForm({...menuForm, image_url:e.target.value})} style={styles.input} required />
              <button type="submit" style={styles.primaryBtn}>{editingMenuId ? 'บันทึก' : 'เพิ่มเมนู'}</button>
            </form>
          </div>
          <div style={styles.grid}>
            {menus.map(m => (
              <div key={m.id} style={styles.menuCard}>
                <img src={m.image_url} alt="" style={styles.menuImg} />
                <h4>{m.name}</h4>
                <p>฿{m.price}</p>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => { setEditingMenuId(m.id); setMenuForm(m); }} style={styles.editBtn}>แก้ไข</button>
                  <button onClick={() => deleteMenu(m.id)} style={styles.delBtn}>ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Content: อนุมัติไรเดอร์ */}
      {activeTab === 'riders' && (
        <section>
          <h3>ผู้สมัครไรเดอร์ใหม่</h3>
          {pendingRiders.length === 0 ? <p style={{ color: '#444' }}>ไม่มีคำขอค้างอยู่</p> : (
            pendingRiders.map(r => (
              <div key={r.id} style={styles.riderRow}>
                <div>
                  <p style={{ margin: 0 }}>{r.email}</p>
                  <small style={{ color: '#666' }}>ID: {r.id}</small>
                </div>
                <button onClick={() => approveRider(r.id)} style={styles.approveBtn}>✔️ อนุมัติการเข้าใช้งาน</button>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'Kanit' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #222', paddingBottom: '15px' },
  navBtn: { backgroundColor: '#222', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', marginRight: '10px' },
  logoutBtn: { background: 'none', border: '1px solid #333', color: '#666', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer' },
  tabBar: { display: 'flex', gap: '10px', marginBottom: '30px' },
  tab: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '10px 20px', fontSize: '16px' },
  tabActive: { background: 'none', border: 'none', color: '#ff6600', cursor: 'pointer', padding: '10px 20px', fontSize: '16px', borderBottom: '2px solid #ff6600', fontWeight: 'bold' },
  badge: { backgroundColor: 'red', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #222' },
  cardRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  assignArea: { marginTop: '15px', display: 'flex', gap: '5px' },
  select: { flex: 1, backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '5px', padding: '5px' },
  assignBtn: { backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  chatBtn: { width: '100%', marginTop: '15px', padding: '10px', backgroundColor: '#333', color: '#ff6600', border: '1px solid #ff6600', borderRadius: '8px', cursor: 'pointer' },
  menuForm: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', marginBottom: '30px' },
  inlineForm: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  input: { flex: 1, minWidth: '150px', padding: '10px', backgroundColor: '#222', border: '1px solid #333', color: '#fff', borderRadius: '8px' },
  primaryBtn: { backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  menuCard: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', textAlign: 'center' },
  menuImg: { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' },
  editBtn: { flex: 1, backgroundColor: '#444', color: '#fff', border: 'none', padding: '5px', borderRadius: '5px', cursor: 'pointer' },
  delBtn: { flex: 1, backgroundColor: '#ff4444', color: '#fff', border: 'none', padding: '5px', borderRadius: '5px', cursor: 'pointer' },
  riderRow: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  approveBtn: { backgroundColor: '#28a745', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
};

export default AdminDashboard;
