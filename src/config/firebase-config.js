// Import các hàm cần thiết từ CDN của Firebase (phiên bản v10)
// Chúng ta dùng URL trực tiếp vì không cài npm
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// TODO: Thay thế nội dung bên dưới bằng mã bạn vừa copy ở Bước 2
const firebaseConfig = {
  apiKey: "AIzaSyCxX4r28RKPpFASkVJb-1fQqyL86-GR2oE",
  authDomain: "bamboo-hatien-resort.firebaseapp.com",
  projectId: "bamboo-hatien-resort",
  storageBucket: "bamboo-hatien-resort.firebasestorage.app",
  messagingSenderId: "685462737675",
  appId: "1:685462737675:web:5b3ad5d2e8eeb255dd480e"
};

// 1. Khởi tạo Firebase App
const app = initializeApp(firebaseConfig);

// 2. Xuất (Export) các dịch vụ để dùng ở file khác
// Auth: Quản lý đăng nhập/đăng ký
export const auth = getAuth(app);

// DB: Cơ sở dữ liệu Firestore
export const db = getFirestore(app);

// Storage: Nơi lưu ảnh phòng, ảnh bill thanh toán
export const storage = getStorage(app);


console.log("🔥 Firebase đã được kết nối thành công!");
