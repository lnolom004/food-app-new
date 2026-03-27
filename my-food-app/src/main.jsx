import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // ครอบแค่จุดเดียวที่นี่
import App from './App';
import './index.css'; // ถ้าคุณมีไฟล์ CSS หลัก

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
