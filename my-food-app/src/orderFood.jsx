import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase'; 
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

    // 1. ดึงข้อมูลเมนูอาหาร
    const fetchMenus = useCallback(async () => {
        console.log("--- เริ่มดึงข้อมูลเมนู ---");
        try {
            setLoading(true);
            const { data, error } = await supabase.from('menus').select('*');
            if (error) throw error;
            setMenus(data || []);
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("โหลดข้อมูลเมนูไม่สำเร็จ");
        } finally {
            // ✅ มั่นใจว่า Loading จะหายไปแน่นอน ไม่ว่าจะสำเร็จหรือพัง
            setLoading(false); 
            console.log("--- จบการดึงข้อมูลเมนู ---");
        }
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    // 2. จัดการตะกร้าสินค้า
    const addToCart = (item) => {
        if (!item) return;
        const exist = cart.find((x) => x.id === item.id);
        if (exist) {
            setCart(cart.map((x) => x.id === item.id ? { ...exist, qty: exist.qty + 1 } : x));
        } else {
            setCart([...cart, { ...item, qty: 1 }]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter((x) => x.id !== id));
    const totalPrice = cart.reduce((sum, item) => sum + (Number(item?.price || 0) * (item?.qty || 1)), 0);

    // 3. 📍 ฟังก์ชันสั่งอาหาร
    const handleOrder = async () => {
        if (cart.length === 0) return toast.error("กรุณาเลือกอาหารก่อนครับ");
        if (!addr.trim()) return toast.error("กรุณาระบุที่อยู่จัดส่ง");

        setIsOrdering(true);

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;

            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    toast.error("เซสชันหมดอายุ กรุณาล็อกอินใหม่");
                    return navigate('/login');
                }

                const orderData = {
                    user_id: user.id,
                    items: JSON.parse(JSON.stringify(cart)), 
                    total_price: totalPrice,
                    address: addr.trim(),
                    lat: latitude,   
                    lng: longitude,  
                    status: 'pending',
                    rider_id: null   
                };

                const { error: insertError } = await supabase
                    .from('orders')
                    .insert([orderData]);

                if (insertError) throw insertError;

                toast.success("🎉 สั่งอาหารสำเร็จ!");
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

    // 🛡️ ป้องกันจอขาวขณะโหลด (ใช้ l ตัวเล็ก และดักสไตล์ให้ชัวร์)
    if (loading) return (
        <div style={{ background: '#000', height: '100vh', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div>
                <h2>⌛ กำลังโหลดความอร่อย...</h2>
                <p style={{ color: '#666' }}>หากรอนานเกินไป กรุณารีเฟรชหน้าจอ</p>
            </div>
        </div>
    );

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            <header style={st.header}>
                <h2 style={{ color: '#f60', margin: 0 }}>🍴 FOODAPP 2026</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => navigate('/myorders')} style={st.btnOut}>รายการสั่งซื้อ</button>
                    <button onClick={() => supabase.auth.signOut()} style={st.btnOut}>Logout</button>
                </div>
            </header>

            <div style={st.tabBar}>
                {categories.map(c => (
                    <button key={c} onClick={() => setActiveTab(c)} style={activeTab === c ? st.tabAct : st.tab}>{c}</button>
                ))}
            </div>

            <div style={st.mainGrid}>
                <div style={st.menuGrid}>
                    {/* ✅ เพิ่มการเช็คค่า NULL ด้วย Optional Chaining (?.) */}
                    {menus && menus.filter(m => activeTab === 'ทั้งหมด' || m?.category === activeTab).map(f => (
                        <div key={f.id} style={st.card}>
                            <img src={f?.image_url || 'https://via.placeholder.com'} alt={f?.name} style={st.img} />
                            <div style={{ padding: '10px' }}>
                                <b>{f?.name || 'ไม่มีชื่อสินค้า'}</b>
                                <div style={st.row}>
                                    <span style={{ color: '#f60', fontWeight: 'bold' }}>฿{f?.price || 0}</span>
                                    <button onClick={() => addToCart(f)} style={st.btnAdd}>+</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {menus.length === 0 && <p style={{gridColumn:'1/-1', textAlign:'center', color:'#888'}}>ไม่มีรายการอาหาร</p>}
                </div>

                <aside style={st.cartSide}>
                    <h3 style={{ marginTop: 0 }}>🛒 ตะกร้า ({cart.length})</h3>
                    <div style={st.cartList}>
                        {cart.length === 0 ? <p style={{ color: '#888', textAlign: 'center' }}>หิวแล้วสั่งเลย!</p> : 
                            cart.map(item => (
                                <div key={item.id} style={st.cartItem}>
                                    <span>{item?.name} x {item?.qty}</span>
                                    <button onClick={() => removeFromCart(item.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#f44336'}}>🗑️</button>
                                </div>
                            ))
                        }
                    </div>

                    <textarea 
                        placeholder="ระบุบ้านเลขที่/จุดสังเกต..." 
                        value={addr} 
                        onChange={(e)=>setAddr(e.target.value)} 
                        style={st.input} 
                    />

                    <div style={{ margin: '15px 0', borderTop: '1px solid #222', paddingTop: '10px' }}>
                        <div style={st.row}><span>ราคารวม:</span><b style={{fontSize:'18px', color:'#f60'}}>฿{totalPrice}</b></div>
                    </div>

                    <button 
                        onClick={handleOrder} 
                        disabled={isOrdering || cart.length === 0} 
                        style={{ ...st.btnOrder, opacity: (isOrdering || cart.length === 0) ? 0.5 : 1 }}
                    >
                        {isOrdering ? 'กำลังบันทึก...' : `ยืนยันสั่งซื้อ ฿${totalPrice}`}
                    </button>
                </aside>
            </div>
        </div>
    );
};

const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    btnOut: { background: '#222', border: 'none', color: '#fff', padding: '5px 15px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px' },
    tabBar: { display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center', overflowX: 'auto' },
    tab: { padding: '8px 20px', background: '#111', border: 'none', color: '#888', borderRadius: '20px', cursor: 'pointer' },
    tabAct: { padding: '8px 20px', background: '#f60', border: 'none', color: '#fff', borderRadius: '20px', fontWeight: 'bold' },
    mainGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' },
    menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' },
    card: { background: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222' },
    img: { width: '100%', height: '120px', objectFit: 'cover' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' },
    btnAdd: { background: '#f60', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' },
    cartSide: { background: '#111', padding: '20px', borderRadius: '20px', height: 'fit-content', position: 'sticky', top: '20px', border: '1px solid #222' },
    cartList: { marginBottom: '15px', maxHeight: '200px', overflowY: 'auto' },
    cartItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', background: '#000', padding: '10px', borderRadius: '10px' },
    input: { width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' },
    btnOrder: { width: '100%', background: '#f60', color: '#fff', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }
};

export default OrderFood;
