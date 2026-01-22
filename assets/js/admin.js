// 1. IMPORT
import { db, auth } from '../../src/config/firebase-config.js';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("⚡ Admin V3.3 Final Loaded");

// --- 2. DOM ELEMENTS ---
const dom = {
    // Auth
    loginContainer: document.getElementById('login-container'),
    dashboardContainer: document.getElementById('dashboard-container'),
    navItems: document.querySelectorAll('.nav-item'),
    sections: document.querySelectorAll('.content-section'),
    pageTitle: document.getElementById('pageTitle'),
    
    // Room Form
    roomName: document.getElementById('roomName'),
    roomType: document.getElementById('roomType'),
    priceWeekday: document.getElementById('priceWeekday'),
    priceWeekend: document.getElementById('priceWeekend'),
    priceHoliday: document.getElementById('priceHoliday'),
    roomImageUrl: document.getElementById('roomImageUrl'),
    roomDesc: document.getElementById('roomDesc'),
    roomForm: document.getElementById('roomForm'),
    imagePreview: document.getElementById('imagePreview'),
    
    // Edit Mode
    editRoomId: document.getElementById('editRoomId'),
    formTitle: document.getElementById('formTitle'),
    btnSaveRoom: document.getElementById('btnSaveRoom'),
    btnCancelEdit: document.getElementById('btnCancelEdit'),
    
    // Settings
    holidayInput: document.getElementById('holidayInput'),
    holidayNote: document.getElementById('holidayNote'),
    btnAddHoliday: document.getElementById('btnAddHoliday'),
    holidayList: document.getElementById('holidayList')
};

window.allRooms = []; // Cache list rooms

// --- 3. HELPER FUNCTIONS ---
function convertDriveLink(url) {
    if (!url) return "";
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=s1000?authuser=0`;
    }
    return url;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0);
}

// --- 4. INIT ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupTabNav();
    setupLogin();
    setupRoomManager();
    setupSettingsManager();
});

// --- 5. AUTH ---
function checkAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if(dom.loginContainer) dom.loginContainer.style.display = 'none';
            if(dom.dashboardContainer) dom.dashboardContainer.style.display = 'flex';
            const emailDisplay = document.getElementById('adminEmailDisplay');
            if(emailDisplay) emailDisplay.innerText = user.email;
            
            initBookingData(); 
            initRoomData();
            initHolidayData();
        } else {
            if(dom.loginContainer) dom.loginContainer.style.display = 'flex';
            if(dom.dashboardContainer) dom.dashboardContainer.style.display = 'none';
        }
    });

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

// --- 6. TABS ---
function setupTabNav() {
    dom.navItems.forEach(item => {
        item.addEventListener('click', () => {
            dom.navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            const target = item.getAttribute('data-target');
            dom.sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(target);
            if(targetSection) targetSection.classList.add('active');
            
            const span = item.querySelector('span');
            if(span && dom.pageTitle) dom.pageTitle.innerText = span.innerText;
        });
    });
}

// --- 7. ROOMS ---
function initRoomData() {
    const tbody = document.getElementById('roomTableBody');
    if(!tbody) return;

    onSnapshot(collection(db, "rooms"), (snapshot) => {
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
                    <button class="btn-edit" data-id="${r.id}" style="color:#f39c12; border:none; background:none; cursor:pointer; font-size:1.1em; margin-right:10px;"><i class="fas fa-edit"></i></button>
                    <button class="btn-del" data-id="${r.id}" style="color:red; border:none; background:none; cursor:pointer; font-size:1.1em;"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });

    tbody.addEventListener('click', async (e) => {
        if(e.target.closest('.btn-del')) {
            if(confirm("Xóa phòng này?")) {
                await deleteDoc(doc(db, "rooms", e.target.closest('.btn-del').dataset.id));
            }
        }
        if(e.target.closest('.btn-edit')) {
            loadRoomToForm(e.target.closest('.btn-edit').dataset.id);
        }
    });
}

function loadRoomToForm(id) {
    const room = window.allRooms.find(r => r.id === id);
    if (!room) return;

    dom.editRoomId.value = room.id;
    dom.roomName.value = room.name;
    dom.roomType.value = room.roomType || room.type;
    dom.priceWeekday.value = room.priceWeekday;
    dom.priceWeekend.value = room.priceWeekend;
    dom.priceHoliday.value = room.priceHoliday || room.priceWeekend;
    dom.roomImageUrl.value = room.image;
    dom.roomDesc.value = room.description;

    dom.imagePreview.src = room.image;
    dom.imagePreview.style.display = 'block';

    if(dom.formTitle) dom.formTitle.innerText = "Sửa Phòng";
    if(dom.btnSaveRoom) {
        dom.btnSaveRoom.innerText = "Cập Nhật";
        dom.btnSaveRoom.style.background = "#f39c12";
    }
    if(dom.btnCancelEdit) dom.btnCancelEdit.style.display = "inline-block";
    
    dom.roomForm.scrollIntoView({ behavior: 'smooth' });
}

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

function setupRoomManager() {
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

    if(dom.btnCancelEdit) dom.btnCancelEdit.addEventListener('click', resetRoomForm);

    if(dom.roomForm) {
        dom.roomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
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

                const editingId = dom.editRoomId.value;
                if (editingId) {
                    await updateDoc(doc(db, "rooms", editingId), payload);
                    alert("Đã cập nhật!");
                } else {
                    payload.createdAt = new Date();
                    await addDoc(collection(db, "rooms"), payload);
                    alert("Đã thêm mới!");
                }
                resetRoomForm();
            } catch (err) {
                alert("Lỗi: " + err.message);
            } finally {
                btn.innerText = oldText;
                btn.disabled = false;
            }
        });
    }
}

// --- 8. SETTINGS ---
async function initHolidayData() {
    const listContainer = document.getElementById('holidayList');
    if(!listContainer) return;

    onSnapshot(doc(db, "settings", "holidays"), (docSnap) => {
        listContainer.innerHTML = "";
        if (docSnap.exists()) {
            const dates = docSnap.data().dates || [];
            if(dates.length === 0) {
                listContainer.innerHTML = "<p style='color:#999;text-align:center'>Chưa có ngày lễ.</p>";
                return;
            }
            dates.sort((a, b) => new Date(a.date) - new Date(b.date));
            dates.forEach((item, index) => {
                const tag = document.createElement('span');
                tag.className = 'holiday-tag';
                const dateVi = item.date.split('-').reverse().join('/');
                tag.innerHTML = `<b>${dateVi}</b>: ${item.note} <i class="fas fa-times" onclick="removeHoliday(${index})"></i>`;
                listContainer.appendChild(tag);
            });
            window.currentHolidays = dates; 
        } else {
            listContainer.innerHTML = "<p style='color:#999;text-align:center'>Chưa cấu hình.</p>";
            window.currentHolidays = [];
        }
    });
}

function setupSettingsManager() {
    if(!dom.btnAddHoliday) return;

    dom.btnAddHoliday.addEventListener('click', async () => {
        const dateVal = dom.holidayInput.value;
        const noteVal = dom.holidayNote.value;
        if(!dateVal) return alert("Chọn ngày!");

        let newDates = window.currentHolidays || [];
        if(newDates.some(d => d.date === dateVal)) return alert("Ngày này đã có!");

        newDates.push({ date: dateVal, note: noteVal || 'Lễ' });
        await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
        
        dom.holidayInput.value = "";
        dom.holidayNote.value = "";
    });
}

window.removeHoliday = async (index) => {
    if(confirm("Xóa ngày lễ này?")) {
        let newDates = window.currentHolidays;
        newDates.splice(index, 1);
        await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
    }
};

// --- 9. BOOKINGS ---
function initBookingData() {
    const tbody = document.getElementById('bookingTableBody');
    if(!tbody) return;

    onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), (snapshot) => {
        tbody.innerHTML = "";
        if(snapshot.empty) tbody.innerHTML = "<tr><td colspan='5' style='text-align:center'>Chưa có đơn hàng</td></tr>";

        snapshot.forEach(doc => {
            const b = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('vi-VN') : '---'}</td>
                <td><b>${b.customerName}</b><br><small>${b.customerPhone}</small></td>
                <td>${b.roomType}</td>
                <td><span class="badge status-${b.status}">${b.status}</span></td>
                <td>${b.status==='pending' ? `<button onclick="verifyBooking('${doc.id}')" style="color:green;cursor:pointer;border:1px solid green;background:white;padding:2px 5px;border-radius:3px;">✔ Duyệt</button>`:''}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

window.verifyBooking = async (id) => {
    if(confirm("Xác nhận duyệt đơn hàng này?")) {
        await updateDoc(doc(db, "bookings", id), {status:'confirmed'});
    }
};

// --- KẾT THÚC FILE ---
