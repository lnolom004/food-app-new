import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // ตรวจสอบว่าไฟล์ชื่อ supabase.js อยู่ในโฟลเดอร์เดียวกัน
import { useNavigate } from 'react-router-dom';

const OrderFood = () => {
  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. ดึงข้อมูลจากตาราง 'foods' ใน Supabase
  useEffect(() => {
    const fetchFoods = async () => {
      try {
        setLoading(true);
        // ดึงข้อมูลทั้งหมดจากตาราง foods
        const { data, error } = await supabase
          .from('foods') 
          .select('*');

        if (error) throw error;
        setFoods(data || []);
      } catch (error) {
        console.error('Error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFoods();
  }, []);

  // 2. ระบบค้นหา (กรองจากชื่ออาหาร)
  const filteredFoods = foods.filter(food =>
    food.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* --- ส่วนหัวแอป (Header) --- */}
      <div style={styles.header}>
        <h1 style={styles.logo}>🍔 FoodApp <span style={{color: '#ff6600'}}>Pro</span></h1>
        
        {/* ช่องค้นหา */}
        <div style={styles.searchBox}>
          <input
            type="text"
            placeholder="🔍 ค้นหาเมนูที่คุณต้องการ..."
            style={styles.searchInput}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- ส่วนแสดงผลรายการอาหาร (Grid) --- */}
      {loading ? (
        <div style={styles.statusText}>กำลังเตรียมเมนูอร่อย...</div>
      ) : (
        <div style={styles.foodGrid}>
          {filteredFoods.map((food) => (
            <div key={food.id} style={styles.card}>
              
              {/* จุดสำคัญ: ตัวควบคุมรูปภาพให้เท่ากัน */}
              <div style={styles.imageWrapper}>
                <img 
                  src={food.image_url || 'https://via.placeholder.com'} 
                  alt={food.name} 
                  style={styles.foodImage} 
                />
              </div>

              <div style={styles.cardContent}>
                <h3 style={styles.foodName}>{food.name}</h3>
                <p style={styles.priceTag}>฿{food.price}</p>
                <button 
                  style={styles.orderButton}
                  onClick={() => alert(`เพิ่ม ${food.name} ลงในตะกร้าแล้ว!`)}
                >
                  เพิ่มลงตะกร้า
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* กรณีค้นหาไม่เจอ */}
      {!loading && filteredFoods.length === 0 && (
        <div style={styles.statusText}>ไม่พบเมนูที่คุณค้นหา 😅</div>
      )}
    </div>
  );
};

// --- การตั้งค่าดีไซน์ (Dark Mode & Professional UI) ---
const styles = {
  container: {
    backgroundColor: '#000000', // พื้นหลังดำสนิท
    minHeight: '100vh',
    padding: '20px',
    color: '#ffffff',
    fontFamily: "'Kanit', sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logo: {
    fontSize: '32px',
    marginBottom: '20px',
  },
  searchBox: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  searchInput: {
    width: '100%',
    padding: '12px 25px',
    borderRadius: '30px',
    border: '1px solid #333',
    backgroundColor: '#1a1a1a', // ช่องค้นหาสีเทาเข้ม
    color: 'white',
    fontSize: '16px',
    outline: 'none',
  },
  foodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', // จัดเรียงการ์ดอัตโนมัติ
    gap: '25px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: '#1a1a1a', // สีการ์ดเทาเข้ม
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 10px 20px rgba(0,0,0,0.5)',
    transition: '0.3s',
    border: '1px solid #222',
  },
  imageWrapper: {
    width: '100%',
    height: '180px', // **ความสูงรูปภาพคงที่**
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover', // **ทำให้รูปไม่เบี้ยวและเต็มกรอบเป๊ะ**
  },
  cardContent: {
    padding: '20px',
    textAlign: 'center',
  },
  foodName: {
    fontSize: '18px',
    margin: '0 0 10px 0',
    fontWeight: '500',
  },
  priceTag: {
    fontSize: '20px',
    color: '#ff6600',
    fontWeight: 'bold',
    marginBottom: '15px',
  },
  orderButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#ff6600',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
  },
  statusText: {
    textAlign: 'center',
    marginTop: '50px',
    color: '#666',
    fontSize: '18px',
  }
};

export default OrderFood;
