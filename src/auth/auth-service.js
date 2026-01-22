// src/auth/auth-service.js
import { auth, db } from '../config/firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Đăng ký tài khoản mới
 * @param {string} email 
 * @param {string} password 
 */
export const registerUser = async (email, password) => {
    try {
        // 1. Tạo user trong Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Lưu thông tin bổ sung vào Firestore (để quản lý Role)
        // Mặc định mọi user mới đều là 'customer'
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            role: "customer", // Quan trọng: Đây là chỗ phân quyền
            createdAt: new Date().toISOString(),
            phone: "", // Sẽ cập nhật sau
            history: []
        });

        return { success: true, user: user };

    } catch (error) {
        return { success: false, message: formatErrorMessage(error.code) };
    }
};

/**
 * Đăng nhập
 * @param {string} email 
 * @param {string} password 
 */
export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Lấy thêm thông tin Role từ Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        let role = "customer";
        
        if (userDoc.exists()) {
            role = userDoc.data().role;
        }

        return { success: true, user: user, role: role };

    } catch (error) {
        return { success: false, message: formatErrorMessage(error.code) };
    }
};

/**
 * Hàm phụ trợ: Dịch lỗi Firebase sang tiếng Việt dễ hiểu
 */
function formatErrorMessage(code) {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'Email này đã được sử dụng.';
        case 'auth/invalid-email':
            return 'Email không hợp lệ.';
        case 'auth/weak-password':
            return 'Mật khẩu quá yếu (cần ít nhất 6 ký tự).';
        case 'auth/user-not-found':
            return 'Tài khoản không tồn tại.';
        case 'auth/wrong-password':
            return 'Sai mật khẩu.';
        case 'auth/too-many-requests':
            return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
        default:
            return 'Lỗi hệ thống: ' + code;
    }
}