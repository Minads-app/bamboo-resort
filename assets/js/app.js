// 1. IMPORTS
import { auth } from '../../src/config/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { registerUser, loginUser } from '../../src/auth/auth-service.js';
import { createBooking } from '../../src/services/booking-service.js'; // <--- Import Mới

console.log("🚀 App Loaded.");

// 2. DOM ELEMENTS
const elements = {
    hamburger: document.getElementById('hamburger'),
    navLinks: document.getElementById('navLinks'),
    loginBtn: document.querySelector('.btn-login'),
    
    // Auth Modal Elements
    authModal: document.getElementById('authModal'),
    closeAuthModal: document.getElementById('closeAuthModal'), // Đã đổi ID cho rõ ràng
    tabBtns: document.querySelectorAll('.tab-btn'),
    authForms: document.querySelectorAll('.auth-form'),
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),

    // Booking Elements (MỚI)
    bookingForm: document.getElementById('bookingForm'),         // Form ở Hero
    bookingModal: document.getElementById('bookingModal'),       // Modal xác nhận
    closeBookingModal: document.getElementById('closeBookingModal'),
    confirmBookingForm: document.getElementById('confirmBookingForm'), // Form trong Modal
    
    // Inputs trong Booking Modal
    summaryRoom: document.getElementById('summaryRoom'),
    summaryDates: document.getElementById('summaryDates'),
    guestName: document.getElementById('guestName'),
    guestPhone: document.getElementById('guestPhone'),
    guestEmail: document.getElementById('guestEmail'),
    guestNote: document.getElementById('guestNote')
};

// Biến lưu tạm dữ liệu từ Bước 1
let tempBookingData = {};

// 3. KHỞI TẠO APP
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    setupAuthObserver();
    setupModalLogic();
    setupAuthForms();
    setupBookingLogic(); // <--- Logic Mới
});

// --- LOGIC UI & MODALS ---
function setupMobileMenu() {
    if (elements.hamburger) {
        elements.hamburger.addEventListener('click', () => {
            elements.navLinks.classList.toggle('active');
        });
    }
}

function setupModalLogic() {
    // A. Xử lý Auth Modal (Đăng nhập)
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (user) {
                if(confirm("Bạn có muốn đăng xuất?")) performLogout();
            } else {
                elements.authModal.style.display = 'flex';
            }
        });
    }

    // Đóng Auth Modal
    if(elements.closeAuthModal) {
        elements.closeAuthModal.addEventListener('click', () => {
            elements.authModal.style.display = 'none';
        });
    }

    // Tab chuyển đổi Login/Register
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            elements.authForms.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // B. Xử lý Booking Modal (Đã được gọi trong setupBookingLogic, xử lý đóng ở đây cho gọn)
    if(elements.closeBookingModal) {
        elements.closeBookingModal.addEventListener('click', () => {
            elements.bookingModal.style.display = 'none';
        });
    }

    // Đóng khi click ra ngoài (chung cho cả 2 modal)
    window.addEventListener('click', (e) => {
        if (e.target === elements.authModal) elements.authModal.style.display = 'none';
        if (e.target === elements.bookingModal) elements.bookingModal.style.display = 'none';
    });
}

// --- LOGIC BOOKING (QUAN TRỌNG) ---
function setupBookingLogic() {
    // Bước 1: Khách chọn ngày & phòng ở trang chủ -> Bấm Đặt
    if (elements.bookingForm) {
        elements.bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const inputs = elements.bookingForm.querySelectorAll('input, select');
            
            // Lưu tạm dữ liệu
            tempBookingData = {
                checkIn: inputs[0].value,
                checkOut: inputs[1].value,
                roomType: inputs[2].value
            };

            // Hiển thị tóm tắt lên Modal
            elements.summaryRoom.innerText = tempBookingData.roomType;
            elements.summaryDates.innerText = `${tempBookingData.checkIn} đến ${tempBookingData.checkOut}`;

            // Tự động điền email nếu đã đăng nhập (Tiện ích UX)
            if (auth.currentUser) {
                elements.guestEmail.value = auth.currentUser.email;
                // Nếu User có lưu tên trong profile thì điền luôn (chưa làm tính năng profile nên để trống)
            }

            // Hiện Modal Bước 2
            elements.bookingModal.style.display = 'flex';
        });
    }

    // Bước 2: Khách điền tên & xác nhận
    if (elements.confirmBookingForm) {
        elements.confirmBookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = elements.confirmBookingForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Đang xử lý...";
            btn.disabled = true;

            // Tổng hợp dữ liệu cuối cùng
            const finalBookingData = {
                ...tempBookingData, // checkIn, checkOut, roomType
                customerName: elements.guestName.value,
                customerPhone: elements.guestPhone.value,
                customerEmail: elements.guestEmail.value,
                note: elements.guestNote.value,
                userId: auth.currentUser ? auth.currentUser.uid : 'guest', // Phân loại khách
                isGuest: !auth.currentUser // Cờ đánh dấu khách vãng lai
            };

            console.log("📦 Sending Booking:", finalBookingData);

            // Gọi Service
            const result = await createBooking(finalBookingData);

            if (result.success) {
                alert(`✅ Đặt phòng thành công!\nMã đơn hàng: ${result.id}\nChúng tôi sẽ liên hệ qua SĐT ${finalBookingData.customerPhone}.`);
                elements.bookingModal.style.display = 'none';
                elements.confirmBookingForm.reset();
                elements.bookingForm.reset();
            } else {
                alert("❌ Có lỗi xảy ra: " + result.message);
            }

            btn.innerText = originalText;
            btn.disabled = false;
        });
    }
}

// --- LOGIC AUTH ---
function setupAuthObserver() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const name = user.email.split('@')[0];
            if(elements.loginBtn) {
                elements.loginBtn.innerHTML = `<i class="fas fa-user-check"></i> Hello, ${name}`;
                elements.loginBtn.classList.add('logged-in');
            }
            if(elements.authModal) elements.authModal.style.display = 'none';
        } else {
            if(elements.loginBtn) {
                elements.loginBtn.innerHTML = `<i class="fas fa-user"></i> Đăng nhập`;
                elements.loginBtn.classList.remove('logged-in');
            }
        }
    });
}

async function performLogout() {
    try {
        await signOut(auth);
        alert("Đã đăng xuất.");
        window.location.reload();
    } catch (error) {
        console.error(error);
    }
}

function setupAuthForms() {
    // Xử lý form Login
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = elements.loginForm.querySelector('button');
            btn.innerText = "...";
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            
            const res = await loginUser(email, pass);
            if(!res.success) alert(res.message);
            btn.innerText = "Đăng nhập";
        });
    }

    // Xử lý form Register
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pass = document.getElementById('regPass').value;
            const confirm = document.getElementById('regPassConfirm').value;
            if(pass !== confirm) return alert("Mật khẩu không khớp!");

            const btn = elements.registerForm.querySelector('button');
            btn.innerText = "...";
            const email = document.getElementById('regEmail').value;
            
            const res = await registerUser(email, pass);
            if(res.success) alert("Đăng ký thành công!");
            else alert(res.message);
            btn.innerText = "Đăng ký ngay";
        });
    }
}
