import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.jsx'; 
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchOrders = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            setOrders(data || []);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchOrders(); }, []);

    const cancelOrder = async (id) => {
        if (!window.confirm("ยกเลิกออเดอร์?")) return;
        await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id).eq('status', 'pending');
        fetchOrders();
    };

    if (loading) return <div style={{background:'#000', height:'100vh'}} />;

    return (
        <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '20px' }}>
            <Toaster />
            <button onClick={() => navigate('/menu')} style={{background:'#222', color:'#fff', border:'none', padding:'10px', borderRadius:'10px', marginBottom:'20px'}}>⬅️ กลับ</button>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                {orders.map(order => (
                    <div key={order.id} style={{ background: '#111', padding: '15px', borderRadius: '15px', marginBottom: '15px', border: '1px solid #333' }}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <b style={{color: '#f60'}}>{order.status.toUpperCase()}</b>
                            <span>฿{order.total_price} ({order.payment_method === 'cash' ? 'เงินสด' : 'โอนจ่าย'})</span>
                        </div>
                        <p style={{fontSize:'12px', color:'#888'}}>{order.address}</p>
                        
                        {order.status === 'pending' && <button onClick={() => cancelOrder(order.id)} style={{background:'#f44336', color:'#fff', border:'none', padding:'5px 10px', borderRadius:'5px'}}>❌ ยกเลิก</button>}
                        
                        {/* 🛵 ส่วนติดต่อไรเดอร์ */}
                        {order.rider_id && order.status !== 'completed' && (
                            <div style={{marginTop:'10px', padding:'10px', background:'#222', borderRadius:'10px', border:'1px solid #4caf50'}}>
                                <p style={{margin:0, fontSize:'13px'}}>🛵 ไรเดอร์กำลังมาส่ง...</p>
                                <button onClick={() => window.location.href=`tel:0000000000`} style={{background:'#4caf50', color:'#fff', border:'none', padding:'8px', width:'100%', borderRadius:'8px', marginTop:'5px'}}>📞 โทรหาคนขับ</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MyOrders;
