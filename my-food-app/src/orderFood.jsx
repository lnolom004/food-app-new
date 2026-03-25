import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import { useNavigate } from 'react-router-dom';

const OrderFood = () => {
  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('food_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const categories = ['ทั้งหมด', 'อาหาร', 'เครื่องดื่ม', 'ของหวาน'];

  // บันทึกตะกร้าลงเครื่องทุกครั้งที่มีการเปลี่ยนแปลง
  useEffect(() => {
    localStorage.setItem('food_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    fetchFoods();
    fetchMyOrders();
  }, []);

  const fetchFoods = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('menus').select('*');
    if (!error) setFoods(data || []);
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

  // --- ระบบจัดการตะกร้า ---
  const addToCart = (food) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === food.id);
      if (existing) {
        return prev.map(item => item.id === food.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...food, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // --- ระบบจัดการออเดอร์ ---
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("กรุณาเลือกอาหารลงตะกร้าก่อนครับ!");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("กรุณาเข้าสู่ระบบก่อนสั่งอาหาร");

    const { error } = await supabase.from('orders').insert([
      { 
        user_id: user.id, 
        items: cart, 
        total_price: totalPrice, 
        status: 'pending' 
      }
    ]);

    if (!error) {
      alert("🛒 สั่งอาหารสำเร็จ! กรุณารอไรเดอร์รับงานครับ");
      setCart([]);
      fetchMyOrders();
    } else {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const cancelOrder = async (orderId) => {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('status', 'pending');

    if (!error) {
      alert("🗑️ ยกเลิกออเดอร์เรียบร้อยแล้ว");
      fetchMyOrders();
    } else {
      alert("ไม่สามารถยกเลิกได้ เนื่องจากไรเดอร์รับงานแล้ว");
    }
  };

  // ตัวกรองข้อมูล
  const filteredFoods = foods.filter(food => 
    (selectedCategory === 'ทั้งหมด' || food.category === selectedCategory) &&
    (food.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={styles.container}>
      {/* Header & Search */}
      <header style={styles.header}>
        <h1 style={styles.logo}>🍔 FoodApp <span style={{color: '#ff6600'}}>Pro</span></h1>
        <input 
          type="text" 
          placeholder="🔍 ค้นหาเมนูอาหาร..." 
          style={styles.searchInput}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </header>

      {/* Category Bar */}
      <div style={styles.categoryBar}>
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{...styles.catBtn, backgroundColor: selectedCategory === cat ? '#ff6600' : '#1a1a1a'}}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={styles.mainLayout}>
        {/* Left: Food Grid */}
        <div style={styles.foodSection}>
          <div style={styles.foodGrid}>
            {filteredFoods.map(food => (
              <div key={food.id} style={styles.card}>
                <div style={styles.imageWrapper}>
                  <img src={food.image_url} alt={food.name} style={styles.foodImg} />
                </div>
                <div style={styles.cardContent}>
                  <h4 style={{margin: '10px 0'}}>{food.name}</h4>
                  <p style={{color: '#ff6600', fontWeight: 'bold'}}>฿{food.price}</p>
                  <button onClick={() => addToCart(food)} style={styles.btnAdd}>+ เพิ่มลงตะกร้า</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart & History */}
        <div style={styles.sideSection}>
          {/* Cart Box */}
          <div style={styles.cartBox}>
            <h3 style={{borderBottom: '1px solid #333', paddingBottom: '10px'}}>🛒 ตะกร้าสินค้า</h3>
            {cart.length === 0 ? <p style={{color: '#666'}}>ยังไม่มีสินค้า</p> : (
              <>
                {cart.map(item => (
                  <div key={item.id} style={styles.cartItem}>
                    <span>{item.name} x {item.qty}</span>
                    <button onClick={() => removeFromCart(item.id)} style={styles.btnDel}>ลบ</button>
                  </div>
                ))}
                <div style={styles.totalRow}>
                  <span>รวมทั้งสิ้น:</span>
                  <span style={{color: '#ff6600'}}>฿{totalPrice}</span>
                </div>
                <button onClick={handleCheckout} style={styles.btnCheckout}>ยืนยันการสั่งซื้อ</button>
              </>
            )}
          </div>

          {/* History Box */}
          <div style={styles.historyBox}>
            <h3 style={{borderBottom: '1px solid #333', paddingBottom: '10px'}}>📋 สถานะออเดอร์</h3>
            {myOrders.map(order => (
              <div key={order.id} style={styles.orderCard}>
                <div>
                  <div style={{fontSize: '12px', color: '#888'}}>#{order.id.slice(0,8)}</div>
                  <div style={{color: order.status === 'pending' ? '#ffcc00' : '#00ff00'}}>{order.status}</div>
                </div>
                {order.status === 'pending' && (
                  <button onClick={() => cancelOrder(order.id)} style={styles.btnCancel}>ยกเลิก</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Styles (Full Pro Design) ---
const styles = {
  container: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: "'Kanit', sans-serif" },
  header: { textAlign: 'center', marginBottom: '30px' },
  logo: { fontSize: '32px', marginBottom: '20px' },
  searchInput: { width: '100%', maxWidth: '500px', padding: '12px 25px', borderRadius: '30px', border: '1px solid #333', backgroundColor: '#1a1a1a', color: 'white', outline: 'none' },
  categoryBar: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' },
  catBtn: { padding: '8px 20px', borderRadius: '20px', color: '#fff', border: '1px solid #333', cursor: 'pointer', transition: '0.3s' },
  mainLayout: { display: 'flex', gap: '30px', flexWrap: 'wrap' },
  foodSection: { flex: 3, minWidth: '300px' },
  sideSection: { flex: 1, minWidth: '300px' },
  foodGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#1a1a1a', borderRadius: '15px', overflow: 'hidden', border: '1px solid #222' },
  imageWrapper: { width: '100%', height: '150px', overflow: 'hidden' },
  foodImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardContent: { padding: '15px', textAlign: 'center' },
  btnAdd: { width: '100%', padding: '10px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  cartBox: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #ff6600', marginBottom: '20px' },
  cartItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' },
  btnDel: { backgroundColor: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer' },
  totalRow: { display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontWeight: 'bold', fontSize: '18px' },
  btnCheckout: { width: '100%', padding: '12px', backgroundColor: '#ff6600', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', marginTop: '15px', fontWeight: 'bold' },
  historyBox: { backgroundColor: '#111', padding: '20px', borderRadius: '15px', border: '1px solid #333' },
  orderCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #222' },
  btnCancel: { backgroundColor: '#ff4444', color: '#fff', border: 'none', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }
};

export default OrderFood;
