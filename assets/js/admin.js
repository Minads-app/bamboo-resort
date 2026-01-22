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

// --- LOGIC QUẢN LÝ LỄ TẾT V4.0 (THÔNG MINH) ---

function setupSettingsManager() {
    // DOM Elements mới
    const startDateInput = document.getElementById('holidayStart');
    const endDateInput = document.getElementById('holidayEnd');
    const noteInput = document.getElementById('holidayNote');
    const btnAdd = document.getElementById('btnAddHolidayRange');
    const btnLoadVN = document.getElementById('btnLoadVNHolidays');

    if (!btnAdd) return;

    // 1. XỬ LÝ THÊM KHOẢNG NGÀY (RANGE)
    btnAdd.addEventListener('click', async () => {
        const startVal = startDateInput.value;
        const endVal = endDateInput.value; // Nếu bỏ trống ô này thì tính là 1 ngày
        const noteVal = noteInput.value || "Lễ";

        if (!startVal) return alert("Vui lòng chọn 'Từ ngày'!");

        // Xác định ngày bắt đầu & kết thúc
        const startDate = new Date(startVal);
        const endDate = endVal ? new Date(endVal) : new Date(startVal);

        if (endDate < startDate) return alert("Ngày kết thúc không được nhỏ hơn ngày bắt đầu!");

        // Lấy danh sách cũ
        let newDates = window.currentHolidays || [];
        let countAdded = 0;

        // VÒNG LẶP: Chạy từ ngày bắt đầu đến ngày kết thúc
        for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
            // Chuyển date object thành string 'YYYY-MM-DD' để lưu
            const dateStr = d.toISOString().split('T')[0];

            // Kiểm tra trùng: Chỉ thêm nếu chưa có
            if (!newDates.some(item => item.date === dateStr)) {
                newDates.push({ date: dateStr, note: noteVal });
                countAdded++;
            }
        }

        if (countAdded > 0) {
            // Lưu 1 lần duy nhất lên Firebase
            await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
            alert(`Đã thêm thành công ${countAdded} ngày lễ!`);
            
            // Reset Form
            startDateInput.value = "";
            endDateInput.value = "";
            noteInput.value = "";
        } else {
            alert("Các ngày bạn chọn đều đã có trong hệ thống rồi!");
        }
    });

    // 2. XỬ LÝ GỢI Ý LỄ TẾT VIỆT NAM (2026)
    if (btnLoadVN) {
        btnLoadVN.addEventListener('click', async () => {
            if (!confirm("Hệ thống sẽ thêm các ngày lễ lớn năm 2026 vào danh sách. Bạn có muốn tiếp tục?")) return;

            let newDates = window.currentHolidays || [];
            
            // Danh sách cứng các ngày lễ 2026 (Dương lịch & Âm lịch quy đổi)
            const vnHolidays2026 = [
                { date: "2026-01-01", note: "Tết Dương Lịch" },
                // Tết Âm Lịch 2026 (Dự kiến mùng 1 là 17/02/2026) -> Nghỉ 7 ngày từ 29 Tết
                { date: "2026-02-16", note: "Nghỉ Tết Âm (29 Tết)" },
                { date: "2026-02-17", note: "Tết Nguyên Đán (Mùng 1)" },
                { date: "2026-02-18", note: "Tết Nguyên Đán (Mùng 2)" },
                { date: "2026-02-19", note: "Tết Nguyên Đán (Mùng 3)" },
                { date: "2026-02-20", note: "Nghỉ Tết Âm (Mùng 4)" },
                { date: "2026-02-21", note: "Nghỉ Tết Âm (Mùng 5)" },
                // Giỗ tổ Hùng Vương (10/3 Âm -> 25/04/2026)
                { date: "2026-04-25", note: "Giỗ Tổ Hùng Vương" },
                // 30/4 & 1/5
                { date: "2026-04-30", note: "Giải phóng Miền Nam" },
                { date: "2026-05-01", note: "Quốc tế Lao động" },
                // Quốc Khánh 2/9 (Nghỉ 2 ngày)
                { date: "2026-09-02", note: "Quốc Khánh" },
                { date: "2026-09-03", note: "Nghỉ lễ Quốc Khánh" },
                 // Noel
                { date: "2026-12-24", note: "Giáng Sinh" },
                { date: "2026-12-25", note: "Giáng Sinh" }
            ];

            let addedCount = 0;
            vnHolidays2026.forEach(h => {
                if (!newDates.some(exist => exist.date === h.date)) {
                    newDates.push(h);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                await setDoc(doc(db, "settings", "holidays"), { dates: newDates });
                alert(`Đã thêm ${addedCount} ngày lễ Việt Nam vào hệ thống!`);
            } else {
                alert("Các ngày lễ này đã có sẵn trong danh sách rồi.");
            }
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

// --- 9. BOOKINGS ---
// --- TÌM VÀ THAY THẾ HÀM initBookingData TRONG ADMIN.JS ---

function initBookingData() {
    const tbody = document.getElementById('bookingTableBody');
    if(!tbody) return;

    // 1. Lắng nghe dữ liệu
    onSnapshot(query(collection(db, "bookings"), orderBy("createdAt", "desc")), (snapshot) => {
        tbody.innerHTML = "";
        if(snapshot.empty) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px; color:#888;'>Chưa có đơn hàng nào</td></tr>";
            return;
        }

        snapshot.forEach(doc => {
            const b = doc.data();
            const tr = document.createElement('tr');
            
            // Xử lý hiển thị ngày tháng
            const dateStr = b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('vi-VN') : '---';
            
            // Xử lý hiển thị Trạng thái (Badge màu)
            let statusBadge = '';
            if(b.status === 'pending') statusBadge = '<span class="badge status-pending">Chờ duyệt</span>';
            else if(b.status === 'confirmed') statusBadge = '<span class="badge status-confirmed">Đã duyệt</span>';
            else statusBadge = '<span class="badge" style="background:#95a5a6; color:white;">Đã hủy</span>';

            // --- CỘT HÀNH ĐỘNG (LOGIC MỚI) ---
            // Chỉ hiện nút Duyệt & Không duyệt nếu đơn đang CHỜ (pending)
            const btnVerify = b.status === 'pending' 
                ? `<button class="action-btn btn-verify" onclick="verifyBooking('${doc.id}')" title="Duyệt đơn này"><i class="fas fa-check"></i></button>` 
                : '';
            
            const btnReject = b.status === 'pending'
                ? `<button class="action-btn btn-reject" onclick="rejectBooking('${doc.id}')" title="Không duyệt / Hủy"><i class="fas fa-ban"></i></button>`
                : '';

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>
                    <b>${b.customerName}</b><br>
                    <small>${b.customerPhone}</small>
                    ${b.note ? `<br><small style="color:#d35400; font-style:italic;">"${b.note}"</small>` : ''}
                </td>
                <td>
                    <span style="color:var(--primary-color); font-weight:500">${b.roomType}</span><br>
                    <small>${b.checkIn} ➝ ${b.checkOut}</small>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex;">
                        ${btnVerify}
                        ${btnReject}
                        <button class="action-btn btn-edit-booking" onclick="editBookingInfo('${doc.id}', '${b.customerName}', '${b.customerPhone}')" title="Sửa thông tin khách">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="action-btn btn-delete-booking" onclick="deleteBooking('${doc.id}')" title="Xóa vĩnh viễn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// --- CÁC HÀM XỬ LÝ HÀNH ĐỘNG (Thêm vào cuối file admin.js hoặc ngay dưới hàm trên) ---

// 1. Duyệt đơn (Giữ nguyên)
window.verifyBooking = async (id) => {
    if(confirm("Xác nhận DUYỆT đơn hàng này? Khách sẽ được tính là đã đặt thành công.")) {
        await updateDoc(doc(db, "bookings", id), { status: 'confirmed' });
    }
};

// 2. Không duyệt / Hủy đơn (Mới)
window.rejectBooking = async (id) => {
    const reason = prompt("Nhập lý do không duyệt (hoặc để trống):", "Khách hủy / Hết phòng");
    if(reason !== null) { // Nếu bấm Cancel thì không làm gì
        await updateDoc(doc(db, "bookings", id), { 
            status: 'cancelled',
            cancelReason: reason
        });
    }
};

// 3. Xóa đơn vĩnh viễn (Mới)
window.deleteBooking = async (id) => {
    if(confirm("⚠ CẢNH BÁO: Bạn có chắc muốn XÓA VĨNH VIỄN đơn này không?\nHành động này không thể hoàn tác!")) {
        await deleteDoc(doc(db, "bookings", id));
    }
};

// 4. Sửa thông tin khách (Mới)
window.editBookingInfo = async (id, oldName, oldPhone) => {
    // Hỏi tên mới
    const newName = prompt("Sửa tên khách hàng:", oldName);
    if(newName === null) return; // Bấm hủy

    // Hỏi sđt mới
    const newPhone = prompt("Sửa số điện thoại:", oldPhone);
    if(newPhone === null) return;

    // Cập nhật
    if(newName && newPhone) {
        await updateDoc(doc(db, "bookings", id), {
            customerName: newName,
            customerPhone: newPhone
        });
        alert("Đã cập nhật thông tin khách hàng!");
    } else {
        alert("Tên và SĐT không được để trống!");
    }
};

window.verifyBooking = async (id) => {
    if(confirm("Xác nhận duyệt đơn hàng này?")) {
        await updateDoc(doc(db, "bookings", id), {status:'confirmed'});
    }
};

// --- KẾT THÚC FILE ---


