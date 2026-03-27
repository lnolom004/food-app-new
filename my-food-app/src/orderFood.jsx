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

    // 1. ดึงเมนูอาหารจากฐานข้อมูล
    const fetchMenus = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('menus').select('*');
            if (error) throw error;
            setMenus(data || []);
        } catch (error) {
            console.error("Fetch Error:", error.message);
            toast.error("โหลดข้อมูลเมนูไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    // 2. จัดการตะกร้าสินค้า
    const addToCart = (item) => {
        const exist = cart.find((x) => x.id === item.id);
        if (exist) {
            setCart(cart.map((x) => x.id === item.id ? { ...exist, qty: exist.qty + 1 } : x));
        } else {
            setCart([...cart, { ...item, qty: 1 }]);
        }
        toast.success(`เพิ่ม ${item.name} แล้ว`);
    };

    const removeFromCart = (id) => {
        setCart(cart.filter((x) => x.id !== id));
    };

    // 💥 คำนวณราคารวม (เฉพาะค่าอาหารเพียวๆ ไม่มีค่าส่ง)
    const totalPrice = cart.reduce((sum, item) => sum + (Number(item.price) * item.qty), 0);

    // 3. ฟังก์ชันสั่งอาหาร (ส่งข้อมูลลงตาราง orders)
    const handleOrder = async () => {
        if (cart.length === 0) return toast.error("กรุณาเลือกอาหารก่อนสั่งครับ");
        if (!addr.trim()) return toast.error("กรุณาระบุที่อยู่จัดส่ง");

        setIsOrdering(true);
        try {
            // เช็คผู้ใช้ที่ล็อกอินอยู่
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("เซสชันหมดอายุ กรุณาล็อกอินใหม่");
                return navigate('/login');
            }

            // เตรียมข้อมูลให้ตรงกับโครงสร้างตาราง orders
            const orderData = {
                user_id: user.id,
                items: cart, // เก็บรายการอาหารทั้งหมดเป็น JSONB
                total_price: totalPrice, // 💡 ใช้ snake_case ตามฐานข้อมูล
                address: addr,
                status: 'pending',
                payment_method: 'cash'
            };

            const { error } = await supabase.from('orders').insert([orderData]);

            if (error) {
                // ถ้าติด RLS หรือชื่อคอลัมน์ผิด จะโชว์ Alert ตรงนี้
                console.error("Insert Error:", error);
                alert("สั่งซื้อไม่สำเร็จ: " + error.message);
            } else {
                alert("🎉 สั่งอาหารสำเร็จแล้ว! (ฟรีค่าส่ง ฿0)");
                setCart([]); // ล้างตะกร้า
                setAddr(''); // ล้างที่อยู่
            }

        } catch (error) {
            alert("ระบบขัดข้อง: " + error.message);
        } finally {
            setIsOrdering(false);
        }
    };

    const filteredMenus = activeTab === 'ทั้งหมด' 
        ? menus 
        : menus.filter(m => m.category === activeTab);

    if (loading) return <div style={st.loader}>⌛ กำลังโหลดความอร่อย...</div>;

    return (
        <div style={st.container}>
            <Toaster position="top-center" />
            
            <header style={st.header}>
                <h2 style={{ margin: 0, color: '#f60' }}>🍴 FOODAPP PRO 2026</h2>
                <button onClick={() => supabase.auth.signOut()} style={st.btnOut}>Logout</button>
            </header>

            {/* ส่วนหมวดหมู่ */}
            <div style={st.tabBar}>
                {categories.map(c => (
                    <button key={c} onClick={() => setActiveTab(c)} style={activeTab === c ? st.tabAct : st.tab}>{c}</button>
                ))}
            </div>

            <div style={st.mainGrid}>
                {/* รายการเมนูอาหาร */}
                <div style={st.menuGrid}>
                    {filteredMenus.map(f => (
                        <div key={f.id} style={st.card}>
                            <img src={f.image_url || 'https://via.placeholder.com'} alt={f.name} style={st.img} />
                            <div style={{ padding: '10px' }}>
                                <b style={{ display: 'block', fontSize: '15px' }}>{f.name}</b>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                    <span style={{ color: '#f60', fontWeight: 'bold' }}>฿{f.price}</span>
                                    <button onClick={() => addToCart(f)} style={st.btnAdd}>+</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ตะกร้าสินค้าและการสั่งซื้อ */}
                <aside style={st.cartSide}>
                    <h3 style={{ marginTop: 0 }}>🛒 ตะกร้าสินค้า ({cart.length})</h3>
                    <div style={st.cartList}>
                        {cart.length === 0 ? <p style={{ color: '#555', textAlign: 'center' }}>หิวแล้วก็เลือกเลย!</p> : 
                            cart.map(item => (
                                <div key={item.id} style={st.cartItem}>
                                    <span>{item.name} x {item.qty}</span>
                                    <button onClick={() => removeFromCart(item.id)} style={st.btnDel}>🗑️</button>
                                </div>
                            ))
                        }
                    </div>

                    <textarea 
                        placeholder="ระบุที่อยู่ส่งอาหาร..."
                        value={addr}
                        onChange={(e) => setAddr(e.target.value)}
                        style={st.input}
                    />

                    {/* สรุปราคาที่ไม่มีค่าจัดส่ง */}
                    <div style={{ margin: '15px 0', borderTop: '1px solid #222', paddingTop: '10px' }}>
                        <div style={st.row}><span>ค่าอาหาร:</span><span>฿{totalPrice}</span></div>
                        <div style={st.row}><span style={{color:'#00ff00'}}>ค่าจัดส่ง:</span><span style={{color:'#00ff00'}}>฿0</span></div>
                    </div>

                    <button 
                        onClick={handleOrder} 
                        disabled={isOrdering || cart.length === 0}
                        style={{ ...st.btnOrder, opacity: (isOrdering || cart.length === 0) ? 0.5 : 1 }}
                    >
                        {isOrdering ? 'กำลังบันทึก...' : `สั่งเลย (รวม ฿${totalPrice})`}
                    </button>
                </aside>
            </div>
        </div>
    );
};

const st = {
    container: { background: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'Kanit, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    btnOut: { background: 'none', border: '1px solid #333', color: '#888', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer' },
    tabBar: { display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', justifyContent: 'center' },
    tab: { padding: '8px 20px', background: '#111', border: 'none', color: '#888', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap' },
    tabAct: { padding: '8px 20px', background: '#f60', border: 'none', color: '#fff', borderRadius: '20px', fontWeight: 'bold', whiteSpace: 'nowrap' },
    mainGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' },
    menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' },
    card: { background: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222' },
    img: { width: '100%', height: '120px', objectFit: 'cover' },
    btnAdd: { background: '#f60', color: '#fff', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' },
    cartSide: { background: '#111', padding: '20px', borderRadius: '20px', height: 'fit-content', position: 'sticky', top: '20px', border: '1px solid #222' },
    cartList: { marginBottom: '15px', maxHeight: '200px', overflowY: 'auto' },
    cartItem: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px', background: '#000', padding: '8px', borderRadius: '8px' },
    btnDel: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' },
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '14px' },
    input: { width: '100%', background: '#000', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '10px', marginBottom: '10px', boxSizing: 'border-box', minHeight: '80px' },
    btnOrder: { width: '100%', background: '#f60', color: '#fff', border: 'none', padding: '15px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
    loader: { height: '100vh', background: '#000', color: '#f60', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default OrderFood;
