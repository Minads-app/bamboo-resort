import { db } from '../config/firebase-config.js';
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Tạo đơn đặt phòng mới (Hỗ trợ cả Guest và User)
 * @param {Object} bookingData - Dữ liệu đầy đủ của đơn hàng
 */
export const createBooking = async (bookingData) => {
    try {
        // 1. Chuẩn bị dữ liệu chuẩn
        const payload = {
            ...bookingData,
            createdAt: Timestamp.now(), // Thời gian đặt
            status: 'pending',          // Trạng thái đơn: Chờ xử lý
            paymentStatus: 'unpaid',    // Trạng thái tiền: Chưa thanh toán
            type: 'room_booking'
        };

        // 2. Lưu vào collection "bookings"
        const docRef = await addDoc(collection(db, "bookings"), payload);
        
        console.log("✅ Booking created successfully ID:", docRef.id);
        return { success: true, id: docRef.id };

    } catch (error) {
        console.error("❌ Error adding booking:", error);
        return { success: false, message: error.message };
    }
};