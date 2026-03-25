import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { useNavigate } from 'react-router-dom';

// 1. กำหนดค่าส่งตามชุมชน
const DELIVERY_ZONES = {
  "ชุมชนใกล้เคียง": 15,
  "หมู่บ้านจัดสรร A": 25,
  "นอกเขตหอพัก": 40
};

const OrderFood = () => {
  const [foods, setFoods] = useState([]);
  const [cart, setCart] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);
  
  // --- ฟังก์ชันใหม่: ชุมชน, วิธีจ่ายเงิน, พิกัด ---
  const [selectedZone, setSelectedZone] = useState("");
  const [payMethod, setPayMethod] = useState('cash'); // 'cash' หรือ 'qr'
  const [adminQr, setAdminQr] = useState('');
  const [location, setLocation] = useState({ lat: null, lng: null });
  
  const navigate = useNavigate();
  const categories = ["ทั้งหมด", "อาหาร", "เครื่องดื่ม", "ของหวาน"];

  // 2. ดึงข้อมูลครบวงจร (เมนู, QR Code, ประวัติสั่งซื้อ)
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ดึงเมนูอาหาร
    const { data: menuData } = await supabase.from('menus').select('*').order('created_at', { ascending: false });
    setFoods(menuData || []);

    // ดึง QR Code จากแอดมิน (ตาราง settings)
    const { data: qrData } = await supabase.from('settings').select('value').eq('key', 'admin_qr_url').maybeSingle();
    if (qrData) setAdminQr(qrData.value);

    // ดึงประวัติออเดอร์ของตัวเอง (รวมคอลัมน์ is_reviewed เพื่อเช็คปุ่มรีวิว)
    const { data: orderData } = await supabase.from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyOrders(orderData || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    
    // ขอพิกัด GPS เพื่อส่งให้ไรเดอร์
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });

    // ระบบ Realtime: อัปเดตสถานะอัตโนมัติเมื่อแอดมินหรือไรเดอร์ขยับงาน
    const sub = supabase.channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [fetchData]);

  // 3. จัดการตะกร้าสินค้า
  const addToCart = (food) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === food.id);
      if (existing) return prev.map(item => item.id === food.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...food, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  // 4. ฟังก์ชันยืนยันสั่งซื้อ
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("กรุณาเลือกอาหารก่อนครับ");
    if (!selectedZone) return alert("โปรดเลือกพื้นที่จัดส่ง");

    const { data: { user } } = await supabase.auth.getUser();
    const foodPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const deliveryFee = DELIVERY_ZONES[selectedZone];
    const totalPrice = foodPrice + deliveryFee;

    const { error } = await supabase.from('orders').insert([{
      user_id: user.id,
      items: cart,
      food_price: foodPrice,
      delivery_fee: deliveryFee,
      total_price: totalPrice,
      address: selectedZone,
      payment_method: payMethod,
      payment_status: payMethod === 'qr' ? 'waiting_verify' : 'pending',
      status: 'pending',
      lat: location.lat,
      lng: location.lng
    }]);

    if (!error) {
      alert("สั่งอาหารสำเร็จ! 🎉");
      setCart([]);
      fetchData();
    }
  };

  // กรองเมนูค้นหา
  const filteredFoods = foods.filter(f => 
    (selectedCategory === "ทั้งหมด" || f.category === selectedCategory) &&
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={styles.loader}>🍔 กำลังเตรียมเมนูอร่อย...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={{color:'#ff6600', margin:0}}>🍔 FoodApp Pro</h2>
        <button onClick={() => supabase.auth.signOut()} style={styles.logoutBtn}>ออกจากระบบ</button>
      </header>

      {/* ช่องค้นหา */}
      <input 
        placeholder="🔍 ค้นหาเมนูอาหาร..." 
        style={styles.searchInput} 
        onChange={(e) => setSearchTerm(e.target.value)} 
      />

      {/* หมวดหมู่ */}
      <div style={styles.categoryBar}>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setSelectedCategory(cat)}
            style={{...styles.catBtn, backgroundColor: selectedCategory === cat ? '#ff6600' : '#222'}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid แสดงอาหาร */}
      <div style={styles.foodGrid}>
        {filteredFoods.map(food => (
          <div key={food.id} style={styles.card}>
            <img src={food.image_url} style={styles.foodImg} alt="" />
            <div style={styles.cardBody}>
              <h4 style={{margin: '5px 0'}}>{food.name}</h4>
              <p style={{color:'#ff6600', fontWeight:'bold'}}>฿{food.price}</p>
              <button onClick={() => addToCart(food)} style={styles.addBtn}>+ เพิ่ม</button>
            </div>
          </div>
        ))}
      </div>

      {/* ตะกร้าและส่วนสรุปยอด (แสดงเฉพาะตอนมีของในตะกร้า) */}
      {cart.length > 0 && (
        <div style={styles.cartBox}>
          <h3>🛒 รายการสั่งซื้อ</h3>
          {cart.map(item => (
            <div key={item.id} style={styles.cartItem}>
              <span>{item.name} x {item.qty}</span>
              <span>฿{item.price * item.qty}</span>
            </div>
          ))}
          
          <div style={styles.divider} />
          
          <label>📍 พื้นที่จัดส่ง (ชุมชน):</label>
          <select value={selectedZone} onChange={(e)=>setSelectedZone(e.target.value)} style={styles.input}>
            <option value="">-- เลือกพื้นที่เพื่อคำนวณค่าส่ง --</option>
            {Object.keys(DELIVERY_ZONES).map(z => <option key={z} value={z}>{z} (+฿{DELIVERY_ZONES[z]})</option>)}
          </select>

          <label>💳 วิธีชำระเงิน:</label>
          <div style={styles.payBtnGroup}>
            <button onClick={()=>setPayMethod('cash')} style={{...styles.payBtn, backgroundColor: payMethod==='cash'?'#ff6600':'#333'}}>เงินสด</button>
            <button onClick={()=>setPayMethod('qr')} style={{...styles.payBtn, backgroundColor: payMethod==='qr'?'#ff6600':'#333'}}>QR Code</button>
          </div>

          {payMethod === 'qr' && (
            <div style={styles.qrBox}>
              <p style={{color:'#000', fontSize:'12px', marginBottom:'5px'}}>สแกนจ่ายที่นี่ (แจ้งสลิปในแชท)</p>
              <img src={adminQr} style={{width:'150px'}} alt="Admin QR" />
            </div>
          )}

          <button onClick={handleCheckout} style={styles.checkoutBtn}>
            ยืนยันสั่งอาหาร (฿{cart.reduce((s,i)=>s+(i.price*i.qty),0) + (DELIVERY_ZONES[selectedZone] || 0)})
          </button>
        </div>
      )}

      {/* ประวัติการสั่งซื้อ (พร้อมระบบรีวิว) */}
      <div style={{marginTop:'40px'}}>
        <h3 style={{borderLeft:'4px solid #ff6600', paddingLeft:'10px', marginBottom:'15px'}}>🕒 ประวัติการสั่งซื้อ</h3>
        {myOrders.map(order => (
          <div key={order.id} style={styles.historyCard}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <b>#{order.id.slice(0,5)}</b>
              <span style={{color: order.status==='completed'?'#00ff00':'#ff6600', fontSize:'12px', fontWeight:'bold'}}>{order.status.toUpperCase()}</span>
            </div>
            <p style={{fontSize:'13px', color:'#888', margin:'5px 0'}}>{order.address} | ยอดรวม: ฿{order.total_price}</p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => navigate(`/chat/${order.id}`)} style={styles.chatBtn}>💬 แชท</button>
              
              {/* ปุ่มรีวิว: เงื่อนไขคือ ส่งสำเร็จแล้ว และ ยังไม่เคยรีวิว */}
              {order.status === 'completed' && !order.is_reviewed && (
                <button 
                  onClick={() => navigate(`/review/${order.id}`)} 
                  style={styles.reviewBtn}
                >
                  ⭐ รีวิวบริการ
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { backgroundColor: '#000', minHeight: '100vh', color: '#fff', padding: '20px', fontFamily: 'Kanit' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '10px' },
  loader: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', color: '#ff6600', fontWeight: 'bold' },
  searchInput: { width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#111', color: '#fff', border: '1px solid #333', marginBottom: '15px' },
  categoryBar: { display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' },
  catBtn: { padding: '8px 18px', borderRadius: '20px', border: 'none', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  foodGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' },
  card: { backgroundColor: '#111', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222' },
  foodImg: { width: '100%', height: '110px', objectFit: 'cover' },
  cardBody: { padding: '10px', textAlign: 'center' },
  addBtn: { width: '100%', backgroundColor: '#ff6600', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', marginTop: '5px', fontWeight: 'bold', cursor: 'pointer' },
  cartBox: { backgroundColor: '#111', padding: '20px', borderRadius: '20px', border: '1.5px solid #ff6600', marginTop: '25px' },
  cartItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' },
  divider: { height: '1px', backgroundColor: '#333', margin: '15px 0' },
  input: { width: '100%', padding: '12px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '10px', margin: '10px 0' },
  payBtnGroup: { display: 'flex', gap: '10px', margin: '10px 0' },
  payBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer' },
  qrBox: { textAlign: 'center', backgroundColor: '#fff', padding: '15px', borderRadius: '15px', margin: '10px 0' },
  checkoutBtn: { width: '100%', padding: '16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px', marginTop: '10px', cursor: 'pointer' },
  historyCard: { backgroundColor: '#111', padding: '15px', borderRadius: '15px', marginBottom: '12px', border: '1px solid #222' },
  chatBtn: { flex: 1, padding: '10px', backgroundColor: '#222', color: '#ff6600', border: '1px solid #ff6600', borderRadius: '10px', cursor: 'pointer' },
  reviewBtn: { flex: 1, padding: '10px', backgroundColor: '#ffcc00', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' },
  logoutBtn: { background: 'none', border: '1px solid #444', color: '#888', padding: '6px 15px', borderRadius: '20px', cursor: 'pointer' }
};

export default OrderFood;
