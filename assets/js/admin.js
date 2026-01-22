import { db, auth } from '../../src/config/firebase-config.js';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("⚡ Admin V3 Loaded - Pricing Strategy");

// DOM ELEMENTS
const dom = {
    loginContainer: document.getElementById('login-container'),
    dashboardContainer: document.getElementById('dashboard-container'),
    navItems: document.querySelectorAll('.nav-item'),
    sections: document.querySelectorAll('.content-section'),
    pageTitle: document.getElementById('pageTitle'),
    
    // Room Form inputs
    roomName: document.getElementById('roomName'),
    roomType: document.getElementById('roomType'),
    priceWeekday: document.getElementById('priceWeekday'), // Giá thường
    priceWeekend: document.getElementById('priceWeekend'), // Giá cuối tuần
    priceHoliday: document.getElementById('priceHoliday'), // Giá lễ
    roomImageUrl: document.getElementById('roomImageUrl'),
    roomDesc: document.getElementById('roomDesc'),
    roomForm: document.getElementById('roomForm'),
    
    // Holiday inputs
    holidayInput: document.getElementById('holidayInput'),
    holidayNote: document.getElementById('holidayNote'),
    btnAddHoliday: document.getElementById('btnAddHoliday'),
    holidayList: document.getElementById('holidayList')
};

// INIT
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupTabNav();
    setupLogin();
    setupRoomManager();
    setupSettingsManager(); // <--- Logic Cấu hình Lễ
});

// 1. AUTH & TABS (Giữ nguyên logic cũ cho gọn)
function checkAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            dom.loginContainer.style.display = 'none';
            dom.dashboardContainer.style.display = 'flex';
            document.getElementById('adminEmailDisplay').innerText = user.email;
            initBookingData(); 
            initRoomData();
            initHolidayData(); // Tải danh sách lễ
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
        const email = document.getElementById('admEmail').value;
        const pass = document.getElementById('admPass').value;
        try { await signInWithEmailAndPassword(auth, email, pass); } 
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

// 2. LOGIC PHÒNG (NÂNG CẤP 3 GIÁ)
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function convertDriveLink(url) {
    if(!url) return "";
    const driveRegex = /\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    return (match && match[1]) ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

function initRoomData() {
    onSnapshot(collection(db, "rooms"), (snapshot) => {
        const tbody = document.getElementById('roomTableBody');
        tbody.innerHTML = "";
        
        snapshot.forEach(doc => {
            const r = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${r.image}" style="width:50px; height:35px; object-fit:cover; border-radius:4px;"></td>
                <td><b>${r.name}</b><br><small>${r.type}</small></td>
                <td>${formatMoney(r.priceWeekday || 0)}</td>
                <td style="color:#2980b9">${formatMoney(r.priceWeekend || 0)}</td>
                <td style="color:#c0392b; font-weight:bold">${formatMoney(r.priceHoliday || 0)}</td>
                <td><button class="btn-del" data-id="${doc.id}" style="color:red;border:none;background:none;cursor:pointer;"><i class="fas fa-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    });

    // Xóa phòng
    document.getElementById('roomTableBody').addEventListener('click', async (e) => {
        if(e.target.closest('.btn-del')) {
            if(confirm("Xóa phòng này?")) await deleteDoc(doc(db, "rooms", e.target.closest('.btn-del').dataset.id));
        }
    });
}

function setupRoomManager() {
    // Preview ảnh
    dom.roomImageUrl.addEventListener('input', (e) => {
        const url = convertDriveLink(e.target.value);
        const img = document.getElementById('imagePreview');
        if(url) { img.src = url; img.style.display = 'block'; }
        else { img.style.display = 'none'; }
    });

    // Submit Form
    dom.roomForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            // Lấy 3 mức giá
            const pWeekday = Number(dom.priceWeekday.value);
            const pWeekend = Number(dom.priceWeekend.value);
            const pHoliday = Number(dom.priceHoliday.value);
            
            await addDoc(collection(db, "rooms"), {
                name: dom.roomName.value,
                type: dom.roomType.value,
                // Lưu object giá hoặc 3 field rời đều được. Ở đây lưu rời cho dễ query
                priceWeekday: pWeekday,
                priceWeekend: pWeekend,
                priceHoliday: pHoliday,
                // Lưu thêm giá hiển thị mặc định (thường là giá ngày thường)
                price: pWeekday, 
                description: dom.roomDesc.value,
                image: convertDriveLink(dom.roomImageUrl.value),
                createdAt: new Date()
            });

            alert("Đã thêm phòng với 3 mức giá!");
            dom.roomForm.reset();
            document.getElementById('imagePreview').style.display = 'none';
        } catch (err) {
            alert("Lỗi: " + err.message);
        }
    });
}

// 3. LOGIC CẤU HÌNH NGÀY LỄ (MỚI)
// Chúng ta sẽ lưu danh sách ngày lễ vào 1 document duy nhất: settings/holidays
async function initHolidayData() {
    const docRef = doc(db, "settings", "holidays");
    
    onSnapshot(docRef, (docSnap) => {
        dom.holidayList.innerHTML = "";
        if (docSnap.exists()) {
            const data = docSnap.data();
            const dates = data.dates || []; // Mảng chứa các object {date: '2024-04-30', note: 'Giải phóng'}
            
            if(dates.length === 0) {
                dom.holidayList.innerHTML = "<p>Chưa có ngày lễ.</p>";
                return;
            }

            // Sắp xếp ngày tăng dần
            dates.sort((a, b) => new Date(a.date) - new Date(b.date));

            dates.forEach((item, index) => {
                const tag = document.createElement('span');
                tag.className = 'holiday-tag';
                // Format lại ngày cho đẹp (yyyy-mm-dd -> dd/mm/yyyy)
                const dateVi = item.date.split('-').reverse().join('/');
                tag.innerHTML = `<b>${dateVi}</b>: ${item.note} <i class="fas fa-times" onclick="removeHoliday(${index})"></i>`;
                dom.holidayList.appendChild(tag);
            });
            
            // Lưu biến toàn cục để hàm remove dùng được
            window.currentHolidays = dates; 
        } else {
            dom.holidayList.innerHTML = "<p>Chưa cấu hình ngày lễ.</p>";
            window.currentHolidays = [];
        }
    });
}

function setupSettingsManager() {
    dom.btnAddHoliday.addEventListener('click', async () => {
        const dateVal = dom.holidayInput.value;
        const noteVal = dom.holidayNote.value;

        if(!dateVal) return alert("Vui lòng chọn ngày!");

        // Lấy danh sách cũ
        let newDates = window.currentHolidays || [];
        
        // Kiểm tra trùng
        if(newDates.some(d => d.date === dateVal)) return alert("Ngày này đã có trong danh sách!");

        // Thêm mới
        newDates.push({ date: dateVal, note: noteVal || 'Ngày lễ' });

        // Lưu lên Firestore (Ghi đè document)
        await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
        
        dom.holidayInput.value = "";
        dom.holidayNote.value = "";
    });
}

// Hàm xóa ngày lễ (gắn vào window để HTML gọi được)
window.removeHoliday = async (index) => {
    if(confirm("Xóa ngày lễ này?")) {
        let newDates = window.currentHolidays;
        newDates.splice(index, 1); // Xóa phần tử tại index
        await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
    }
};

// 4. BOOKING DATA (GIỮ NGUYÊN)
function initBookingData() {
    onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), (snapshot) => {
        const tbody = document.getElementById('bookingTableBody');
        tbody.innerHTML = "";
        snapshot.forEach(doc => {
            const b = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.createdAt?.toDate().toLocaleDateString('vi-VN')}</td>
                <td>${b.customerName}</td>
                <td>${b.roomType}</td>
                <td><span class="badge status-${b.status}">${b.status}</span></td>
                <td>${b.status==='pending' ? `<button onclick="verifyBooking('${doc.id}')">✔</button>`:''}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}
window.verifyBooking = async (id) => await updateDoc(doc(db, "bookings", id), {status:'confirmed'});
