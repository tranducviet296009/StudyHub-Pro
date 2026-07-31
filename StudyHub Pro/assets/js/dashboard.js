/**
 * StudyHub Pro - Dashboard Logic
 * Quản lý thông tin phiên, phân quyền giao diện (Admin/Teacher/Student),
 * hiển thị dữ liệu thống kê tổng quan và nạp danh sách tài liệu mới nhất từ Firestore.
 */

import { auth, db } from './firebase.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast, toggleLoading, formatDate, formatBytes } from './utils.js';

// Khởi chạy kiểm tra phiên làm việc và hiển thị dữ liệu
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Fetch thông tin chi tiết user từ Firestore để xác định Role
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // 1. Cập nhật giao diện Sidebar & Welcome Message
                updateUIWithUserData(userData);
                
                // 2. Kiểm tra phân quyền để kết xuất menu chức năng đặc biệt
                renderRoleBasedMenu(userData.role);
                
                // 3. Tải các số liệu thống kê tổng quan
                await loadDashboardStatistics(userData);
                
                // 4. Tải danh sách tài liệu mới nhất
                await loadRecentFiles();
            } else {
                showToast("Không tìm thấy dữ liệu tài khoản trong hệ thống.", "error");
                // Đăng xuất cưỡng bức nếu tài khoản lỗi dữ liệu Firestore
                await signOut(auth);
            }
        } catch (error) {
            console.error("Lỗi tải thông tin Dashboard:", error);
            showToast("Đã xảy ra lỗi trong quá trình đồng bộ dữ liệu.", "error");
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Cập nhật thông tin cá nhân cơ bản lên giao diện chính
function updateUIWithUserData(userData) {
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarName = document.getElementById('sidebarName');
    const sidebarRole = document.getElementById('sidebarRole');
    const welcomeMessage = document.getElementById('welcomeMessage');

    if (sidebarAvatar) sidebarAvatar.src = userData.avatar || 'assets/img/default-avatar.png';
    if (sidebarName) sidebarName.textContent = userData.fullname;
    if (sidebarRole) {
        sidebarRole.textContent = userData.role === 'admin' ? 'Quản trị viên' : 
                                  userData.role === 'teacher' ? 'Giáo viên' : 'Học sinh';
    }

    if (welcomeMessage) {
        const hours = new Date().getHours();
        let greeting = "Chào buổi sáng";
        if (hours >= 12 && hours < 18) greeting = "Chào buổi chiều";
        if (hours >= 18) greeting = "Chào buổi tối";
        welcomeMessage.innerHTML = `${greeting}, <span class="text-gradient-primary">${userData.fullname}</span>!`;
    }
}

// Kết xuất các tính năng nâng cao dựa trên phân quyền người dùng
function renderRoleBasedMenu(role) {
    const container = document.getElementById('roleMenuContainer');
    const uploadBtnTop = document.getElementById('uploadBtnTop');
    if (!container) return;

    let menuHTML = '';

    if (role === 'admin') {
        menuHTML = `
            <div class="menu-label">Quản Trị Hệ Thống</div>
            <a href="admin.html" class="menu-item">
                <i class="fa-solid fa-user-shield"></i>
                <span>Quản lý User</span>
            </a>
            <a href="files.html" class="menu-item">
                <i class="fa-solid fa-folder-tree"></i>
                <span>Quản lý Tài liệu</span>
            </a>
        `;
        if (uploadBtnTop) uploadBtnTop.style.display = 'inline-flex';
    } else if (role === 'teacher') {
        menuHTML = `
            <div class="menu-label">Nghiệp Vụ Giáo Viên</div>
            <a href="teacher.html" class="menu-item">
                <i class="fa-solid fa-chalkboard-user"></i>
                <span>Bài viết của tôi</span>
            </a>
            <a href="upload.html" class="menu-item">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <span>Tải lên tài liệu</span>
            </a>
        `;
        if (uploadBtnTop) uploadBtnTop.style.display = 'inline-flex';
    } else {
        // Học sinh (Student) không có menu đặc biệt nhưng hiển thị khu vực yêu thích
        menuHTML = `
            <div class="menu-label">Học Tập</div>
            <a href="files.html?filter=favorites" class="menu-item">
                <i class="fa-solid fa-heart"></i>
                <span>Tài liệu đã lưu</span>
            </a>
        `;
        if (uploadBtnTop) uploadBtnTop.style.display = 'none';
    }

    container.innerHTML = menuHTML;
}

// Tải số liệu thống kê tổng quan động dạng thẻ (Statistic Cards)
async function loadDashboardStatistics(userData) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;

    try {
        // Đọc danh sách tài liệu từ Firestore để thống kê động thô sơ
        const filesSnap = await getDocs(collection(db, "files"));
        const totalFiles = filesSnap.size;
        
        let userUploadsCount = 0;
        let totalViews = 0;
        let totalDownloads = 0;

        filesSnap.forEach(doc => {
            const data = doc.data();
            totalViews += (data.views || 0);
            totalDownloads += (data.downloads || 0);
            if (data.uploaderUid === userData.uid) {
                userUploadsCount++;
            }
        });

        // Tùy theo vai trò để kết xuất các chỉ số phù hợp nhất
        if (userData.role === 'admin') {
            const usersSnap = await getDocs(collection(db, "users"));
            const totalUsers = usersSnap.size;

            statsGrid.innerHTML = `
                <div class="stat-card glass-panel mouse-light-wrapper animate-fade-in-up">
                    <div class="mouse-light"></div>
                    <div class="stat-icon primary"><i class="fa-solid fa-users"></i></div>
                    <div class="stat-details"><h3>${totalUsers}</h3><p>Tổng Thành Viên</p></div>
                </div>
                <div class="stat-card glass-panel mouse-light-wrapper animate-fade-in-up" style="animation-delay: 0.1s">
                    <div class="mouse-light"></div>
                    <div class="stat-icon secondary"><i class="fa-solid fa-file-invoice"></i></div>
                    <div class="stat-details"><h3>${totalFiles}</h3><p>Tổng Tài Liệu</p></div>
                </div>
                <div class="stat-card glass-panel mouse-light-wrapper animate-fade-in-up" style="animation-delay: 0.2s">
                    <div class="mouse-light"></div>
                    <div class="stat-icon success"><i class="fa-solid fa-eye"></i></div>
                    <div class="stat-details"><h3>${totalViews}</h3><p>Lượt Xem Kho</p></div>
                </div>
                <div class="stat-card glass-panel mouse-light-wrapper animate-fade-in-up" style="animation-delay: 0.3s">
                    <div class="mouse-light"></div>
                    <div class="stat-icon warning"><i class="fa-solid fa-circle-down"></i></div>
                    <div class="stat-details"><h3>${totalDownloads}</h3><p>Lượt Tải Về</p></div>
                </div>
            `;
        } else {
            // Dành cho Giáo viên và Học sinh
            statsGrid.innerHTML = `
                <div class="stat-card glass-panel mouse-light-wrapper animate-fade-in-up">
                    <div class="mouse-light"></div>
                    <div class="stat-icon primary"><i class="fa-solid fa-folder-open"></i></div>
                    <div class="stat-details"><h3>${totalFiles}</h3><p>Tài Liệu Hệ Thống</p></div>
                </div>
                <div class="stat-card glass-panel mouse-light-wrapper animate-fade-in-up" style="animation-delay: 0.1s">
                    <div class="mouse-light"></div>
                    <div class="stat-icon secondary"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                    <div class="stat-details"><h3>${userUploadsCount}</h3><p>Đã Tải Lên</p></div>
                </div>
                <div class="stat-card glass-panel mouse-light-wrapper animate-fade-in-up" style="animation-delay: 0.2s">
                    <div class="mouse-light"></div>
                    <div class="stat-icon success"><i class="fa-solid fa-eye"></i></div>
                    <div class="stat-details"><h3>${totalViews}</h3><p>Tổng Lượt Xem</p></div>
                </div>
                <div class="stat-card glass-panel mouse-light-wrapper animate-fade-in-up" style="animation-delay: 0.3s">
                    <div class="mouse-light"></div>
                    <div class="stat-icon warning"><i class="fa-solid fa-star"></i></div>
                    <div class="stat-details"><h3>4.8</h3><p>Đánh Giá Chung</p></div>
                </div>
            `;
        }

        // Kích hoạt lại hiệu ứng Mouse Light cho phần tử mới sinh ra
        initMouseLightForStats();

    } catch (error) {
        console.error("Lỗi nạp thống kê:", error);
        statsGrid.innerHTML = `<p style="color: var(--color-danger)">Không thể nạp dữ liệu thống kê tổng quan.</p>`;
    }
}

// Tải danh sách tài liệu mới đăng tải
async function loadRecentFiles() {
    const grid = document.getElementById('recentFilesGrid');
    if (!grid) return;

    try {
        const filesRef = collection(db, "files");
        // Lấy tối đa 4 file mới nhất sắp xếp theo ngày upload giảm dần
        const q = query(filesRef, orderBy("uploadedAt", "desc"), limit(4));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            grid.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">Chưa có tài liệu nào được tải lên hệ thống.</p>`;
            return;
        }

        grid.innerHTML = ''; // Xóa sạch các Skeleton loading định dạng sẵn

        querySnapshot.forEach((doc) => {
            const file = doc.data();
            const fileId = doc.id;
            
            // Xác định icon hiển thị tương thích định dạng mở rộng
            let iconClass = 'fa-file-lines text-muted';
            const ext = file.fileExtension ? file.fileExtension.toLowerCase() : '';
            if (ext === 'pdf') iconClass = 'fa-file-pdf icon-pdf';
            else if (['docx', 'doc'].includes(ext)) iconClass = 'fa-file-word icon-word';
            else if (['xlsx', 'xls'].includes(ext)) iconClass = 'fa-file-excel icon-excel';
            else if (['pptx', 'ppt'].includes(ext)) iconClass = 'fa-file-powerpoint icon-ppt';
            else if (['zip', 'rar'].includes(ext)) iconClass = 'fa-file-zipper icon-zip';

            const card = document.createElement('div');
            card.className = 'file-card glass-panel mouse-light-wrapper animate-fade-in-up';
            card.innerHTML = `
                <div class="mouse-light"></div>
                <div class="file-header">
                    <i class="fa-solid ${iconClass} file-type-icon"></i>
                    <div class="file-actions">
                        <button class="icon-btn view-file-btn" data-id="${fileId}" title="Xem chi tiết">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <a href="${file.downloadUrl}" target="_blank" class="icon-btn download-file-link" data-id="${fileId}" title="Tải xuống" download="${file.fileName}">
                            <i class="fa-solid fa-download"></i>
                        </a>
                    </div>
                </div>
                <div class="file-info">
                    <h4 title="${file.fileName}">${file.fileName}</h4>
                    <div class="file-meta">
                        <span>Bởi: ${file.uploaderName || 'Ẩn danh'}</span>
                        <span>${formatBytes(file.fileSize)}</span>
                    </div>
                </div>
                <div class="file-stats">
                    <span><i class="fa-solid fa-eye"></i> ${file.views || 0}</span>
                    <span><i class="fa-solid fa-download"></i> ${file.downloads || 0}</span>
                    <span style="margin-left: auto; color: #f59e0b;"><i class="fa-solid fa-star"></i> ${file.rating || '5.0'}</span>
                </div>
            `;
            grid.appendChild(card);
        });

        // Bắt sự kiện chuyển hướng trang chi tiết khi bấm vào card hoặc nút xem
        grid.querySelectorAll('.view-file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                window.location.href = `files.html?id=${id}`;
            });
        });

        initMouseLightForStats();

    } catch (error) {
        console.error("Lỗi lấy danh sách tài liệu mới:", error);
        grid.innerHTML = `<p style="color: var(--color-danger); grid-column: 1/-1;">Không thể tải danh sách tài liệu gần đây.</p>`;
    }
}

// Khởi chạy hiệu ứng neon di chuyển theo chuột cho các phần tử tạo động
function initMouseLightForStats() {
    document.querySelectorAll('.mouse-light-wrapper').forEach(wrapper => {
        const light = wrapper.querySelector('.mouse-light');
        if (!light) return;
        wrapper.addEventListener('mousemove', (e) => {
            const rect = wrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            light.style.left = `${x}px`;
            light.style.top = `${y}px`;
        });
    });
}

// --- 5. Đăng xuất hệ thống ---
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        toggleLoading(true, "Đang đăng xuất khỏi hệ thống...");
        try {
            await signOut(auth);
            showToast("Đăng xuất thành công.", "success");
            window.location.href = 'login.html';
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            showToast("Đăng xuất thất bại.", "error");
        } finally {
            toggleLoading(false);
        }
    });
}