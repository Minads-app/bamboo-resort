import { db, auth } from '../../src/config/firebase-config.js';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("⚡ Admin V3.2 Loaded - Full CRUD");

// --- 1. DOM ELEMENTS ---
const dom = {
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
    editRoomId: document.getElementById('editRoomId'), // Hidden Input
    formTitle: document.getElementById('formTitle'),
    btnSaveRoom: document.getElementById('btnSaveRoom'),
    btnCancelEdit: document.getElementById('btnCancelEdit'),
    
    // Holiday Elements
    holidayInput: document.getElementById('holidayInput'),
    holidayNote: document.getElementById('holidayNote'),
    btnAddHoliday: document.getElementById('btnAddHoliday'),
    holidayList: document.getElementById('holidayList')
};

// Biến toàn cục để lưu danh sách phòng (giúp lấy dữ liệu khi bấm Sửa nhanh hơn)
window.allRooms = [];

// --- 2. HELPERS ---
function convertDriveLink(url) {
    if (!url) return "";
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    return (match && match[1]) ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0);
}

// --- 3. INIT ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupTabNav();
    setupLogin();
    setupRoomManager();
    setupSettingsManager();
});

// --- 4. AUTH & TABS ---
function checkAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            dom.loginContainer.style.display = 'none';
            dom.dashboardContainer.style.display = 'flex';
            document.getElementById('adminEmailDisplay').innerText = user.email;
            initBookingData(); 
            initRoomData();
            initHolidayData();
        } else {
            dom.loginContainer.style.display = 'flex';
            dom.dashboardContainer.style.display = 'none';
        }
    });
    document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));
}

function setupLogin() {
    document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await signInWithEmailAndPassword(auth, document.getElementById('admEmail').value, document.getElementById('admPass').value); } 
        catch (err) { alert("Lỗi: " + err.message); }
    });
}

function setupTabNav() {
    dom.navItems.forEach(item => {
        item.addEventListener('click', () => {
            dom.navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            dom.sections.forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            dom.pageTitle.innerText = item.querySelector('span').innerText;
        });
    });
}

// --- 5. ROOM MANAGER (LOGIC SỬA ĐƯỢC THÊM VÀO ĐÂY) ---
function initRoomData() {
    // 1. Khai báo tbody ngay đầu hàm để dùng chung
    const tbody = document.getElementById('roomTableBody');
    onSnapshot(collection(db, "rooms"), (snapshot) => {
        const tbody = document.getElementById('roomTableBody');
        tbody.innerHTML = "";
        window.allRooms = []; 

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

    // Event Delegation (Xử lý click nút Sửa/Xóa)
    document.getElementById('roomTableBody').addEventListener('click', async (e) => {
        // XỬ LÝ XÓA
        if(e.target.closest('.btn-del')) {
            if(confirm("Xóa phòng này?")) await deleteDoc(doc(db, "rooms", e.target.closest('.btn-del').dataset.id));
        }
        // XỬ LÝ SỬA
        if(e.target.closest('.btn-edit')) {
            const id = e.target.closest('.btn-edit').dataset.id;
            loadRoomToForm(id); // Gọi hàm điền dữ liệu lên form
        }
    });
}

function loadRoomToForm(id) {
    // Tìm phòng trong mảng đã lưu
    const room = window.allRooms.find(r => r.id === id);
    if (!room) return;

    // Điền dữ liệu vào form
    dom.editRoomId.value = room.id; // Quan trọng: Đánh dấu đang sửa ID này
    dom.roomName.value = room.name;
    dom.roomType.value = room.roomType || room.type;
    dom.priceWeekday.value = room.priceWeekday;
    dom.priceWeekend.value = room.priceWeekend;
    dom.priceHoliday.value = room.priceHoliday;
    dom.roomImageUrl.value = room.image;
    dom.roomDesc.value = room.description;

    // Trigger hiển thị ảnh preview
    dom.imagePreview.src = room.image;
    dom.imagePreview.style.display = 'block';

    // Đổi giao diện sang chế độ "Cập nhật"
    dom.formTitle.innerText = "Chỉnh Sửa Thông Tin Phòng";
    dom.btnSaveRoom.innerText = "Cập Nhật Thay Đổi";
    dom.btnSaveRoom.style.background = "#f39c12"; // Màu cam
    dom.btnCancelEdit.style.display = "inline-block";

    // Cuộn lên form
    dom.roomForm.scrollIntoView({ behavior: 'smooth' });
}

function resetForm() {
    dom.roomForm.reset();
    dom.editRoomId.value = ""; // Xóa ID đang sửa
    dom.imagePreview.style.display = 'none';
    
    // Trả lại giao diện "Thêm mới"
    dom.formTitle.innerText = "Thêm Phòng Mới";
    dom.btnSaveRoom.innerText = "Lưu Phòng";
    dom.btnSaveRoom.style.background = "var(--primary-color)";
    dom.btnCancelEdit.style.display = "none";
}

function setupRoomManager() {
    // Preview ảnh
    dom.roomImageUrl.addEventListener('input', (e) => {
        const url = convertDriveLink(e.target.value);
        if(url) { dom.imagePreview.src = url; dom.imagePreview.style.display = 'block'; }
        else { dom.imagePreview.style.display = 'none'; }
    });

    // Nút Hủy Sửa
    dom.btnCancelEdit.addEventListener('click', resetForm);

    // Submit Form (Xử lý cả Thêm và Sửa)
    dom.roomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const editingId = dom.editRoomId.value; // Lấy ID (nếu đang sửa)
        const btn = dom.btnSaveRoom;
        const oldText = btn.innerText;
        btn.innerText = "Đang xử lý...";
        btn.disabled = true;

        try {
            const finalImage = convertDriveLink(dom.roomImageUrl.value) || "https://via.placeholder.com/400";
            
            const payload = {
                name: dom.roomName.value,
                type: dom.roomType.value,
                priceWeekday: Number(dom.priceWeekday.value),
                priceWeekend: Number(dom.priceWeekend.value),
                priceHoliday: Number(dom.priceHoliday.value),
                price: Number(dom.priceWeekday.value), 
                description: dom.roomDesc.value,
                image: finalImage,
                updatedAt: new Date()
            };

            if (editingId) {
                // CHẾ ĐỘ SỬA: Update
                await updateDoc(doc(db, "rooms", editingId), payload);
                alert("Đã cập nhật thông tin phòng!");
            } else {
                // CHẾ ĐỘ THÊM: Add
                payload.createdAt = new Date();
                await addDoc(collection(db, "rooms"), payload);
                alert("Đã thêm phòng mới thành công!");
            }

            resetForm(); // Reset form sau khi xong

        } catch (err) {
            alert("Lỗi: " + err.message);
        } finally {
            btn.innerText = oldText; // Trả lại text cũ (Lưu Phòng / Cập nhật)
            btn.disabled = false;
        }
    });
}

// --- 6. SETTINGS & BOOKINGS (GIỮ NGUYÊN) ---
async function initHolidayData() {
    const docRef = doc(db, "settings", "holidays");
    onSnapshot(docRef, (docSnap) => {
        dom.holidayList.innerHTML = "";
        if (docSnap.exists()) {
            const dates = docSnap.data().dates || [];
            if(dates.length === 0) return dom.holidayList.innerHTML = "<p>Chưa có ngày lễ.</p>";
            dates.sort((a, b) => new Date(a.date) - new Date(b.date));
            dates.forEach((item, index) => {
                const tag = document.createElement('span');
                tag.className = 'holiday-tag';
                tag.innerHTML = `<b>${item.date.split('-').reverse().join('/')}</b>: ${item.note} <i class="fas fa-times" onclick="removeHoliday(${index})"></i>`;
                dom.holidayList.appendChild(tag);
            });
            window.currentHolidays = dates; 
        } else { dom.holidayList.innerHTML = "<p>Chưa cấu hình.</p>"; window.currentHolidays = []; }
    });
}

function setupSettingsManager() {
    if(dom.btnAddHoliday) {
        dom.btnAddHoliday.addEventListener('click', async () => {
            const dateVal = dom.holidayInput.value;
            if(!dateVal) return alert("Chọn ngày!");
            let newDates = window.currentHolidays || [];
            if(newDates.some(d => d.date === dateVal)) return alert("Ngày này đã có!");
            newDates.push({ date: dateVal, note: dom.holidayNote.value || 'Lễ' });
            await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
            dom.holidayInput.value = ""; dom.holidayNote.value = "";
        });
    }
}
window.removeHoliday = async (i) => {
    if(confirm("Xóa ngày lễ này?")) {
        let d = window.currentHolidays; d.splice(i, 1);
        await setDoc(doc(db, "settings", "holidays"), { dates: d });
    }
};

function initBookingData() {
    onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), (snapshot) => {
        const tbody = document.getElementById('bookingTableBody');
        tbody.innerHTML = "";
        if(snapshot.empty) tbody.innerHTML = "<tr><td colspan='5'>Chưa có đơn hàng</td></tr>";
        snapshot.forEach(doc => {
            const b = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.createdAt?.toDate().toLocaleDateString('vi-VN')}</td>
                <td>${b.customerName}<br><small>${b.customerPhone}</small></td>
                <td>${b.roomType}</td>
                <td><span class="badge status-${b.status}">${b.status}</span></td>
                <td>${b.status==='pending' ? `<button onclick="verifyBooking('${doc.id}')" style="color:green;cursor:pointer">✔ Duyệt</button>`:''}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}
window.verifyBooking = async (id) => await updateDoc(doc(db, "bookings", id), {status:'confirmed'});


