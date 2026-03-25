import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

const Rider = () => {
  const [availableOrders, setAvailableOrders] = useState([]); // งานที่รอคนรับ
  const [myHistory, setMyHistory] = useState([]); // ประวัติงานของเรา
  const [todayCount, setTodayCount] = useState(0); // จำนวนงานวันนี้
  const [uid, setUid] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initRider = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUid(user.id);
        fetchData(user.id);
      }

      // ระบบ Real-time: อัปเดตเมื่อมีการเปลี่ยนแปลงในตาราง orders
      const channel = supabase.channel('rider-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          if (user) fetchData(user.id);
        }).subscribe();

      return () => supabase.removeChannel(channel);
    };
    initRider();
  }, []);

  const fetchData = async (userId) => {
    // 1. ดึงงานที่ "ว่างอยู่" (ยังไม่มีใครรับ)
    const { data: available } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .is('rider_id', null)
      .order('created_at', { ascending: false });
    setAvailableOrders(available || []);

    // 2. ดึง "ประวัติงาน" ของเราเอง
    const { data: history } = await supabase
      .from('orders')
      .select('*')
      .eq('rider_id', userId)
      .order('created_at', { ascending: false });
    setMyHistory(history || []);

    // 3. คำนวณงานที่รับไป "วันนี้"
    const today = new Date().toISOString().split('T')[0];
    const countToday = (history || []).filter(o => o.created_at.startsWith(today)).length;
    setTodayCount(countToday);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h2 style={{ color: '#ff6600', margin: 0 }}>🛵 Rider Dashboard</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>ออกจากระบบ</button>
      </header>

      {/* สรุปงานวันนี้ */}
      <div style={styles.summaryContainer}>
        <div style={styles.summaryCard}>
          <span style={{ color: '#888', fontSize: '14px' }}>งานที่รับวันนี้</span>
          <h1 style={{ margin: '5px 0', color: '#ff6600' }}>{todayCount}</h1>
          <span style={{ fontSize: '12px', color: '#444' }}>ออเดอร์</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={{ color: '#888', fontSize: '14px' }}>สถานะระบบ</span>
          <h3 style={{ margin: '10px 0', color: '#00ff00' }}>● Online</h3>
        </div>
      </div>

      {/* ส่วนงานที่รอรับ (Available) */}
      <section style={{ marginBottom: '40px' }}>
        <h3 style={styles.sectionTitle}>📦 งานที่รอคนรับ ({availableOrders.length})</h3>
        {availableOrders.length === 0 ? (
          <p style={styles.emptyText}>ยังไม่มีงานใหม่เข้ามา...</p>
        ) : (
          <div style={styles.grid}>
            {availableOrders.map(o => (
              <div key={o.id} style={styles.orderCard}>
                <div style={styles.cardHead}>
                  <span>#{o.id.slice(0, 5)}</span>
                  <b style={{ color: '#ff6600' }}>฿{o.total_price}</b>
                </div>
                <p style={{ fontSize: '14px', margin: '10px 0' }}>📍 {o.address || 'ชุมชนใกล้เคียง'}</p>
                <button onClick={() => navigate(`/chat/${o.id}`)} style={styles.btnAction}>ดูรายละเอียด / รับงาน</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ส่วนประวัติงาน (History) */}
      <section>
        <h3 style={styles.sectionTitle}>🕒 ประวัติงานของคุณ</h3>
        <div style={styles.historyList}>
          {myHistory.map(o => (
            <div key={o.id} style={styles.historyItem}>
              <div>
                <div style={{ fontSize: '14px' }}>ออเดอร์ #{o.id.slice(0, 5)}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{new Date(o.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#ff6600', fontWeight: 'bold' }}>฿{o.total_price}</div>
                <button onClick={() => navigate(`/chat/${o.id}`)} style={styles.btnMini}>💬 แชท</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'Kanit' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  logoutBtn: { background: 'none', border: '1px solid #333', color: '#666', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' },
  summaryContainer: { display: 'flex', gap: '15px', marginBottom: '30px' },
  summaryCard: { flex: 1, backgroundColor: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222', textAlign: 'center' },
  sectionTitle: { borderLeft: '4px solid #ff6600', paddingLeft: '10px', marginBottom: '15px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
  orderCard: { backgroundColor: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222' },
  cardHead: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '10px' },
  btnAction: { width: '100%', padding: '10px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  historyItem: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' },
  btnMini: { marginTop: '5px', background: 'none', border: '1px solid #333', color: '#ff6600', padding: '2px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' },
  emptyText: { color: '#444', textAlign: 'center', padding: '20px' }
};

export default Rider;
