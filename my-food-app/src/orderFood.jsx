import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.jsx'; 
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const OrderFood = () => {
    const [menus, setMenus] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addr, setAddr] = useState('');
    const [note, setNote] = useState('');
    const [payMethod, setPayMethod] = useState('cash'); // 'cash' หรือ 'transfer'
    const navigate = useNavigate();

    const fetchMenus = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await supabase.from('menus').select('*');
            setMenus(data || []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchMenus(); }, [fetchMenus]);

    const addToCart = (item) => {
        const exist = cart.find(x => x.id === item.id);
        if (exist) setCart(cart.map(x => x.id === item.id ? { ...exist, qty: exist.qty + 1 } : x));
        else setCart([...cart, { ...item, qty: 1 }]);
        toast.success(`เพิ่ม ${item.name} แล้ว`);
    };

    const totalPrice = cart.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0);

    const handleOrder = async () => {
        if (cart.length === 0 || !addr.trim()) return toast.error("ข้อมูลไม่ครบ");
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const orderData = {
                    user_id: user.id, items: cart, total_price: totalPrice,
                    address: addr, note: note, lat: pos.coords.latitude, lng: pos.coords.longitude,
                    status: 'pending', payment_method: payMethod, payment_status: 'waiting'
                };
                await supabase.from('orders').insert([orderData]);
                toast.success("สั่งอาหารสำเร็จ!");
                navigate('/myorders');
            } catch (e) { toast.error("สั่งซื้อล้มเหลว"); }
        });
    };

    if (loading) return <div style={st.loader}><h2>⌛ โหลดเมนู...</h2></div>;

    return (
        <div style={st.container}>
            <Toaster />
            <header style={st.header}>
                <h2 style={{ color: '#f60' }}>🍴 FOODAPP 2026</h2>
                <button onClick={() => navigate('/myorders')} style={st.btnOut}>ประวัติการสั่ง</button>
            </header>

            <div style={st.mainGrid}>
                <div style={st.menuGrid}>
                    {menus.map(f => (
                        <div key={f.id} style={st.card}>
                            <img src={f.image_url} alt="" style={st.img} />
                            <div style={{ padding: '10px' }}>
                                <b>{f.name}</b>
                                <div style={st.row}><span>฿{f.price}</span><button onClick={() => addToCart(f)} style={st.btnAdd}>+</button></div>
                            </div>
                        </div>
                    ))}
                </div>

                <aside style={st.cartSide}>
                    <h3>🛒 ตะกร้า (฿{totalPrice})</h3>
                    <textarea placeholder="📍 ที่อยู่จัดส่ง..." value={addr} onChange={e=>setAddr(e.target.value)} style={st.input} />
                    <input placeholder="💬 ข้อความถึงไรเดอร์..." value={note} onChange={e=>setNote(e.target.value)} style={st.input} />
                    
                    <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                        <button onClick={()=>setPayMethod('cash')} style={payMethod==='cash'?st.tabAct:st.tab}>💵 เงินสด</button>
                        <button onClick={()=>setPayMethod('transfer')} style={payMethod==='transfer'?st.tabAct:st.tab}>📱 โอนจ่าย</button>
                    </div>

                    <button onClick={handleOrder} style={st.btnOrder}>ยืนยันสั่งซื้อ (จ่ายปลายทาง)</button>
                </aside>
            </div>
        </div>
    );
};

const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
    mainGrid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' },
    menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' },
    card: { background: '#111', borderRadius: '15px', overflow: 'hidden' },
    img: { width: '100%', height: '100px', objectFit: 'cover' },
    row: { display: 'flex', justifyContent: 'space-between', marginTop: '5px' },
    btnAdd: { background: '#f60', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px' },
    cartSide: { background: '#111', padding: '15px', borderRadius: '20px', height: 'fit-content', position: 'sticky', top: '20px' },
    input: { width: '100%', background: '#000', color: '#fff', border: '1px solid #333', padding: '8px', marginBottom: '10px', borderRadius: '8px' },
    btnOrder: { width: '100%', background: '#f60', color: '#fff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold' },
    tab: { flex: 1, padding: '8px', background: '#222', color: '#888', border: 'none', borderRadius: '10px' },
    tabAct: { flex: 1, padding: '8px', background: '#f60', color: '#fff', border: 'none', borderRadius: '10px' },
    btnOut: { background: '#222', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '10px' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default OrderFood;
