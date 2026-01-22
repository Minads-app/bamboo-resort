import { db, auth } from '../../src/config/firebase-config.js';
import { 
    collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    onAuthStateChanged, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

console.log("⚡ Admin V3.1 Loaded - Full Features");

// --- 1. DOM ELEMENTS ---
const dom = {
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
    
    // Holiday
    holidayInput: document.getElementById('holidayInput'),
    holidayNote: document.getElementById('holidayNote'),
    btnAddHoliday: document.getElementById('btnAddHoliday'),
    holidayList: document.getElementById('holidayList')
};

// --- 2. HÀM XỬ LÝ LINK GOOGLE DRIVE (QUAN TRỌNG) ---
function convertDriveLink(url) {
    if (!url) return "";
    
    // Regex tìm ID file trong link Google Drive
    // Hỗ trợ cả link /file/d/ID và link ?id=ID
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    
    if (match && match[1]) {
        // Dùng server lh3 của Google để lấy ảnh trực tiếp (Nhanh & Ổn định nhất)
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    
    return url; // Nếu là link ảnh thường (Unsplash, Imgur...) thì giữ nguyên
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
        const email = document.getElementById('admEmail').value;
        const pass = document.getElementById('admPass').value;
        try { await signInWithEmailAndPassword(auth, email, pass); } 
        catch (err) { alert("Lỗi đăng nhập: " + err.message); }
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

// --- 5. QUẢN LÝ PHÒNG (ROOMS) ---
function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount || 0);
}

function initRoomData() {
    onSnapshot(collection(db, "rooms"), (snapshot) => {
        const tbody = document.getElementById('roomTableBody');
        tbody.innerHTML = "";
        
        snapshot.forEach(doc => {
            const r = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${r.image}" onerror="this.src='https://via.placeholder.com/50?text=Error'" style="width:50px; height:35px; object-fit:cover; border-radius:4px;"></td>
                <td><b>${r.name}</b><br><small>${r.type}</small></td>
                <td>${formatMoney(r.priceWeekday)}</td>
                <td style="color:#2980b9">${formatMoney(r.priceWeekend)}</td>
                <td style="color:#c0392b; font-weight:bold">${formatMoney(r.priceHoliday)}</td>
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
    // Tự động hiện ảnh Preview khi dán link
    if(dom.roomImageUrl) {
        dom.roomImageUrl.addEventListener('input', (e) => {
            const rawUrl = e.target.value;
            const directUrl = convertDriveLink(rawUrl); // <--- Gọi hàm ở đây
            
            if(directUrl) { 
                dom.imagePreview.src = directUrl; 
                dom.imagePreview.style.display = 'block'; 
            } else { 
                dom.imagePreview.style.display = 'none'; 
            }
        });
    }

    // Lưu phòng
    if(dom.roomForm) {
        dom.roomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                // Xử lý link lần cuối trước khi lưu
                const finalImage = convertDriveLink(dom.roomImageUrl.value) || "https://via.placeholder.com/400x300?text=No+Image";

                await addDoc(collection(db, "rooms"), {
                    name: dom.roomName.value,
                    type: dom.roomType.value,
                    priceWeekday: Number(dom.priceWeekday.value),
                    priceWeekend: Number(dom.priceWeekend.value),
                    priceHoliday: Number(dom.priceHoliday.value),
                    // Lưu thêm giá mặc định (để hiển thị ở trang chủ đơn giản)
                    price: Number(dom.priceWeekday.value), 
                    description: dom.roomDesc.value,
                    image: finalImage,
                    createdAt: new Date()
                });

                alert("Thêm phòng thành công!");
                dom.roomForm.reset();
                dom.imagePreview.style.display = 'none';
            } catch (err) {
                alert("Lỗi: " + err.message);
            }
        });
    }
}

// --- 6. CẤU HÌNH LỄ TẾT (SETTINGS) ---
async function initHolidayData() {
    const docRef = doc(db, "settings", "holidays");
    onSnapshot(docRef, (docSnap) => {
        dom.holidayList.innerHTML = "";
        if (docSnap.exists()) {
            const data = docSnap.data();
            const dates = data.dates || [];
            if(dates.length === 0) return dom.holidayList.innerHTML = "<p>Chưa có ngày lễ.</p>";

            dates.sort((a, b) => new Date(a.date) - new Date(b.date));
            dates.forEach((item, index) => {
                const tag = document.createElement('span');
                tag.className = 'holiday-tag';
                const dateVi = item.date.split('-').reverse().join('/');
                tag.innerHTML = `<b>${dateVi}</b>: ${item.note} <i class="fas fa-times" onclick="removeHoliday(${index})"></i>`;
                dom.holidayList.appendChild(tag);
            });
            window.currentHolidays = dates; 
        } else {
            dom.holidayList.innerHTML = "<p>Chưa cấu hình ngày lễ.</p>";
            window.currentHolidays = [];
        }
    });
}

function setupSettingsManager() {
    if(dom.btnAddHoliday) {
        dom.btnAddHoliday.addEventListener('click', async () => {
            const dateVal = dom.holidayInput.value;
            const noteVal = dom.holidayNote.value;
            if(!dateVal) return alert("Vui lòng chọn ngày!");

            let newDates = window.currentHolidays || [];
            if(newDates.some(d => d.date === dateVal)) return alert("Ngày này đã có!");

            newDates.push({ date: dateVal, note: noteVal || 'Lễ' });
            await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
            dom.holidayInput.value = "";
            dom.holidayNote.value = "";
        });
    }
}

window.removeHoliday = async (index) => {
    if(confirm("Xóa ngày lễ này?")) {
        let newDates = window.currentHolidays;
        newDates.splice(index, 1);
        await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
    }
};

// --- 7. QUẢN LÝ BOOKING (GIỮ NGUYÊN) ---
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
