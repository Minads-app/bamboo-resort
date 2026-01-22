// assets/js/admin.js

// 1. IMPORT
import { db, auth } from '../../src/config/firebase-config.js';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("⚡ Admin Script Loaded");

// 2. DOM Elements
const tableBody = document.getElementById('bookingTableBody');
const adminEmailDisplay = document.getElementById('adminEmail');
const btnLogout = document.getElementById('btnLogout');
const countPendingDisplay = document.getElementById('countPending');

// 3. KHỞI TẠO
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
});

// --- A. AUTHENTICATION & SECURITY ---
function checkAdminAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Admin logged in:", user.email);
            adminEmailDisplay.innerText = user.email;
            initRealtimeData(); // Chỉ tải dữ liệu khi đã login
        } else {
            // Nếu chưa đăng nhập, đá về trang chủ hoặc trang login
            alert("Bạn chưa đăng nhập! Vui lòng đăng nhập để truy cập Admin.");
            window.location.href = "index.html";
        }
    });

    // Sự kiện Đăng xuất
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if(confirm("Đăng xuất khỏi trang Admin?")) {
                await signOut(auth);
                window.location.href = "index.html";
            }
        });
    }
}

// --- B. REAL-TIME DATA HANDLING ---
function initRealtimeData() {
    // Truy vấn: Lấy collection bookings, sắp xếp ngày tạo mới nhất lên đầu
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

    // Lắng nghe thay đổi
    onSnapshot(q, (snapshot) => {
        tableBody.innerHTML = ""; // Xóa dữ liệu cũ
        
        let pendingCount = 0;

        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Chưa có đơn đặt phòng nào.</td></tr>`;
            return;
        }

        snapshot.forEach((doc) => {
            const booking = doc.data();
            booking.id = doc.id; // Lấy ID để dùng cho nút bấm
            
            // Đếm số đơn chờ
            if (booking.status === 'pending') pendingCount++;
            
            // Vẽ dòng
            renderBookingRow(booking);
        });

        // Cập nhật số liệu thống kê
        if(countPendingDisplay) countPendingDisplay.innerText = pendingCount;
    }, (error) => {
        console.error("Lỗi lấy dữ liệu:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Lỗi kết nối: ${error.message}</td></tr>`;
    });
}

// --- C. RENDER UI ---
function renderBookingRow(booking) {
    const tr = document.createElement('tr');
    
    // 1. Xử lý thời gian (Check null an toàn)
    const createdDate = booking.createdAt && booking.createdAt.toDate 
        ? booking.createdAt.toDate().toLocaleString('vi-VN') 
        : 'N/A';

    // 2. Xử lý Badge Trạng thái
    let statusHtml = '';
    let actionHtml = '';

    switch (booking.status) {
        case 'pending':
            statusHtml = '<span class="badge bg-pending">Chờ duyệt</span>';
            // Chỉ hiện nút duyệt/hủy khi trạng thái là pending
            actionHtml = `
                <button class="btn-action btn-approve" data-id="${booking.id}">✔ Duyệt</button>
                <button class="btn-action btn-cancel" data-id="${booking.id}">✖ Hủy</button>
            `;
            break;
        case 'confirmed':
            statusHtml = '<span class="badge bg-confirmed">Đã duyệt</span>';
            actionHtml = '<span style="color: #28a745; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Xong</span>';
            break;
        case 'cancelled':
            statusHtml = '<span class="badge bg-cancelled">Đã hủy</span>';
            actionHtml = '<span style="color: #dc3545; font-size: 0.8rem;">Đã hủy</span>';
            break;
        default:
            statusHtml = `<span class="badge">${booking.status}</span>`;
    }

    // 3. Nội dung HTML của dòng
    tr.innerHTML = `
        <td>${createdDate}</td>
        <td>
            <strong>${booking.customerName || 'Khách vãng lai'}</strong><br>
            <span style="color: #666; font-size: 0.85rem;">${booking.customerPhone || '---'}</span><br>
            <span style="color: #888; font-size: 0.8rem;">${booking.customerEmail || ''}</span>
        </td>
        <td>
            <strong style="color: var(--primary-color)">${booking.roomType}</strong><br>
            Check-in: ${booking.checkIn}<br>
            Check-out: ${booking.checkOut}
        </td>
        <td>
            <em style="color: #666; font-size: 0.9rem;">${booking.note || 'Không có'}</em>
            ${booking.cancelReason ? `<br><small style="color:red">Lý do hủy: ${booking.cancelReason}</small>` : ''}
        </td>
        <td>${statusHtml}</td>
        <td>${actionHtml}</td>
    `;

    tableBody.appendChild(tr);
}

// --- D. EVENT DELEGATION (Xử lý click nút trong bảng) ---
tableBody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.getAttribute('data-id');

    // 1. Nút Duyệt
    if (target.classList.contains('btn-approve')) {
        if(confirm("Xác nhận phòng này đã được thanh toán/giữ chỗ?")) {
            await updateBookingStatus(id, 'confirmed');
        }
    }

    // 2. Nút Hủy
    if (target.classList.contains('btn-cancel')) {
        const reason = prompt("Nhập lý do hủy (Khách hủy / Hết phòng / Spam):");
        if(reason) {
            await updateBookingStatus(id, 'cancelled', reason);
        }
    }
});

// --- E. LOGIC UPDATE FIRESTORE ---
async function updateBookingStatus(bookingId, newStatus, reason = "") {
    try {
        const bookingRef = doc(db, "bookings", bookingId);
        
        // Tạo object dữ liệu cần update
        const updateData = {
            status: newStatus,
            updatedAt: new Date()
        };
        
        // Nếu hủy thì lưu thêm lý do
        if(reason) updateData.cancelReason = reason;

        await updateDoc(bookingRef, updateData);
        
        // Không cần alert hay reload, onSnapshot sẽ tự cập nhật giao diện
        console.log(`Đã cập nhật đơn ${bookingId} sang trạng thái ${newStatus}`);

    } catch (error) {
        console.error("Lỗi cập nhật:", error);
        alert("Có lỗi xảy ra: " + error.message);
    }
}
