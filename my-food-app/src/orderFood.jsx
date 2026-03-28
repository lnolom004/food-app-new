import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase.jsx'; 
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const OrderFood = () => {
    const [menus, setMenus] = useState([]);
    const [cart, setCart] = useState([]);
    const [activeTab, setActiveTab] = useState('ทั้งหมด');
    const [loading, setLoading] = useState(true);
    const [isOrdering, setIsOrdering] = useState(false);
    const [addr, setAddr] = useState('');
    const navigate = useNavigate();

    const categories = ['ทั้งหมด', 'อาหาร', 'ของหวาน', 'เครื่องดื่ม'];

    // 1. 📂 ดึงข้อมูลเมนูจาก Supabase (แก้จุดดึงข้อมูลไม่ได้)
    const fetchMenus = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('menus').select('*');
            if (error) throw error;
            setMenus(data || []);
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("โหลดข้อมูลเมนูไม่สำเร็จ เช็คสิทธิ์ RLS ใน Supabase");
        } finally {
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    // 2. 🛒 ระบบจัดการตะกร้าสินค้า
    const addToCart = (item) => {
        if (!item) return;
        const exist = cart.find((x) => x.id === item.id);
        if (exist) {
            setCart(cart.map((x) => x.id === item.id ? { ...exist, qty: exist.qty + 1 } : x));
        } else {
            setCart([...cart, { ...item, qty: 1 }]);
        }
        toast.success(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`);
    };

    const removeFromCart = (id) => {
        setCart(cart.filter((x) => x.id !== id));
        toast.error("ลบรายการออกแล้ว");
    };

    const totalPrice = cart.reduce((sum, item) => sum + (Number(item?.price || 0) * (item?.qty || 1)), 0);

    // 3. 📍 ระบบสั่งซื้อและปักหมุด GPS (แก้จุดบันทึกข้อมูลไม่ได้)
    const handleOrder = async () => {
        if (cart.length === 0) return toast.error("กรุณาเลือกอาหารก่อนครับ");
        if (!addr.trim()) return toast.error("กรุณาระบุที่อยู่จัดส่ง");

        setIsOrdering(true);

        // ขอพิกัดจากเครื่องลูกค้า
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;

            try {
                // ดึงข้อมูล User ปัจจุบัน
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    toast.error("เซสชันหมดอายุ กรุณาล็อกอินใหม่");
                    return navigate('/login');
                }

                // เตรียมข้อมูลส่งเข้า Table 'orders'
                const orderData = {
                    user_id: user.id,
                    items: cart, // เก็บรายการอาหารแบบ JSON
                    total_price: totalPrice,
                    address: addr.trim(),
                    lat: latitude,   
                    lng: longitude,  
                    status: 'pending'
                };

                const { error: insertError } = await supabase.from('orders').insert([orderData]);
                if (insertError) throw insertError;

                toast.success("🎉 สั่งอาหารสำเร็จ! รอไรเดอร์มารับนะครับ");
                setCart([]); 
                setAddr(''); 
                navigate('/myorders'); 

            } catch (err) {
                alert("สั่งซื้อไม่สำเร็จ: " + err.message);
            } finally {
                setIsOrdering(false);
            }
        }, (err) => {
            toast.error("กรุณาเปิด GPS เพื่อความแม่นยำในการส่งครับ");
            setIsOrdering(false);
        });
    };

    // 🛡️ ป้องกันจอขาวขณะโหลด (Fallback UI)
    if (loading) return (
        <div style={{ background: '#000', height: '100vh', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <div>
                <h2 style={{ fontSize: '2rem' }}>⌛ กำลังโหลดความอร่อย...</h2>
                <p style={{ color: '#666' }}>หากรอนานเกินไป กรุณารีเฟรชหน้าจอ</p>
            </div>
        </div>
    );

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            
            {/* ส่วนหัวแอป */}
            <header style={st.header}>
                <h2 style={{ color: '#f60', margin: 0 }}>🍴 FOODAPP 2026</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/myorders')} style={st.btnHeader}>📦 ประวัติการสั่ง</button>
                    <button onClick={() => supabase.auth.signOut()} style={st.btnOut}>Logout</button>
                </div>
            </header>

            {/* แถบเลือกหมวดหมู่ */}
            <div style={st.tabBar}>
                {categories.map(c => (
                    <button key={c} onClick={() => setActiveTab(c)} style={activeTab === c ? st.tabAct : st.tab}>{c}</button>
                ))}
            </div>

            <div style={st.mainGrid}>
                {/* รายการเมนูอาหาร */}
                <div style={st.menuGrid}>
                    {menus && menus.filter(m => activeTab === 'ทั้งหมด' || m?.category === activeTab).map(f => (
                        <div key={f.id} style={st.card}>
                            <img src={f?.image_url || 'https://via.placeholder.com'} alt={f?.name} style={st.img} />
                            <div style={{ padding: '12px' }}>
                                <b style={{ fontSize: '1.1rem' }}>{f?.name || 'ไม่มีชื่อสินค้า'}</b>
                                <div style={st.row}>
                                    <span style={{ color: '#f60', fontWeight: 'bold', fontSize: '1.2rem' }}>฿{f?.price || 0}</span>
                                    <button onClick={() => addToCart(f)} style={st.btnAdd}>+</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {menus.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>ไม่พบรายการอาหารในหมวดนี้</p>}
                </div>

                {/* ตะกร้าสินค้าด้านข้าง */}
                <aside style={st.cartSide}>
                    <h3 style={{ marginTop: 0 }}>🛒 ตะกร้าของคุณ ({cart.length})</h3>
                    <div style={st.cartList}>
                        {cart.length === 0 ? <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>ยังไม่มีสินค้าในตะกร้า</p> : 
                            cart.map(item => (
                                <div key={item.id} style={st.cartItem}>
                                    <span>{item?.name} x {item?.qty}</span>
                                    <button onClick={() => removeFromCart(item.id)} style={st.btnDel}>🗑️</button>
                                </div>
                            ))
                        }
                    </div>

                    <textarea 
                        placeholder="ระบุบ้านเลขที่/จุดสังเกต ให้ไรเดอร์..." 
                        value={addr} 
                        onChange={(e)=>setAddr(e.target.value)} 
                        style={st.input} 
                    />

                    <div style={{ margin: '15px 0', borderTop: '1px solid #333', paddingTop: '10px' }}>
                        <div style={st.row}><span>ราคารวมทั้งหมด:</span><b style={{fontSize:'22px', color:'#f60'}}>฿{totalPrice}</b></div>
                    </div>

                    <button 
                        onClick={handleOrder} 
                        disabled={isOrdering || cart.length === 0} 
                        style={{ ...st.btnOrder, opacity: (isOrdering || cart.length === 0) ? 0.5 : 1 }}
                    >
                        {isOrdering ? '📦 กำลังส่งคำสั่งซื้อ...' : `สั่งอาหารเลย ฿${totalPrice}`}
                    </button>
                </aside>
            </div>
        </div>
    );
};

// สไตล์ CSS แบบ Object (ปรับปรุงให้รองรับมือถือด้วย)
const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '15px', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 10px' },
    btnHeader: { background: '#333', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' },
    btnOut: { background: '#f44336', border: 'none', color: '#fff', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px' },
    tabBar: { display: 'flex', gap: '8px', marginBottom: '25px', justifyContent: 'flex-start', overflowX: 'auto', paddingBottom: '10px' },
    tab: { padding: '8px 18px', background: '#1a1a1a', border: '1px solid #333', color: '#888', borderRadius: '25px', cursor: 'pointer', whiteSpace: 'nowrap' },
    tabAct: { padding: '8px 18px', background: '#f60', border: 'none', color: '#fff', borderRadius: '25px', fontWeight: 'bold', whiteSpace: 'nowrap' },
    mainGrid: { display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' },
    menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' },
    card: { background: '#111', borderRadius: '18px', overflow: 'hidden', border: '1px solid #222', transition: '0.3s' },
    img: { width: '100%', height: '140px', objectFit: 'cover' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
    btnAdd: { background: '#f60', color: '#fff', border: 'none', width: '35px', height: '35px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', fontSize: '20px' },
    cartSide: { background: '#111', padding: '20px', borderRadius: '20px', height: 'fit-content', position: 'sticky', top: '20px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    cartList: { marginBottom: '15px', maxHeight: '250px', overflowY: 'auto' },
    cartItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', background: '#000', padding: '12px', borderRadius: '12px', border: '1px solid #222' },
    btnDel: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' },
    input: { width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: '15px', borderRadius: '12px', marginBottom: '15px', boxSizing: 'border-box', minHeight: '100px', fontSize: '14px' },
    btnOrder: { width: '100%', background: 'linear-gradient(45deg, #f60, #ff8c00)', color: '#fff', border: 'none', padding: '18px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '18px', boxShadow: '0 5px 15px rgba(255, 102, 0, 0.3)' }
};

export default OrderFood;
