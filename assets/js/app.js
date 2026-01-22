// assets/js/app.js
// Thêm dòng này vào đầu file cùng các import khác
import { registerUser, loginUser } from '../../src/auth/auth-service.js';
// 1. Import Modules
import { auth } from '../../src/config/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 2. DOM Elements (Lấy các phần tử HTML cần thao tác)
const elements = {
    hamburger: document.getElementById('hamburger'),
    navLinks: document.getElementById('navLinks'),
    loginBtn: document.querySelector('.btn-login'), // Nút trên menu
    authModal: document.getElementById('authModal'),
    closeModal: document.querySelector('.close-modal'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    authForms: document.querySelectorAll('.auth-form'),
    logoutBtn: document.getElementById('btnLogout') // Nút đăng xuất (sẽ tạo thêm)
};

// 3. Khởi tạo Ứng dụng
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    console.log("🚀 Bamboo App Initializing...");
    setupMobileMenu();
    setupAuthObserver();
    setupModalLogic();
    setupAuthForms(); // <--- THÊM DÒNG NÀY
}

// --- A. Logic Giao Diện (UI Logic) ---
function setupAuthForms() {
    // 1. Xử lý Đăng nhập
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Chặn việc load lại trang
            
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            const btn = loginForm.querySelector('button');

            // Hiệu ứng loading
            const originalText = btn.innerText;
            btn.innerText = "Đang xử lý...";
            btn.disabled = true;

            // Gọi Service
            const result = await loginUser(email, pass);

            if (result.success) {
                // Thành công -> Modal sẽ tự đóng nhờ setupAuthObserver
                // Có thể điều hướng nếu là Admin
                if (result.role === 'admin' || result.role === 'staff') {
                    if(confirm("Phát hiện quyền Quản trị. Bạn có muốn vào trang Admin không?")) {
                        window.location.href = "admin.html";
                    }
                }
            } else {
                alert(result.message); // Hiện lỗi tiếng Việt
            }

            // Reset nút
            btn.innerText = originalText;
            btn.disabled = false;
        });
    }

    // 2. Xử lý Đăng ký
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('regEmail').value;
            const pass = document.getElementById('regPass').value;
            const confirmPass = document.getElementById('regPassConfirm').value;
            const btn = registerForm.querySelector('button');

            // Validate cơ bản
            if (pass !== confirmPass) {
                alert("Mật khẩu xác nhận không khớp!");
                return;
            }

            // Hiệu ứng loading
            const originalText = btn.innerText;
            btn.innerText = "Đang đăng ký...";
            btn.disabled = true;

            // Gọi Service
            const result = await registerUser(email, pass);

            if (result.success) {
                alert("Đăng ký thành công! Chào mừng bạn đến với Bamboo Resort.");
                // Form sẽ tự đóng nhờ setupAuthObserver
            } else {
                alert(result.message);
            }

            // Reset nút
            btn.innerText = originalText;
            btn.disabled = false;
        });
    }
}
function setupMobileMenu() {
    if (elements.hamburger && elements.navLinks) {
        elements.hamburger.addEventListener('click', () => {
            elements.navLinks.classList.toggle('active');
            // Đổi icon từ 3 gạch sang X (Optional)
            const icon = elements.hamburger.querySelector('i');
            if (elements.navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }
}

function setupModalLogic() {
    // 1. Mở Modal
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', (e) => {
            if (!auth.currentUser) {
                e.preventDefault();
                // Thay vì style.display = 'flex', ta dùng class để CSS xử lý
                elements.authModal.style.display = 'flex'; 
            }
        });
    }

    // 2. Đóng Modal
    const closeModalFunc = () => {
        elements.authModal.style.display = 'none';
    };

    if (elements.closeModal) {
        elements.closeModal.addEventListener('click', closeModalFunc);
    }

    // Đóng khi click ra vùng đen bên ngoài
    window.addEventListener('click', (e) => {
        if (e.target === elements.authModal) {
            closeModalFunc();
        }
    });

    // 3. Chuyển Tab (Đăng nhập <-> Đăng ký)
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Xóa active cũ
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            elements.authForms.forEach(f => f.classList.remove('active'));

            // Active mới
            btn.classList.add('active');
            const formId = btn.getAttribute('data-target');
            document.getElementById(formId).classList.add('active');
        });
    });
}

// --- B. Logic Xác thực (Authentication Logic) ---

function setupAuthObserver() {
    // Hàm này của Firebase sẽ tự chạy mỗi khi F5 hoặc user đăng nhập/xuất
    onAuthStateChanged(auth, (user) => {
        if (user) {
            handleUserLoggedIn(user);
        } else {
            handleUserLoggedOut();
        }
    });
}

function handleUserLoggedIn(user) {
    console.log("✅ User đã đăng nhập:", user.email);
    
    // 1. Đổi nút "Đăng nhập" thành thông tin user
    if (elements.loginBtn) {
        // Cắt lấy tên email trước @ để hiển thị cho ngắn
        const displayName = user.displayName || user.email.split('@')[0];
        
        elements.loginBtn.innerHTML = `
            <i class="fas fa-user-circle"></i> Hello, ${displayName} 
            <i class="fas fa-caret-down"></i>
        `;
        elements.loginBtn.href = "#profile"; // Sau này dẫn tới trang cá nhân
        
        // Thêm class logged-in để CSS xử lý dropdown nếu cần
        elements.loginBtn.classList.add('logged-in'); 
        
        // Gắn sự kiện Đăng xuất (Click vào nút Hello để logout - Demo đơn giản)
        // Thực tế nên làm Dropdown menu
        elements.loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const confirmLogout = confirm("Bạn muốn đăng xuất?");
            if(confirmLogout) performLogout();
        });
    }

    // 2. Ẩn Modal nếu đang mở
    if (elements.authModal) elements.authModal.style.display = 'none';
}

function handleUserLoggedOut() {
    console.log("👋 Chưa có ai đăng nhập");
    
    if (elements.loginBtn) {
        elements.loginBtn.innerHTML = `<i class="fas fa-user"></i> Đăng nhập`;
        elements.loginBtn.classList.remove('logged-in');
        
        // Re-attach event listener mở modal (vì ở trên đã bị override bởi sự kiện logout)
        // Cách tốt nhất là reload trang hoặc dùng Event Delegation, nhưng ở đây ta để đơn giản
    }
}

async function performLogout() {
    try {
        await signOut(auth);
        alert("Đã đăng xuất thành công!");
        window.location.reload(); // Tải lại trang để reset trạng thái sạch sẽ
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
        alert("Có lỗi xảy ra khi đăng xuất.");
    }
}