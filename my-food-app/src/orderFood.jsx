import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // ตรวจสอบชื่อไฟล์ให้ตรงกับโปรเจกต์
import { useNavigate } from 'react-router-dom';

const OrderFood = () => {
  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. ฟังก์ชันดึงข้อมูลอาหารจาก Supabase
  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('foods') // เปลี่ยนเป็นชื่อตารางอาหารของคุณ (เช่น products หรือ menus)
        .select('*');

      if (error) throw error;
      setFoods(data || []);
    } catch (error) {
      console.error('Error fetching foods:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. ฟังก์ชันค้นหาอาหาร
  const filteredFoods = foods.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. ฟังก์ชันเพิ่มลงตะกร้า (ตัวอย่าง)
  const addToCart = (food) => {
    alert(`เพิ่ม ${food.name} ลงตะกร้าเรียบร้อยแล้ว!`);
    // คุณสามารถเพิ่ม Logic การจัดการตะกร้า (Context/Redux) ตรงนี้ได้
  };

  return (
    <div style={styles.container}>
      {/* ส่วนหัวแอป */}
      <header style={styles.header}>
        <h1 style={styles.title}>🍔 FoodApp <span style={{color:'#ff6600'}}>Pro</span></h1>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="🔍 ค้นหาเมนูอาหาร..."
            style={styles.searchInput}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* สถานะโหลดข้อมูล */}
      {loading ? (
        <div style={styles.centerText}>กำลังโหลดเมนูอร่อย...</div>
      ) : (
        <div style={styles.grid}>
          {filteredFoods.map((food) => (
            <div key={food.id} style={styles.card}>
              {/* ส่วนของรูปภาพ - แก้ไขให้เท่ากันทุกลูก */}
              <div style={styles.imageWrapper}>
                <img 
                  src={food.image_url || 'https://via.placeholder.com'} 
                  alt={food.name} 
                  style={styles.image} 
                />
              </div>

              {/* รายละเอียดอาหาร */}
              <div style={styles.cardBody}>
                <h3 style={styles.foodName}>{food.name}</h3>
                <p style={styles.foodPrice}>฿{food.price}</p>
                <button 
                  onClick={() => addToCart(food)}
                  style={styles.addButton}
                >
                  🛒 เพิ่มลงตะกร้า
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ถ้าไม่พบเมนูที่ค้นหา */}
      {!loading && filteredFoods.length === 0 && (
        <div style={styles.centerText}>ไม่พบเมนูที่คุณค้นหา...</div>
      )}
    </div>
  );
};

// --- Styles: Dark Theme & Uniform Design ---
const styles = {
  container: {
    backgroundColor: '#000000', // พื้นหลังดำสนิท
    color: '#ffffff',
    minHeight: '100vh',
    padding: '20px',
    fontFamily: "'Kanit', sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '20px',
  },
  searchContainer: {
    maxWidth: '500px',
    margin: '0 auto',
  },
  searchInput: {
    width: '100%',
    padding: '12px 20px',
    borderRadius: '25px',
    border: '1px solid #333',
    backgroundColor: '#1a1a1a',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '25px',
    padding: '10px',
  },
  card: {
    backgroundColor: '#1a1a1a', // การ์ดสีเทาเข้ม
    borderRadius: '15px',
    overflow: 'hidden',
    boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
    border: '1px solid #222',
    transition: 'transform 0.2s',
  },
  imageWrapper: {
    width: '100%',
    height: '200px', // บังคับความสูงรูปภาพให้เท่ากันเป๊ะ
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover', // สำคัญ: ปรับรูปภาพให้พอดีกล่องโดยไม่เบี้ยว
  },
  cardBody: {
    padding: '20px',
    textAlign: 'center',
  },
  foodName: {
    fontSize: '1.2rem',
    margin: '0 0 10px 0',
    color: '#fff',
  },
  foodPrice: {
    fontSize: '1.3rem',
    color: '#ff6600', // สีส้มเน้นราคา
    fontWeight: 'bold',
    marginBottom: '15px',
  },
  addButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#ff6600',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: '0.3s',
  },
  centerText: {
    textAlign: 'center',
    marginTop: '50px',
    color: '#888',
  },
};

export default OrderFood;
