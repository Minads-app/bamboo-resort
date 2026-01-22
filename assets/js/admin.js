// 1. IMPORT THƯ VIỆN (Đã bao gồm setDoc để lưu cấu hình)
import { db, auth } from '../../src/config/firebase-config.js';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("⚡ Admin V3.3 Loaded - Full Stable");

// --- 2. DOM ELEMENTS (Khai báo biến để dùng chung) ---
const dom = {
    // Auth & Layout
    loginContainer: document.getElementById('login-container'),
    dashboardContainer: document.getElementById('dashboard-container'),
    navItems: document.querySelectorAll('.nav-item'),
    sections: document.querySelectorAll('.content-section'),
    pageTitle: document.getElementById('pageTitle'),
    
    // Room Form Elements
    roomName: document.getElementById('roomName'),
    roomType: document.getElementById('roomType'),
    priceWeekday: document.getElementById('priceWeekday'),
    priceWeekend: document.getElementById('priceWeekend'),
    priceHoliday: document.getElementById('priceHoliday'),
    roomImageUrl: document.getElementById('roomImageUrl'),
    roomDesc: document.getElementById('roomDesc'),
    roomForm: document.getElementById('roomForm'),
    imagePreview: document.getElementById('imagePreview'),
    
    // Edit Mode Elements
    editRoomId: document.getElementById('editRoomId'),
    formTitle: document.getElementById('formTitle'), // Tiêu đề form (Thêm/Sửa)
    btnSaveRoom: document.getElementById('btnSaveRoom'),
    btnCancelEdit: document.getElementById('btnCancelEdit'),
    
    // Settings Elements (Lễ Tết)
    holidayInput: document.getElementById('holidayInput'),
    holidayNote: document.getElementById('holidayNote'),
    btnAddHoliday: document.getElementById('btnAddHoliday'),
    holidayList: document.getElementById('holidayList')
};

// Biến lưu tạm danh sách phòng để load dữ liệu khi sửa
window.allRooms = [];

// --- 3. HELPER FUNCTIONS (Hàm hỗ trợ) ---

// Chuyển đổi link Google Drive sang link ảnh trực tiếp
function convertDriveLink(url) {
    if (!url) return "";
    // Regex tìm ID file (hỗ trợ cả link /file/d/ID và id=ID)
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (match && match[1]) {
        // Dùng server lh3 googleusercontent để load ảnh nhanh & không bị lỗi
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    return url; // Nếu là link ảnh thường thì giữ nguyên
}

// Định dạng tiền tệ VNĐ
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0);
}

// --- 4. KHỞI TẠO ỨNG DỤNG ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();          // Kiểm tra đăng nhập
    setupTabNav();        // Cài đặt chuyển tab
    setupLogin();         // Cài đặt form login
    setupRoomManager();   // Logic quản lý phòng (Thêm/Sửa)
    setupSettingsManager(); // Logic cấu hình lễ tết
});

// --- 5. AUTHENTICATION ---
function checkAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            dom.loginContainer.style.display = 'none';
            dom.dashboardContainer.style.display = 'flex';
            document.getElementById('adminEmailDisplay').innerText = user.email;
            
            // Load dữ liệu khi đã đăng nhập
            initBookingData(); 
            initRoomData();
            initHolidayData();
        } else {
            dom.loginContainer.style.display = 'flex';
            dom.dashboardContainer.style.display = 'none';
        }
    });

    // Đăng xuất
    const btnLogout = document.getElementById('btnLogout');
    if(btnLogout) btnLogout.addEventListener('click', () => signOut(auth));
}

function setupLogin() {
    const loginForm = document.getElementById('adminLoginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('admEmail').value;
            const pass = document.getElementById('admPass').value;
            try { 
                await signInWithEmailAndPassword(auth, email, pass); 
            } catch (err) { 
                alert("Lỗi đăng nhập: " + err.message); 
            }
        });
    }
}

// --- 6. TAB NAVIGATION ---
function setupTabNav() {
    dom.navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Active menu item
            dom.navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Show content section
            const target = item.getAttribute('data-target');
            dom.sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(target);
            if(targetSection) targetSection.classList.add('active');
            
            // Update Title
            const span = item.querySelector('span');
            if(span) dom.pageTitle.innerText = span.innerText;
        });
    });
}

// --- 7. QUẢN LÝ PHÒNG (ROOMS) ---

// A. Hiển thị danh sách phòng
function initRoomData() {
    const tbody = document.getElementById('roomTableBody');
    if(!tbody) return;

    onSnapshot(collection(db, "rooms"), (snapshot) => {
        tbody.innerHTML = "";
        window.allRooms = []; // Reset cache

        snapshot.forEach(doc => {
            const r = doc.data();
            r.id = doc.id; 
            window.allRooms.push(r);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${r.image}" onerror="this.src='https://via.placeholder.com/50'" style="width:50px; height:35px; object-fit:cover; border-radius:4px;"></td>
                
                <td><b>${r.name}</b><br><small>${r.type}</small></td>
                
                <td>${formatMoney(r.priceWeekday)}</td>
                <td style="color:#2980b9; font-weight:500">${formatMoney(r.priceWeekend)}</td>
                <td style="color:#c0392b; font-weight:bold">${formatMoney(r.priceHoliday)}</td>
                
                <td>
                    <button class="btn-edit" data-id="${r.id}" style="color:#f39c12; border:none; background:none; cursor:pointer; font-size:1.1em; margin-right:10px;" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-del" data-id="${r.id}" style="color:red; border:none; background:none; cursor:pointer; font-size:1.1em;" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });

    // Event Delegation cho nút Sửa/Xóa
    tbody.addEventListener('click', async (e) => {
        // Xóa
        if(e.target.closest('.btn-del')) {
            if(confirm("Xóa phòng này khỏi hệ thống?")) {
                await deleteDoc(doc(db, "rooms", e.target.closest('.btn-del').dataset.id));
            }
        }
        // Sửa -> Đẩy dữ liệu lên Form
        if(e.target.closest('.btn-edit')) {
            const id = e.target.closest('.btn-edit').dataset.id;
            loadRoomToForm(id);
        }
    });
}

// B. Đưa dữ liệu lên Form để Sửa
function loadRoomToForm(id) {
    const room = window.allRooms.find(r => r.id === id);
    if (!room) return;

    // Fill inputs
    dom.editRoomId.value = room.id;
    dom.roomName.value = room.name;
    dom.roomType.value = room.roomType || room.type; // support cũ/mới
    dom.priceWeekday.value = room.priceWeekday;
    dom.priceWeekend.value = room.priceWeekend;
    dom.priceHoliday.value = room.priceHoliday;
    dom.roomImageUrl.value = room.image;
    dom.roomDesc.value = room.description;

    // Show preview & Update UI buttons
    dom.imagePreview.src = room.image;
    dom.imagePreview.style.display = 'block';

    if(dom.formTitle) dom.formTitle.innerText = "Chỉnh Sửa Phòng";
    if(dom.btnSaveRoom) {
        dom.btnSaveRoom.innerText = "Cập Nhật";
        dom.btnSaveRoom.style.background = "#f39c12"; // Cam
    }
    if(dom.btnCancelEdit) dom.btnCancelEdit.style.display = "inline-block";

    // Scroll to form
    dom.roomForm.scrollIntoView({ behavior: 'smooth' });
}

// C. Reset Form về trạng thái thêm mới
function resetRoomForm() {
    if(dom.roomForm) dom.roomForm.reset();
    if(dom.editRoomId) dom.editRoomId.value = "";
    if(dom.imagePreview) dom.imagePreview.style.display = 'none';
    
    if(dom.formTitle) dom.formTitle.innerText = "Thêm Phòng Mới";
    if(dom.btnSaveRoom) {
        dom.btnSaveRoom.innerText = "Lưu Phòng";
        dom.btnSaveRoom.style.background = "var(--primary-color)";
    }
    if(dom.btnCancelEdit) dom.btnCancelEdit.style.display = "none";
}

// D. Setup Logic Form
function setupRoomManager() {
    // 1. Preview ảnh khi nhập link
    if(dom.roomImageUrl) {
        dom.roomImageUrl.addEventListener('input', (e) => {
            const url = convertDriveLink(e.target.value);
            if(url) { 
                dom.imagePreview.src = url; 
                dom.imagePreview.style.display = 'block'; 
            } else { 
                dom.imagePreview.style.display = 'none'; 
            }
        });
    }

    // 2. Nút Hủy
    if(dom.btnCancelEdit) dom.btnCancelEdit.addEventListener('click', resetRoomForm);

    // 3. Submit Form (Thêm hoặc Sửa)
    if(dom.roomForm) {
        dom.roomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = dom.btnSaveRoom;
            const oldText = btn.innerText;
            btn.innerText = "Đang xử lý...";
            btn.disabled = true;

            try {
                // Lấy link ảnh chuẩn
                const finalImage = convertDriveLink(dom.roomImageUrl.value) || "https://via.placeholder.com/400x300?text=No+Image";
                
                const payload = {
                    name: dom.roomName.value,
                    type: dom.roomType.value,
                    priceWeekday: Number(dom.priceWeekday.value),
                    priceWeekend: Number(dom.priceWeekend.value),
                    priceHoliday: Number(dom.priceHoliday.value),
                    price: Number(dom.priceWeekday.value), // Default price display
                    description: dom.roomDesc.value,
                    image: finalImage,
                    updatedAt: new Date()
                };

                const editingId = dom.editRoomId.value;
                if (editingId) {
                    // Update
                    await updateDoc(doc(db, "rooms", editingId), payload);
                    alert("Đã cập nhật phòng thành công!");
                } else {
                    // Create new
                    payload.createdAt = new Date();
                    await addDoc(collection(db, "rooms"), payload);
                    alert("Đã thêm phòng mới!");
                }
                resetRoomForm();

            } catch (err) {
                console.error(err);
                alert("Lỗi: " + err.message);
            } finally {
                btn.innerText = oldText;
                btn.disabled = false;
            }
        });
    }
}

// --- 8. CẤU HÌNH LỄ TẾT (SETTINGS) ---

async function initHolidayData() {
    const listContainer = document.getElementById('holidayList');
    if(!listContainer) return;

    onSnapshot(doc(db, "settings", "holidays"), (docSnap) => {
        listContainer.innerHTML = "";
        if (docSnap.exists()) {
            const dates = docSnap.data().dates || [];
            if(dates.length === 0) return listContainer.innerHTML = "<p style='color:#999; text-align:center'>Chưa có ngày lễ nào.</p>";

            // Sắp xếp ngày tăng dần
            dates.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Render
            dates.forEach((item, index) => {
                const tag = document.createElement('span');
                tag.className = 'holiday-tag';
                const dateVi = item.date.split('-').reverse().join('/');
                tag.innerHTML = `<b>${dateVi}</b>: ${item.note} <i class="fas fa-times" onclick="removeHoliday(${index})" title="Xóa"></i>`;
                listContainer.appendChild(tag);
            });
            window.currentHolidays = dates; 
        } else {
            listContainer.innerHTML = "<p style='color:#999; text-align:center'>Chưa cấu hình.</p>";
            window.currentHolidays = [];
        }
    });
}

function setupSettingsManager() {
    if(!dom.btnAddHoliday) return;

    dom.btnAddHoliday.addEventListener('click', async () => {
        const dateVal = dom.holidayInput.value;
        const noteVal = dom
