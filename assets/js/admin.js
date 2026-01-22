import { db, auth } from '../../src/config/firebase-config.js';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("⚡ Admin Script Loaded with Login Gate");

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const adminLoginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('loginError');

const tableBody = document.getElementById('bookingTableBody');
const adminEmailDisplay = document.getElementById('adminEmailDisplay');
const btnLogout = document.getElementById('btnLogout');
const countPendingDisplay = document.getElementById('countPending');
const countTotalDisplay = document.getElementById('countTotal');

// KHỞI TẠO
document.addEventListener('DOMContentLoaded', () => {
    // 1. Lắng nghe trạng thái đăng nhập
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ĐÃ ĐĂNG NHẬP -> HIỆN DASHBOARD
            console.log("Admin Logged In:", user.email);
            loginContainer.style.display = 'none';
            dashboardContainer.style.display = 'flex'; // Trả lại display flex cho dashboard
            
            adminEmailDisplay.innerText = user.email;
            initRealtimeData(); // Bắt đầu tải dữ liệu
        } else {
            // CHƯA ĐĂNG NHẬP -> HIỆN LOGIN FORM
            console.log("No User -> Show Login Form");
            loginContainer.style.display = 'flex';
            dashboardContainer.style.display = 'none';
        }
    });

    // 2. Xử lý Đăng nhập ngay tại Admin Page
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admEmail').value;
            const pass = document.getElementById('admPass').value;
            const btn = adminLoginForm.querySelector('button');

            try {
                btn.innerText = "Đang kiểm tra...";
                btn.disabled = true;
                loginError.style.display = 'none';

                // Gọi hàm login của Firebase trực tiếp
                await signInWithEmailAndPassword(auth, email, pass);
                
                // Nếu thành công, onAuthStateChanged ở trên sẽ tự chạy và chuyển cảnh
                // Không cần code chuyển trang ở đây

            } catch (error) {
                console.error(error);
                loginError.style.display = 'block';
                loginError.innerText = "Sai email hoặc mật khẩu!";
                btn.innerText = "Đăng nhập";
                btn.disabled = false;
            }
        });
    }

    // 3. Xử lý Đăng xuất
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if(confirm("Đăng xuất Admin?")) {
                await signOut(auth);
                // Sau khi signout, onAuthStateChanged tự chạy -> hiện lại Login Form
            }
        });
    }
});

// --- LOGIC LOAD DỮ LIỆU (GIỐNG CŨ) ---
function initRealtimeData() {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        tableBody.innerHTML = "";
        let pending = 0;
        let total = 0;

        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Chưa có dữ liệu</td></tr>`;
            return;
        }

        snapshot.forEach((doc) => {
            const booking = doc.data();
            booking.id = doc.id;
            total++;
            if (booking.status === 'pending') pending++;
            renderBookingRow(booking);
        });

        if(countPendingDisplay) countPendingDisplay.innerText = pending;
        if(countTotalDisplay) countTotalDisplay.innerText = total;
    });
}

function renderBookingRow(booking) {
    const tr = document.createElement('tr');
    
    // Format Date
    const date = booking.createdAt?.toDate ? booking.createdAt.toDate().toLocaleString('vi-VN') : '---';

    // Badge
    let badge = `<span class="badge bg-pending">? ${booking.status}</span>`;
    let actions = '';

    if (booking.status === 'pending') {
        badge = `<span class="badge bg-pending">Chờ duyệt</span>`;
        actions = `
            <button class="btn-action btn-approve" data-id="${booking.id}">✔</button>
            <button class="btn-action btn-cancel" data-id="${booking.id}">✖</button>
        `;
    } else if (booking.status === 'confirmed') {
        badge = `<span class="badge bg-confirmed">Đã duyệt</span>`;
        actions = `<span style="color:green"><i class="fas fa-check"></i></span>`;
    } else {
        badge = `<span class="badge bg-cancelled">Hủy</span>`;
        actions = `<span style="color:red">Đã hủy</span>`;
    }

    tr.innerHTML = `
        <td>${date}</td>
        <td>
            <b>${booking.customerName}</b><br>
            ${booking.customerPhone}
        </td>
        <td>
            <span style="color:var(--primary-color)">${booking.roomType}</span><br>
            <small>${booking.checkIn} -> ${booking.checkOut}</small>
        </td>
        <td>${badge}</td>
        <td>${actions}</td>
    `;
    tableBody.appendChild(tr);
}

// Event Delegation cho nút bấm
tableBody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.getAttribute('data-id');

    if (target.classList.contains('btn-approve')) {
        if(confirm("Duyệt đơn này?")) await updateStatus(id, 'confirmed');
    }
    if (target.classList.contains('btn-cancel')) {
        const reason = prompt("Lý do hủy:");
        if(reason) await updateStatus(id, 'cancelled', reason);
    }
});

async function updateStatus(id, status, reason="") {
    try {
        await updateDoc(doc(db, "bookings", id), {
            status: status,
            cancelReason: reason
        });
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
}
