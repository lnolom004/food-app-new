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
        try {
            setLoading(true);
            const { data, error } = await supabase.from('menus').select('*');
            if (error) throw error;
            setMenus(data || []);
        } catch (error) {
            console.error("Fetch error:", error);
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
        if (!item) return;
        const exist = cart.find((x) => x.id === item.id);
        if (exist) {
            setCart(cart.map((x) => x.id === item.id ? { ...exist, qty: exist.qty + 1 } : x));
        } else {
            setCart([...cart, { ...item, qty: 1 }]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter((x) => x.id !== id));
    const totalPrice = cart.reduce((sum, item) => sum + (Number(item.price || 0) * (item.qty || 1)), 0);

    // 3. ฟังก์ชันสั่งอาหาร
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
                    items: cart, 
                    total_price: totalPrice,
                    address: addr.trim(),
                    lat: latitude,   
                    lng: longitude,  
                    status: 'pending'
                };

                const { error: insertError } = await supabase.from('orders').insert([orderData]);
                if (insertError) throw insertError;

                toast.success("🎉 สั่งอาหารสำเร็จ!");
                setCart([]); 
                setAddr(''); 
                navigate('/myorders'); // ใช้ตัวเล็กให้ตรงกับมาตรฐานส่วนใหญ่

            } catch (err) {
                alert("สั่งซื้อไม่สำเร็จ: " + err.message);
            } finally {
                setIsOrdering(false);
            }
        }, (err) => {
            toast.error("กรุณาเปิด GPS เพื่อสั่งอาหารครับ");
            setIsOrdering(false);
        });
    };

    // ป้องกันจอขาวขณะโหลด
    if (loading) return (
        <div style={st.loader}>
            <div style={{textAlign:'center'}}>
                <h2>⌛ กำลังโหลดความอร่อย...</h2>
                <p style={{color:'#666'}}>หากรอนานเกินไป กรุณารีเฟรชหน้าจอ</p>
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
                    {/* เพิ่มการดักจับข้อมูล NULL ใน filter */}
                    {menus && menus.filter(m => activeTab === 'ทั้งหมด' || (m?.category === activeTab)).map(f => (
                        <div key={f.id} style={st.card}>
                            <img src={f.image_url || 'https://via.placeholder.com'} alt={f.name} style={st.img} />
                            <div style={{ padding: '10px' }}>
                                <b>{f.name || 'ไม่มีชื่อสินค้า'}</b>
                                <div style={st.row}>
                                    <span style={{ color: '#f60', fontWeight: 'bold' }}>฿{f.price || 0}</span>
                                    <button onClick={() => addToCart(f)} style={st.btnAdd}>+</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {menus.length === 0 && <p style={{gridColumn:'1/-1', textAlign:'center', color:'#888'}}>ไม่พบรายการอาหารในขณะนี้</p>}
                </div>

                <aside style={st.cartSide}>
                    <h3 style={{ marginTop: 0 }}>🛒 ตะกร้า ({cart.length})</h3>
                    <div style={st.cartList}>
                        {cart.length === 0 ? <p style={{ color: '#888', textAlign: 'center' }}>หิวแล้วสั่งเลย!</p> : 
                            cart.map(item => (
                                <div key={item.id} style={st.cartItem}>
                                    <span>{item.name} x {item.qty}</span>
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
// ... ส่วนของ st (styles) ให้ใช้ของเดิมที่คุณมีได้เลยครับ ...
