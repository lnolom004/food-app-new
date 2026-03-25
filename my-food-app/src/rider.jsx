import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

const Rider = () => {
  const [activeJobs, setActiveJobs] = useState([]); // งานที่แอดมินส่งมาให้ (กำลังส่ง)
  const [history, setHistory] = useState([]);       // ประวัติงานที่สำเร็จแล้ว
  const [todayStats, setTodayStats] = useState({ count: 0, earnings: 0 });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. เริ่มต้นระบบ
  useEffect(() => {
    const initRider = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchRiderData(user.id);

        // ฟังการอัปเดต Realtime (เมื่อแอดมินกดส่งงานมา งานต้องเด้งทันที)
        const channel = supabase.channel('rider-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
            fetchRiderData(user.id);
          }).subscribe();

        return () => supabase.removeChannel(channel);
      }
    };
    initRider();
  }, []);

  // 2. ดึงข้อมูลงาน (เฉพาะที่ Assign ให้เรา)
  const fetchRiderData = async (riderId) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('rider_id', riderId) // ดึงเฉพาะงานที่มีชื่อเรา
      .order('created_at', { ascending: false });

    if (!error) {
      // แยกประเภทงาน
      const active = data.filter(o => o.status === 'shipping');
      const finished = data.filter(o => o.status === 'completed');
      
      setActiveJobs(active);
      setHistory(finished);

      // คำนวณสถิติวันนี้
      const today = new Date().toISOString().split('T')[0];
      const todayJobs = finished.filter(o => o.created_at.startsWith(today));
      setTodayStats({
        count: todayJobs.length,
        earnings: todayJobs.reduce((sum, o) => sum + (o.total_price || 0), 0)
      });
    }
    setLoading(false);
  };

  // 3. ฟังก์ชันปิดงาน (ส่งสำเร็จ)
  const handleCompleteOrder = async (orderId) => {
    if (window.confirm("ยืนยันว่าส่งอาหารสำเร็จแล้วใช่หรือไม่?")) {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (!error) {
        alert("🎉 ปิดงานสำเร็จ! เก่งมากครับ");
        fetchRiderData(user.id);
      }
    }
  };

  // 4. ฟังก์ชันนำทาง GPS
  const openNavigation = (lat, lng) => {
    if (!lat || !lng) return alert("ขออภัย ลูกค้าไม่ได้ระบุพิกัด GPS");
    window.open(`https://www.google.com{lat},${lng}`, '_blank');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) return <div style={styles.loading}>กำลังโหลดข้อมูลไรเดอร์...</div>;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h2 style={{ color: '#ff6600', margin: 0 }}>🛵 Rider Dashboard</h2>
          <small style={{ color: '#666' }}>Rider: {user?.email}</small>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>ออกจากระบบ</button>
      </header>

      {/* สรุปงานวันนี้ */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <small style={{ color: '#888' }}>งานสำเร็จวันนี้</small>
          <h2 style={{ color: '#ff6600', margin: '5px 0' }}>{todayStats.count}</h2>
        </div>
        <div style={styles.statCard}>
          <small style={{ color: '#888' }}>ยอดเงินวันนี้</small>
          <h2 style={{ color: '#00ff00', margin: '5px 0' }}>฿{todayStats.earnings}</h2>
        </div>
      </div>

      {/* --- ส่วนที่ 1: งานปัจจุบัน (แอดมินส่งมาให้) --- */}
      <section style={{ marginBottom: '40px' }}>
        <h3 style={styles.sectionTitle}>📦 งานที่ต้องจัดส่ง ({activeJobs.length})</h3>
        {activeJobs.length === 0 ? (
          <div style={styles.emptyCard}>ยังไม่มีงานใหม่ที่ได้รับมอบหมาย</div>
        ) : (
          activeJobs.map(job => (
            <div key={job.id} style={styles.activeCard}>
              <div style={styles.cardHeader}>
                <span>ID: #{job.id.slice(0, 8)}</span>
                <span style={styles.priceTag}>฿{job.total_price}</span>
              </div>
              
              <div style={styles.infoBox}>
                <p>📍 <b>ที่อยู่:</b> {job.address || 'ชุมชนใกล้เคียง'}</p>
                <p>📝 <b>สถานะ:</b> <span style={{color: '#ffcc00'}}>กำลังจัดส่ง</span></p>
              </div>

              <div style={styles.btnGrid}>
                <button onClick={() => navigate(`/chat/${job.id}`)} style={styles.chatBtn}>💬 แชท</button>
                <button onClick={() => openNavigation(job.lat, job.lng)} style={styles.navBtn}>🗺️ นำทาง</button>
              </div>
              
              <button onClick={() => handleCompleteOrder(job.id)} style={styles.completeBtn}>✅ ส่งสำเร็จ / ปิดงาน</button>
            </div>
          ))
        )}
      </section>

      {/* --- ส่วนที่ 2: ประวัติงานย้อนหลัง --- */}
      <section>
        <h3 style={styles.sectionTitle}>🕒 ประวัติงานล่าสุด</h3>
        <div style={styles.historyList}>
          {history.length === 0 ? <p style={{color: '#444', textAlign: 'center'}}>ยังไม่มีประวัติงาน</p> : 
            history.slice(0, 5).map(h => (
              <div key={h.id} style={styles.historyItem}>
                <div>
                  <p style={{ margin: 0 }}>#{h.id.slice(0, 5)} - {h.address}</p>
                  <small style={{ color: '#555' }}>{new Date(h.created_at).toLocaleString()}</small>
                </div>
                <div style={{ color: '#00ff00', fontWeight: 'bold' }}>+฿{h.total_price}</div>
              </div>
            ))
          }
        </div>
      </section>
    </div>
  );
};

// --- Styles (Professional Dark Theme) ---
const styles = {
  container: { backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: "'Kanit', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid #222', paddingBottom: '15px' },
  logoutBtn: { background: 'none', border: '1px solid #333', color: '#666', padding: '6px 15px', borderRadius: '20px', cursor: 'pointer' },
  loading: { backgroundColor: '#000', color: '#ff6600', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  
  statsRow: { display: 'flex', gap: '10px', marginBottom: '30px' },
  statCard: { flex: 1, backgroundColor: '#111', padding: '15px', borderRadius: '15px', border: '1px solid #222', textAlign: 'center' },

  sectionTitle: { borderLeft: '4px solid #ff6600', paddingLeft: '12px', fontSize: '18px', marginBottom: '15px' },
  activeCard: { backgroundColor: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #ff6600', marginBottom: '20px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' },
  priceTag: { backgroundColor: '#ff6600', color: '#fff', padding: '2px 10px', borderRadius: '8px', fontWeight: 'bold' },
  infoBox: { backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '10px', marginBottom: '15px', fontSize: '14px' },
  
  btnGrid: { display: 'flex', gap: '10px', marginBottom: '10px' },
  chatBtn: { flex: 1, padding: '10px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  navBtn: { flex: 1, padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  completeBtn: { width: '100%', padding: '12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },

  emptyCard: { textAlign: 'center', padding: '30px', color: '#444', backgroundColor: '#111', borderRadius: '15px', border: '1px dashed #333' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  historyItem: { backgroundColor: '#111', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #222' }
};

export default Rider;
