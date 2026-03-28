import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase'; 
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const RiderDashboard = () => {
    const [availableJobs, setAvailableJobs] = useState([]); // รายการงานว่าง
    const [myJob, setMyJob] = useState(null); // งานที่เรากำลังทำ (ถ้ามี ข้อมูลจะเด้งมาหน้านี้)
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // --- 📥 1. ฟังก์ชันดึงข้อมูลงาน (แยกส่วนงานว่าง กับ งานของเรา) ---
    const fetchJobs = useCallback(async (currentUser) => {
        if (!currentUser) return;
        setLoading(true);
        try {
            // ดึงงานใหม่ที่สถานะเป็น 'shipping' และยังไม่มีใครรับ (rider_id เป็น null)
            const { data: available, error: err1 } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'shipping') 
                .is('rider_id', null) 
                .order('created_at', { ascending: false });

            if (err1) throw err1;
            setAvailableJobs(available || []);

            // เช็กงานปัจจุบันที่ไรเดอร์คนนี้กดรับมาแล้วแต่ยังส่งไม่เสร็จ
            const { data: current, error: err2 } = await supabase
                .from('orders')
                .select('*')
                .eq('rider_id', currentUser.id)
                .neq('status', 'completed')
                .maybeSingle(); 
            
            if (err2) throw err2;
            setMyJob(current || null); // 🌟 ถ้ามีงาน ข้อมูลจะถูกเก็บใน myJob ทันที
        } catch (e) {
            console.error("Fetch Error:", e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // --- 🔄 2. ระบบตรวจสอบ Auth และ Real-time (ทำให้งาน "เด้ง" อัตโนมัติ) ---
    useEffect(() => {
        const initRider = async () => {
            const { data: { user: u } } = await supabase.auth.getUser();
            if (!u) {
                navigate('/login');
                return;
            }
            setUser(u);
            fetchJobs(u);
        };

        initRider();

        // 📡 ตั้งค่า Real-time: ใครอัปเดตอะไรในตาราง orders หน้าจอเราจะเปลี่ยนตามทันที
        const channel = supabase.channel('rider-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                supabase.auth.getUser().then(({ data }) => {
                    if (data?.user) fetchJobs(data.user);
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchJobs, navigate]);

    // --- 🏍️ 3. ฟังก์ชัน "กดรับงาน" (หัวใจหลักที่ทำให้งานเด้งสลับหน้า) ---
    const acceptJob = async (id) => {
        if (!user) return toast.error("รอกำลังโหลดข้อมูลผู้ใช้...");
        if (myJob) return toast.error("คุณมีงานค้างอยู่! ส่งงานเก่าให้เสร็จก่อน");
        
        // 1. อัปเดต rider_id ใน Database เป็น ID ของเรา
        const { error } = await supabase
            .from('orders')
            .update({ rider_id: user.id })
            .eq('id', id)
            .is('rider_id', null); // 🛡️ ป้องกันกรณีโดนแย่งงานในเสี้ยววินาที

        if (!error) {
            toast.success("รับงานสำเร็จ! 🛵");
            // 🌟 2. สั่งดึงข้อมูลใหม่ทันที! เมื่อ myJob มีค่า หน้าจอจะเด้งสลับไปหน้า "งานปัจจุบัน" อัตโนมัติ
            await fetchJobs(user); 
        } else {
            toast.error("รับงานไม่สำเร็จ: มีคนรับไปก่อนแล้วครับ");
            await fetchJobs(user); // โหลดใหม่เพื่อให้งานที่หายไปแล้วออกไปจากหน้าจอ
        }
    };

    // --- ✅ 4. ฟังก์ชัน "ส่งสำเร็จ" (จบงาน) ---
    const completeJob = async (id) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'completed' }) 
            .eq('id', id);

        if (!error) {
            toast.success("จบงานเรียบร้อย! ยอดเงินเด้งเข้าแอดมินแล้ว 💰");
            setMyJob(null);
            await fetchJobs(user); // เด้งกลับมาหน้า "รับงานใหม่"
        } else {
            toast.error("เกิดข้อผิดพลาด: " + error.message);
        }
    };

    if (loading && !user) return <div style={st.loader}>🏍️ กำลังค้นหางานด่วน...</div>;

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            <header style={st.header}>
                <h2 style={{color:'#00ff00', margin:0}}>RIDER ONLINE</h2>
                <button onClick={() => supabase.auth.signOut()} style={st.btnOut}>Logout</button>
            </header>

            <main style={{ marginTop: '20px' }}>
                {/* 🌟 จุดตัดสินใจ: ถ้ามีงานในมือ (myJob) จะโชว์หน้าส่งของ / ถ้าไม่มีจะโชว์รายการงานว่าง */}
                {myJob ? (
                    <div style={st.activeCard}>
                        <h3 style={{marginTop:0, color:'#00ff00'}}>📍 งานปัจจุบันที่คุณกำลังนำส่ง</h3>
                        <div style={st.cardInner}>
                            <b style={{fontSize:'1.1rem'}}>ออเดอร์: #{myJob.id.slice(0,8)}</b>
                            <div style={st.infoBox}>
                                <p>💰 <b>ยอดเก็บเงินลูกค้า:</b> <span style={{color:'#f60', fontSize:'1.4rem'}}>฿{myJob.total_price || 0}</span></p>
                                <p>🏠 <b>ที่อยู่ส่งของ:</b> {myJob.address || 'กรุณาดูตามพิกัด'}</p>
                                <p>📍 <b>พิกัด:</b> {myJob.lat}, {myJob.lng}</p>
                            </div>
                            <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                                // เปลี่ยนจาก '/Chat' เป็น '/chat' (ใช้ตัวพิมพ์เล็กให้ตรงกับชื่อไฟล์และ App.jsx)
<button onClick={() => navigate('/chat', { state: { orderId: myJob.id } })} style={st.btnChat}> 💬 แชทหาลูกค้า </button>
                                <button onClick={() => completeJob(myJob.id)} style={st.btnDone}>✅ ส่งสำเร็จ (จบงาน)</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h3 style={{borderLeft:'4px solid #00ff00', paddingLeft:'10px'}}>📦 งานใหม่ที่พร้อมรับ ({availableJobs.length})</h3>
                        {availableJobs.length === 0 ? (
                            <div style={{textAlign:'center', marginTop:'80px'}}>
                                <p style={{fontSize:'40px'}}>📭</p>
                                <p style={{color:'#888'}}>ยังไม่มีงานใหม่เข้ามาในขณะนี้... <br/>ระบบจะเด้งอัตโนมัติเมื่อแอดมินส่งงานมาครับ</p>
                            </div>
                        ) : (
                            <div style={st.grid}>
                                {availableJobs.map(job => (
                                    <div key={job.id} style={st.card}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <div>
                                                <b style={{fontSize:'1.1rem'}}>ID: #{job.id.slice(0,5)}</b>
                                                <p style={{margin:'5px 0', color:'#888', fontSize:'0.9rem'}}>📍 {job.address || 'ที่อยู่ลูกค้า'}</p>
                                            </div>
                                            <b style={{color:'#00ff00', fontSize:'1.3rem'}}>฿{job.total_price || 0}</b>
                                        </div>
                                        <button onClick={() => acceptJob(job.id)} style={st.btnAccept}>🏍️ กดรับงานนี้</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

// --- CSS Styles (ปรับปรุงให้อ่านข้อมูลลูกค้าได้ชัดเจน) ---
const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Kanit, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    activeCard: { background: '#111', padding: '25px', borderRadius: '25px', border: '2px solid #00ff00' },
    cardInner: { background: '#000', padding: '20px', borderRadius: '15px', marginTop: '15px' },
    infoBox: { marginTop: '10px', borderTop: '1px solid #222', paddingTop: '15px', lineHeight: '1.8' },
    grid: { display: 'flex', flexDirection: 'column', gap: '15px' },
    card: { background: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222' },
    btnAccept: { width: '100%', background: '#00ff00', color: '#000', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' },
    btnDone: { flex: 2, background: '#f60', color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
    btnChat: { flex: 1, background: '#333', color: '#fff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
    btnOut: { background: 'none', color: '#888', border: '1px solid #333', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' },
    loader: { height: '100vh', background: '#000', color: '#00ff00', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }
};

export default RiderDashboard;
