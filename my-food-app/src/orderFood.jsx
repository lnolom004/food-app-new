import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import { useNavigate } from 'react-router-dom';

const OrderFood = () => {
  const [foods, setFoods] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('food_cart')) || []);
  const [myOrders, setMyOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const categories = ['ทั้งหมด', 'อาหาร', 'เครื่องดื่ม', 'ของหวาน'];

  // 1. บันทึกตะกร้าลงเครื่องอัตโนมัติ
  useEffect(() => {
    localStorage.setItem('food_cart', JSON.stringify(cart));
  }, [cart]);

  // 2. ดึงข้อมูลครั้งแรกและเปิดระบบ Realtime
  useEffect(() => {
    fetchFoods();
    fetchMyOrders();
    
    // ฟังการเปลี่ยนแปลงสถานะออเดอร์ (เช่น ไรเดอร์รับงาน) ให้หน้าจออัปเดตทันที
    const orderSubscription = supabase.channel('order-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchMyOrders();
      }).subscribe();

    return () => supabase.removeChannel(orderSubscription);
  }, []);

  const fetchFoods = async () => {
    const { data } = await supabase.from('menus').select('*');
    setFoods(data || []);
    setLoading(false);
  };

  const fetchMyOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setMyOrders(data || []);
    }
  };

  // 3. ฟังก์ชันจัดการตะกร้า
  const addToCart = (food) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === food.id);
      if (existing) return prev.map(item => item.id === food.id ? {...item, qty: item.qty + 1} : item);
      return [...prev, {...food, qty: 1}];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  // 4. ฟังก์ชันสั่งซื้อ (Checkout) พร้อม GPS
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("ตะกร้าว่างเปล่าครับ!");
    const { data: { user } } = await supabase.auth.getUser();
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

      const { error } = await supabase.from('orders').insert([{ 
        user_id: user.id, 
        items: cart, // เก็บรายการอาหารทั้งหมดในตะกร้า
        total_price: totalPrice, 
        status: 'pending',
        lat: latitude, 
        lng: longitude
      }]);

      if (!error) {
        alert("🛒 สั่งซื้อเรียบร้อย! ขอบคุณครับ");
        setCart([]);
        fetchMyOrders();
      }
      setLoading(false);
    }, () => {
      alert("กรุณาเปิด GPS เพื่อส่งตำแหน่งให้ไรเดอร์ครับ");
      setLoading(false);
    });
  };

  // 5. ฟังก์ชันยกเลิกออเดอร์
  const handleCancelOrder = async (orderId) => {
    if (window.confirm("ต้องการยกเลิกออเดอร์นี้ใช่หรือไม่?")) {
      await supabase.from('orders').delete().eq('id', orderId).eq('status', 'pending');
      fetchMyOrders();
    }
  };

  // ฟิลเตอร์ค้นหาและหมวดหมู่
  const filteredFoods = foods.filter(f => 
    (selectedCategory === 'ทั้งหมด' || f.category === selectedCategory) &&
    (f.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{fontSize: '2.5rem', color: '#ff6600'}}>🍔 FoodApp Pro</h1>
        <input type="text" placeholder="🔍 ค้นหาเมนูอาหาร..." style={styles.searchInput} onChange={(e)=>setSearchTerm(e.target.value)} />
      </header>

      {/* หมวดหมู่ */}
      <div style={styles.categoryBar}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)} style={{...styles.catBtn, backgroundColor: selectedCategory === cat ? '#ff6600' : '#1a1a1a'}}>{cat}</button>
        ))}
      </div>

      <div style={styles.mainLayout}>
        {/* รายการเมนูอาหาร */}
        <div style={{flex: 2}}>
          <div style={styles.foodGrid}>
            {filteredFoods.map(food => (
              <div key={food.id} style={styles.card}>
                <div style={styles.imgWrapper}><img src={food.image_url} style={styles.foodImg} alt={food.name} /></div>
                <div style={styles.cardBody}>
                  <h4 style={{margin: '5px 0'}}>{food.name}</h4>
                  <p style={{color:'#ff6600', fontWeight:'bold'}}>฿{food.price}</p>
                  <button onClick={()=>addToCart(food)} style={styles.btnAdd}>+ เพิ่มลงตะกร้า</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ตะกร้าและประวัติ */}
        <div style={styles.sideBar}>
          <div style={styles.cartBox}>
            <h3 style={{marginBottom: '15px'}}>🛒 ตะกร้าสินค้า</h3>
            {cart.map(item => (
              <div key={item.id} style={styles.cartItem}>
                <span>{item.name} x {item.qty}</span>
                <button onClick={()=>removeFromCart(item.id)} style={styles.btnSmallDel}>ลบ</button>
              </div>
            ))}
            <div style={styles.totalRow}>รวม: ฿{cart.reduce((s,i)=>s+(i.price*i.qty),0)}</div>
            <button onClick={handleCheckout} style={styles.btnCheckout} disabled={loading}>{loading ? '...' : 'ยืนยันสั่งอาหาร'}</button>
          </div>

          <div style={styles.historyBox}>
            <h3 style={{borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px'}}>📋 ประวัติออเดอร์</h3>
            {myOrders.map(order => (
              <div key={order.id} style={styles.orderCard}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <span style={{fontSize: '10px', color: '#888'}}>#{order.id.slice(0,8)}</span>
                  <span style={{color: order.status === 'pending' ? '#ffcc00' : '#00ff00', fontWeight: 'bold'}}>{order.status}</span>
                </div>
                
                {/* --- ส่วนที่เพิ่มใหม่: วนลูปโชว์รายการอาหารที่สั่งในออเดอร์นี้ --- */}
                <div style={styles.itemsInOrder}>
                  {order.items && order.items.map((item, index) => (
                    <div key={index} style={{fontSize: '13px', color: '#bbb', display: 'flex', justifyContent: 'space-between'}}>
                      <span>• {item.name}</span>
                      <span style={{color: '#ff6600'}}>x{item.qty}</span>
                    </div>
                  ))}
                </div>

                <div style={{textAlign: 'right', marginTop: '10px', fontWeight: 'bold'}}>ยอดรวม: ฿{order.total_price}</div>
                
                <div style={styles.orderActions}>
                  <button onClick={()=>navigate(`/chat/${order.id}`)} style={styles.chatBtn}>💬 แชท</button>
                  {order.status === 'pending' && (
                    <button onClick={() => handleCancelOrder(order.id)} style={styles.btnCancel}>🗑️ ยกเลิก</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles (Dark Mode) ---
const styles = {
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: "'Kanit', sans-serif" },
  header: { textAlign: 'center', marginBottom: '20px' },
  searchInput: { width: '100%', maxWidth: '400px', padding: '12px 25px', borderRadius: '30px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#fff', outline: 'none' },
  categoryBar: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' },
  catBtn: { padding: '8px 20px', borderRadius: '20px', color: '#fff', border: '1px solid #333', cursor: 'pointer', transition: '0.3s' },
  mainLayout: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  foodGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#1a1a1a', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222' },
  imgWrapper: { width: '100%', height: '130px', overflow: 'hidden' },
  foodImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardBody: { padding: '15px', textAlign: 'center' },
  btnAdd: { width: '100%', padding: '8px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  sideBar: { flex: 1, minWidth: '320px' },
  cartBox: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #ff6600', marginBottom: '20px' },
  cartItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' },
  btnSmallDel: { backgroundColor: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer' },
  totalRow: { textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '10px', color: '#ff6600' },
  btnCheckout: { width: '100%', padding: '12px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', marginTop: '15px', fontWeight: 'bold' },
  historyBox: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #333' },
  orderCard: { borderBottom: '1px solid #222', padding: '15px 0' },
  itemsInOrder: { backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '10px', marginTop: '8px' },
  orderActions: { display: 'flex', gap: '10px', marginTop: '15px' },
  chatBtn: { flex: 1, backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' },
  btnCancel: { flex: 1, backgroundColor: '#ff4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }
};

export default OrderFood;
