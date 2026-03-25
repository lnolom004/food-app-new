import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'orders', 'riders', 'menu'
  const [menus, setMenus] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pendingRiders, setPendingRiders] = useState([]);
  const [approvedRiders, setApprovedRiders] = useState([]);
  const [stats, setStats] = useState({ totalSales: 0, todayOrders: 0, totalRiders: 0 });
  const [menuForm, setMenuForm] = useState({ name: '', price: '', image_url: '', category: 'อาหาร' });
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. ฟังก์ชันดึงข้อมูลทั้งหมด (ใช้ useCallback เพื่อประสิทธิภาพ)
  const fetchAllData = useCallback(async () => {
    try {
      const { data: m } = await supabase.from('menus').select('*').order('created_at', { ascending: false });
      const { data: o } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      const { data: riders } = await supabase.from('users').select('*').eq('role', 'rider');
      
      const allMenus = m || [];
      const allOrders = o || [];
      const allRiders = riders || [];

      setMenus(allMenus);
      setOrders(allOrders);
      setPendingRiders(allRiders.filter(u => !u.is_approved));
      setApprovedRiders(allRiders.filter(u => u.is_approved));

      // คำนวณสถิติ
      const today = new Date().toISOString().split('T')[0];
      setStats({
        totalSales: allOrders.filter(x => x.status === 'completed').reduce((sum, curr) => sum + (curr.total_price || 0), 0),
        todayOrders: allOrders.filter(x => x.created_at.startsWith(today)).length,
        totalRiders: allRiders.length
      });
    } catch (err) {
      console.error("Data Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. ตั้งค่า Realtime Listeners
  useEffect(() => {
    fetchAllData();

    const channel = supabase.channel('admin-pro-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchAllData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        alert("💬 ลูกค้าส่งข้อความใหม่ถึงคุณ!");
        fetchAllData();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchAllData]);

  // 3. ฟังก์ชันจัดการคำสั่งซื้อ (Assign Rider)
  const assignJob = async (orderId, riderId) => {
    if (!riderId) return alert("โปรดเลือกไรเดอร์");
    const { error } = await supabase.from('orders').update({ rider_id: riderId, status: 'shipping' }).eq('id', orderId);
    if (!error) {
      alert("🚀 ส่งงานให้ไรเดอร์แล้ว!");
      fetchAllData();
    }
  };

  // 4. ฟังก์ชันอนุมัติไรเดอร์
  const approveRider = async (uid) => {
    const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', uid);
    if (!error) fetchAllData();
  };

  // 5. ฟังก์ชันจัดการเมนู (Add/Edit)
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

  if (loading) return <div style={styles.loading}>ระบบกำลังประมวลผลข้อมูล...</div>;

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <header style={styles.header}>
        <div>
          <h1 style={{ color: '#ff6600', margin: 0 }}>📊 Admin Dashboard Pro</h1>
          <span style={{ color: '#555', fontSize: '12px' }}>V.2026.1 - ป.ตรี โปรเจกต์</span>
        </div>
        <div style={styles.headerBtns}>
          <button onClick={() => navigate('/order')} style={styles.viewAppBtn}>🛒 เปิดหน้าแอป</button>
          <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>ออกจากระบบ</button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav style={styles.tabNav}>
        <button onClick={() => setActiveTab('overview')} style={activeTab === 'overview' ? styles.tabActive : styles.tab}>🏠 ภาพรวม</button>
        <button onClick={() => setActiveTab('orders')} style={activeTab === 'orders' ? styles.tabActive : styles.tab}>📦 ออเดอร์ล่าสุด</button>
        <button onClick={() => setActiveTab('riders')} style={activeTab === 'riders' ? styles.tabActive : styles.tab}>
           🛵 ไรเดอร์ {pendingRiders.length > 0 && <span style={styles.badge}>{pendingRiders.length}</span>}
        </button>
        <button onClick={() => setActiveTab('menu')} style={activeTab === 'menu' ? styles.tabActive : styles.tab}>🍴 เมนูอาหาร</button>
      </nav>

      <main>
        {/* --- Tab Content: Overview --- */}
        {activeTab === 'overview' && (
          <div style={styles.statsGrid}>
            <div style={styles.statCard}><h3>฿{stats.totalSales.toLocaleString()}</h3><p>รายได้สำเร็จทั้งหมด</p></div>
            <div style={styles.statCard}><h3>{stats.todayOrders}</h3><p>ออเดอร์ใหม่วันนี้</p></div>
            <div style={styles.statCard}><h3>{stats.totalRiders}</h3><p>ไรเดอร์ในระบบ</p></div>
          </div>
        )}

        {/* --- Tab Content: Orders --- */}
        {activeTab === 'orders' && (
          <div style={styles.orderGrid}>
            {orders.length === 0 ? <p style={styles.empty}>ยังไม่มีข้อมูลออเดอร์</p> : 
              orders.map(order => (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.cardHeader}>
                    <span style={styles.statusBadge(order.status)}>{order.status}</span>
                    <small>ID: #{order.id.slice(0, 8)}</small>
                  </div>
                  <h4 style={{margin: '10px 0'}}>฿{order.total_price}</h4>
                  <p style={{fontSize: '13px', color: '#888'}}>📍 {order.address || 'ชุมชนใกล้เคียง'}</p>
                  
                  {order.status === 'pending' && (
                    <div style={styles.assignRow}>
                      <select id={`rider-select-${order.id}`} style={styles.select}>
                        <option value="">เลือกไรเดอร์...</option>
                        {approvedRiders.map(r => <option key={r.id} value={r.id}>{r.username || r.email}</option>)}
                      </select>
                      <button onClick={() => assignJob(order.id, document.getElementById(`rider-select-${order.id}`).value)} style={styles.goBtn}>ส่งงาน</button>
                    </div>
                  )}
                  <button onClick={() => navigate(`/chat/${order.id}`)} style={styles.chatBtn}>💬 ตอบแชท</button>
                </div>
              ))
            }
          </div>
        )}

        {/* --- Tab Content: Riders --- */}
        {activeTab === 'riders' && (
          <div style={styles.riderSection}>
            <h3>คำขออนุมัติใหม่</h3>
            {pendingRiders.map(r => (
              <div key={r.id} style={styles.riderRow}>
                <span>{r.email}</span>
                <button onClick={() => approveRider(r.id)} style={styles.approveBtn}>✔️ อนุมัติ</button>
              </div>
            ))}
          </div>
        )}

        {/* --- Tab Content: Menu --- */}
        {activeTab === 'menu' && (
          <div>
            <form onSubmit={handleMenuSubmit} style={styles.menuForm}>
              <input type="text" placeholder="ชื่อ" value={menuForm.name} onChange={e=>setMenuForm({...menuForm, name:e.target.value})} style={styles.input} required />
              <input type="number" placeholder="ราคา" value={menuForm.price} onChange={e=>setMenuForm({...menuForm, price:e.target.value})} style={styles.input} required />
              <input type="text" placeholder="URL รูปภาพ" value={menuForm.image_url} onChange={e=>setMenuForm({...menuForm, image_url:e.target.value})} style={styles.input} required />
              <button type="submit" style={styles.primaryBtn}>{editingMenuId ? 'บันทึก' : 'เพิ่มเมนู'}</button>
            </form>
            <div style={styles.menuGrid}>
              {menus.map(m => (
                <div key={m.id} style={styles.menuItem}>
                  <img src={m.image_url} alt="" style={styles.menuImg} />
                  <h5>{m.name}</h5>
                  <p>฿{m.price}</p>
                  <button onClick={() => {setEditingMenuId(m.id); setMenuForm(m); window.scrollTo(0,0)}} style={styles.editBtn}>แก้ไข</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Styles (Modern Dark Admin UI) ---
const styles = {
  container: { backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: "'Kanit', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #111', paddingBottom: '15px' },
  headerBtns: { display: 'flex', gap: '10px' },
  tabNav: { display: 'flex', gap: '15px', marginBottom: '30px', borderBottom: '1px solid #222' },
  tab: { background: 'none', border: 'none', color: '#555', padding: '10px 15px', cursor: 'pointer', transition: '0.3s' },
  tabActive: { background: 'none', border: 'none', color: '#ff6600', padding: '10px 15px', cursor: 'pointer', borderBottom: '3px solid #ff6600', fontWeight: 'bold' },
  badge: { backgroundColor: '#ff0000', color: '#fff', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', marginLeft: '5px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' },
  statCard: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', textAlign: 'center', border: '1px solid #222' },
  orderGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  orderCard: { backgroundColor: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222', position: 'relative' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: (status) => ({ backgroundColor: status === 'pending' ? '#ff6600' : status === 'completed' ? '#00ff00' : '#007bff', padding: '3px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }),
  assignRow: { marginTop: '15px', display: 'flex', gap: '5px' },
  select: { flex: 1, backgroundColor: '#222', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '5px' },
  chatBtn: { width: '100%', marginTop: '15px', padding: '10px', backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#ff6600', borderRadius: '10px', cursor: 'pointer' },
  goBtn: { backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '8px', cursor: 'pointer' },
  riderRow: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '10px', border: '1px solid #222' },
  approveBtn: { backgroundColor: '#28a745', border: 'none', color: '#fff', padding: '5px 15px', borderRadius: '8px', cursor: 'pointer' },
  menuForm: { backgroundColor: '#111', padding: '20px', borderRadius: '20px', display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' },
  input: { flex: 1, minWidth: '150px', backgroundColor: '#222', color: '#fff', border: '1px solid #333', padding: '10px', borderRadius: '10px' },
  primaryBtn: { backgroundColor: '#ff6600', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' },
  menuItem: { textAlign: 'center', backgroundColor: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222' },
  menuImg: { width: '100%', height: '110px', objectFit: 'cover', borderRadius: '10px', marginBottom: '10px' },
  editBtn: { width: '100%', backgroundColor: '#333', color: '#fff', border: 'none', padding: '5px', borderRadius: '5px', cursor: 'pointer' },
  logoutBtn: { backgroundColor: 'transparent', color: '#888', border: '1px solid #333', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' },
  viewAppBtn: { backgroundColor: '#222', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' },
  loading: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', color: '#ff6600' }
};

export default AdminDashboard;
