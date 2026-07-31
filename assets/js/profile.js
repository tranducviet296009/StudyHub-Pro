/**
 * StudyHub Pro - Profile Logic
 * Xử lý cập nhật tên hiển thị, tải ảnh đại diện lên Firebase Storage,
 * đồng bộ hóa dữ liệu real-time giữa Authentication và Firestore.
 */

import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { showToast, toggleLoading, formatDate } from './utils.js';

let currentUserDocData = null;

// Kiểm tra trạng thái và nạp thông tin tài khoản hiện hành
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await fetchAndFillUserData(user);
        renderDynamicSidebarMenu(user);
    } else {
        window.location.href = 'login.html';
    }
});

// Nạp thông tin từ Firestore đổ vào các Form biểu mẫu dữ liệu
async function fetchAndFillUserData(user) {
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            currentUserDocData = docSnap.data();

            // Đổ dữ liệu vào Sidebar Mini Profile
            document.getElementById('sidebarName').textContent = currentUserDocData.fullname;
            document.getElementById('sidebarRole').textContent = currentUserDocData.role;
            document.getElementById('sidebarAvatar').src = currentUserDocData.avatar;

            // Đổ dữ liệu vào trang chính Main Profile
            document.getElementById('profileMainImg').src = currentUserDocData.avatar;
            document.getElementById('profileDisplayName').textContent = currentUserDocData.fullname;
            document.getElementById('profileRoleBadge').textContent = currentUserDocData.role;
            
            document.getElementById('profileEmailInp').value = currentUserDocData.email;
            document.getElementById('profileNameInp').value = currentUserDocData.fullname;
            document.getElementById('profileCreatedAtInp').value = formatDate(currentUserDocData.createdAt);
        }
    } catch (error) {
        console.error("Lỗi truy xuất profile:", error);
        showToast("Không thể tải thông tin tài khoản chi tiết.", "error");
    }
}

// Xử lý gửi Form cập nhật Tên hiển thị công khai
const profileUpdateForm = document.getElementById('profileUpdateForm');
if (profileUpdateForm) {
    profileUpdateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('profileNameInp').value.trim();

        if (!newName) {
            showToast("Họ tên không được để trống.", "warning");
            return;
        }

        toggleLoading(true, "Đang cập nhật hồ sơ cá nhân...");
        try {
            const user = auth.currentUser;

            // 1. Cập nhật trên Firebase Authentication Profile
            await updateProfile(user, { displayName: newName });

            // 2. Cập nhật trên Firebase Firestore Database
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { fullname: newName });

            // 3. Đồng bộ lại dữ liệu giao diện cục bộ
            document.getElementById('sidebarName').textContent = newName;
            document.getElementById('profileDisplayName').textContent = newName;

            showToast("Cập nhật thông tin hồ sơ thành công!", "success");
        } catch (error) {
            console.error("Lỗi cập nhật tên:", error);
            showToast("Gặp lỗi trong quá trình ghi dữ liệu mới.", "error");
        } finally {
            toggleLoading(false);
        }
    });
}

// Xử lý Sự kiện Tải và đổi Ảnh đại diện qua Firebase Storage
const avatarFileInp = document.getElementById('avatarFileInp');
if (avatarFileInp) {
    avatarFileInp.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Ràng buộc định dạng và kích thước tệp ảnh tránh spam (Max 3MB)
        if (!file.type.startsWith('image/')) {
            showToast("Tệp tải lên buộc phải là định dạng hình ảnh.", "warning");
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            showToast("Kích thước ảnh đại diện không được vượt quá 3MB.", "warning");
            return;
        }

        toggleLoading(true, "Đang xử lý và tải ảnh lên hệ thống đám mây...");
        try {
            const user = auth.currentUser;
            // Khởi tạo tham chiếu đường dẫn tệp trên Firebase Storage
            const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);

            // 1. Tải mảng Byte của tệp lên Storage
            const snapshot = await uploadBytes(storageRef, file);
            
            // 2. Lấy URL công khai sau khi upload thành công
            const downloadUrl = await getDownloadURL(snapshot.ref);

            // 3. Ghi URL mới vào Auth và Firestore cùng lúc
            await updateProfile(user, { photoURL: downloadUrl });
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { avatar: downloadUrl });

            // 4. Thay đổi hiển thị trực tiếp trên giao diện người dùng
            document.getElementById('profileMainImg').src = downloadUrl;
            document.getElementById('sidebarAvatar').src = downloadUrl;

            showToast("Thay đổi ảnh đại diện thành công!", "success");
        } catch (error) {
            console.error("Lỗi xử lý tải hình ảnh:", error);
            showToast("Tải ảnh thất bại. Kiểm tra lại phân quyền bộ nhớ đám mây.", "error");
        } finally {
            toggleLoading(false);
        }
    });
}

// Kết xuất Menu dựa trên vai trò ở Sidebar để đồng bộ trải nghiệm di chuyển trang
async function renderDynamicSidebarMenu(user) {
    const container = document.getElementById('roleMenuContainer');
    if (!container) return;

    try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const role = docSnap.data().role;
            if (role === 'admin') {
                container.innerHTML = `
                    <div class="menu-label">Quản Trị Hệ Thống</div>
                    <a href="admin.html" class="menu-item"><i class="fa-solid fa-user-shield"></i> <span>Quản lý User</span></a>
                    <a href="files.html" class="menu-item"><i class="fa-solid fa-folder-tree"></i> <span>Quản lý Tài liệu</span></a>
                `;
            } else if (role === 'teacher') {
                container.innerHTML = `
                    <div class="menu-label">Nghiệp Vụ Giáo Viên</div>
                    <a href="teacher.html" class="menu-item"><i class="fa-solid fa-chalkboard-user"></i> <span>Bài viết của tôi</span></a>
                    <a href="upload.html" class="menu-item"><i class="fa-solid fa-cloud-arrow-up"></i> <span>Tải lên tài liệu</span></a>
                `;
            }
        }
    } catch (e) {
        console.error(e);
    }
}

// Nút Đăng xuất ở góc Topbar
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (err) {
            console.error(err);
        }
    });
}