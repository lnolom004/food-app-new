import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

/** 
 * --- ลำดับการนำเข้า CSS (สำคัญมาก) --- 
 * 1. index.css: วางรากฐานและฟอนต์ (พื้นฐาน)
 * 2. App.css: ตกแต่ง UI และ Layout (ทับค่าพื้นฐาน)
 */
import './index.css' 
import './App.css'

// สร้าง Root สำหรับรันแอป React เข้ากับ <div id="root"> ใน index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
