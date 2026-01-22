// 1. IMPORT CÁC THƯ VIỆN CẦN THIẾT (KHÔNG CÓ STORAGE)
import { db, auth } from '../../src/config/firebase-config.js';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("⚡ Admin V2 Loaded - No Storage Mode");

// 2. DOM ELEMENTS
const dom = {
    loginContainer: document.getElementById('login-container'),
    dashboardContainer: document.getElementById('dashboard-container'),
    loginForm: document.getElementById('adminLoginForm'),
    loginError: document.getElementById('loginError'),
    navItems: document.querySelectorAll('.nav-item'),
    sections: document.querySelectorAll('.content-section'),
    pageTitle: document.getElementById('pageTitle'),
    
    // Booking
    bookingBody: document.getElementById('bookingTableBody'),
    countPending: document.getElementById('countPending'),
    countTotal: document.getElementById('countTotal'),
    
    // Room
    roomForm: document.getElementById('roomForm'),
    roomBody: document.getElementById('roomTableBody'),
    roomImageUrl: document.getElementById('roomImageUrl'),
    imagePreview: document.getElementById('imagePreview')
};

// 3. INIT (KHỞI TẠO)
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupLoginHandler();
    setupTabNavigation();
    setupRoomManager(); // Logic quản lý phòng
});

// --- PHẦN 1: XÁC THỰC (AUTH) ---
function checkAuthStatus() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Đã đăng nhập
            dom.loginContainer.style.display = 'none';
            dom.dashboardContainer.style.display = 'flex';
            document.getElementById('adminEmailDisplay').innerText = user.email;
            
            // Tải dữ liệu
            initBookingData();
            initRoomData();
        } else {
            // Chưa đăng nhập
            dom.loginContainer.style.display = 'flex';
            dom.dashboardContainer.style.display = 'none';
        }
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', async () => {
        if(confirm("Đăng xuất khỏi hệ thống?")) await signOut(auth);
    });
}

function setupLoginHandler() {
    dom.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admEmail').value;
        const pass = document.getElementById('admPass').value;
        const btn = dom.loginForm.querySelector('button');

        try {
            btn.innerText = "Đang xử lý...";
            dom.loginError.style.display = 'none';
            await signInWithEmailAndPassword(auth, email, pass);
            // onAuthStateChanged sẽ tự chuyển màn hình
        } catch (err) {
            console.error(err);
            dom.loginError.innerText = "Sai thông tin đăng nhập!";
            dom.loginError.style.display = 'block';
            btn.innerText = "Đăng nhập";
        }
    });
}

// --- PHẦN 2: ĐIỀU HƯỚNG TAB ---
function setupTabNavigation() {
    dom.navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Xử lý active menu
            dom.navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Chuyển nội dung
            const targetId = item.getAttribute('data-target');
            dom.sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Đổi tên tiêu đề
            dom.pageTitle.innerText = item.querySelector('span').innerText;
        });
    });
}

// --- PHẦN 3: QUẢN LÝ ĐẶT PHÒNG (BOOKINGS) ---
function initBookingData() {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        dom.bookingBody.innerHTML = "";
        let pending = 0;
        let total = 0;

        if(snapshot.empty) {
            dom.bookingBody.innerHTML = "<tr><td colspan='5' style='text-align:center'>Chưa có đơn hàng nào</td></tr>";
            return;
        }

        snapshot.forEach(doc => {
            const b = doc.data();
            b.id = doc.id;
            total++;
            if(b.status === 'pending') pending++;

            const tr = document.createElement('tr');
            // Format ngày
            const date = b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('vi-VN') : '---';
            
            // Badge trạng thái
            let statusClass = `status-${b.status}`;
            let statusText = b.status === 'pending' ? 'Chờ duyệt' : (b.status === 'confirmed' ? 'Đã duyệt' : 'Đã hủy');

            tr.innerHTML = `
                <td>${date}</td>
                <td>
                    <b>${b.customerName}</b><br>
                    <small>${b.customerPhone}</small>
                </td>
                <td>
                    <span style="color:var(--primary-color)">${b.roomType}</span><br>
                    <small>${b.checkIn} ➝ ${b.checkOut}</small>
                </td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    ${b.status === 'pending' ? `
                        <button class="btn-verify" data-id="${b.id}" style="color:green; border:1px solid green; background:white; cursor:pointer; padding:2px 5px; border-radius:3px;">✔ Duyệt</button>
                        <button class="btn-cancel" data-id="${b.id}" style="color:red; border:1px solid red; background:white; cursor:pointer; padding:2px 5px; border-radius:3px;">✖ Hủy</button>
                    ` : '<span style="color:#aaa">-</span>'}
                </td>
            `;
            dom.bookingBody.appendChild(tr);
        });

        // Update số liệu
        dom.countPending.innerText = pending;
        dom.countTotal.innerText = total;
    });

    // Event Delegation cho nút bấm trong bảng
    dom.bookingBody.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.getAttribute('data-id');

        if(target.classList.contains('btn-verify')) {
            if(confirm("Xác nhận đã nhận cọc/thanh toán cho đơn này?")) {
                await updateDoc(doc(db, "bookings", id), { status: 'confirmed' });
            }
        }
        if(target.classList.contains('btn-cancel')) {
            const reason = prompt("Lý do hủy đơn:");
            if(reason) {
                await updateDoc(doc(db, "bookings", id), { status: 'cancelled', cancelReason: reason });
            }
        }
    });
}

// --- PHẦN 4: QUẢN LÝ PHÒNG & XỬ LÝ ẢNH (QUAN TRỌNG) ---

// Hàm xử lý link Google Drive thành link ảnh hiển thị được
function convertDriveLink(url) {
    if(!url) return "";
    // Regex tìm ID của Google Drive
    const driveRegex = /\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    
    if (match && match[1]) {
        // Trả về link trực tiếp qua cổng googleusercontent (Load siêu nhanh)
        // Cách khác: https://drive.google.com/uc?export=view&id=ID
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url; // Nếu không phải link Drive thì giữ nguyên
}

function initRoomData() {
    const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        dom.roomBody.innerHTML = "";
        
        snapshot.forEach(doc => {
            const r = doc.data();
            const price = new Intl.NumberFormat('vi-VN').format(r.price);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <img src="${r.image}" onerror="this.src='https://via.placeholder.com/100x70?text=Lỗi+Ảnh'" 
                         style="width:80px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #eee;">
                </td>
                <td>
                    <b>${r.name}</b><br>
                    <span style="font-size:0.85em; color:#666;">${r.type}</span>
                </td>
                <td style="color:var(--primary-color); font-weight:bold;">${price} đ</td>
                <td><small>${r.description?.substring(0, 40)}...</small></td>
                <td>
                    <button class="btn-delete-room" data-id="${doc.id}" style="color:red; background:none; border:none; cursor:pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            dom.roomBody.appendChild(tr);
        });
    });

    // Xóa phòng
    dom.roomBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete-room');
        if(btn) {
            if(confirm("Bạn chắc chắn muốn xóa phòng này khỏi Website?")) {
                await deleteDoc(doc(db, "rooms", btn.dataset.id));
            }
        }
    });
}

function setupRoomManager() {
    // 1. Tự động chuyển link khi paste vào ô input
    dom.roomImageUrl.addEventListener('input', (e) => {
        const rawUrl = e.target.value;
        const convertedUrl = convertDriveLink(rawUrl);
        
        if(convertedUrl) {
            dom.imagePreview.src = convertedUrl;
            dom.imagePreview.style.display = 'block';
        } else {
            dom.imagePreview.style.display = 'none';
        }
    });

    // 2. Submit Form Thêm Phòng
    dom.roomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = dom.roomForm.querySelector('button');
        const oldText = btn.innerText;
        btn.innerText = "Đang lưu...";
        btn.disabled = true;

        try {
            const name = document.getElementById('roomName').value;
            const price = Number(document.getElementById('roomPrice').value);
            const type = document.getElementById('roomType').value;
            const desc = document.getElementById('roomDesc').value;
            const rawUrl = document.getElementById('roomImageUrl').value;
            
            // Chuyển link lần cuối trước khi lưu
            const finalImage = convertDriveLink(rawUrl) || "https://via.placeholder.com/400x300?text=No+Image";

            await addDoc(collection(db, "rooms"), {
                name, 
                price, 
                type, 
                description: desc,
                image: finalImage,
                createdAt: new Date()
            });

            alert("Đã thêm phòng thành công!");
            dom.roomForm.reset();
            dom.imagePreview.style.display = 'none';

        } catch (err) {
            console.error(err);
            alert("Lỗi: " + err.message);
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });
}
