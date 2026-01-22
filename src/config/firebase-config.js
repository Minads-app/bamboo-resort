// 1. IMPORT CÁC THƯ VIỆN TỪ CDN (Dùng link web thay vì tên gói npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 2. CẤU HÌNH THẬT CỦA BẠN (Đã cập nhật mã mới nhất)
const firebaseConfig = {
  apiKey: "AIzaSyCxX4r28RKPpFASkVJb-1fQqyL86-GR2oE",
  authDomain: "bamboo-hatien-resort.firebaseapp.com",
  projectId: "bamboo-hatien-resort",
  storageBucket: "bamboo-hatien-resort.firebasestorage.app",
  messagingSenderId: "685462737675",
  appId: "1:685462737675:web:5b3ad5d2e8eeb255dd480e"
};

// 3. KHỞI TẠO ỨNG DỤNG
console.log("🔥 Đang kết nối Firebase với Project ID:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);

// 4. XUẤT CÁC DỊCH VỤ RA ĐỂ FILE KHÁC DÙNG (QUAN TRỌNG)
export const auth = getAuth(app);       // Dùng để đăng nhập
export const db = getFirestore(app);    // Dùng để lưu đơn đặt phòng
export const storage = getStorage(app); // Dùng để lưu ảnh (nếu cần sau này)

console.log("✅ Firebase Config Loaded Successfully!");
