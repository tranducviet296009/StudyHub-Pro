/**
 * StudyHub Pro - Files Explorer Logic
 * Lấy danh sách tài liệu từ Firestore, xử lý tìm kiếm theo tên, 
 * và lọc theo môn học/khối lớp theo thời gian thực (Real-time Filtering).
 */

import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast, formatBytes } from './utils.js';

let allFilesData = []; // Biến toàn cục lưu trữ tạm bộ nhớ cache của file để lọc Client-side

// Xác thực phiên và tải dữ liệu
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Đồng bộ Sidebar
                document.getElementById('sidebarName').textContent = userData.fullname;
                document.getElementById('sidebarRole').textContent = userData.role;
                document.getElementById('sidebarAvatar').src = userData.avatar;
                
                // Nạp menu quyền nâng cao
                if (userData.role === 'admin') {
                    const roleMenu = document.getElementById('roleMenuContainer');
                    if(roleMenu) {
                        roleMenu.innerHTML = `
                            <div class="menu-label">Quản Trị Hệ Thống</div>
                            <a href="admin.html" class="menu-item"><i class="fa-solid fa-user-shield"></i> <span>Quản lý User</span></a>
                        `;
                    }
                }

                // Bắt đầu tải toàn bộ danh sách file
                await fetchAllFiles();
            }
        } catch (err) {
            console.error(err);
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Hàm lấy tất cả tài liệu từ Firestore sắp xếp theo ngày mới nhất
async function fetchAllFiles() {
    const grid = document.getElementById('exploreFilesGrid');
    try {
        const q = query(collection(db, "files"), orderBy("uploadedAt", "desc"));
        const snapshot = await getDocs(q);
        
        allFilesData = [];
        snapshot.forEach(doc => {
            allFilesData.push({ id: doc.id, ...doc.data() });
        });

        renderFiles(allFilesData);
    } catch (error) {
        console.error("Lỗi lấy dữ liệu File:", error);
        if (grid) {
            grid.innerHTML = `<p style="color: var(--color-danger); text-align: center; grid-column: 1/-1;">Không thể tải dữ liệu từ máy chủ.</p>`;
        }
    }
}

// Hàm kết xuất danh sách thẻ HTML cho Tài liệu
function renderFiles(filesArray) {
    const grid = document.getElementById('exploreFilesGrid');
    if (!grid) return;

    if (filesArray.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: rgba(255,255,255,0.05); border-radius: var(--border-radius-md);">
            <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
            <h4 style="color: var(--text-secondary);">Không tìm thấy tài liệu nào phù hợp.</h4>
        </div>`;
        return;
    }

    grid.innerHTML = ''; // Xóa các Skeletons

    filesArray.forEach(file => {
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
                    <a href="${file.downloadUrl}" target="_blank" class="icon-btn download-file-link" title="Tải xuống">
                        <i class="fa-solid fa-download"></i>
                    </a>
                </div>
            </div>
            <div class="file-info">
                <h4 title="${file.fileName}">${file.fileName}</h4>
                <div class="file-meta">
                    <span>${file.uploaderName || 'Ẩn danh'}</span>
                    <span>${formatBytes(file.fileSize)}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--color-primary); margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                    <span style="background: rgba(0, 229, 255, 0.1); padding: 2px 6px; border-radius: 4px;">Khối ${file.grade === 'university' ? 'ĐH' : file.grade}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Kích hoạt hiệu ứng chuột sau khi render nội dung
    document.querySelectorAll('.mouse-light-wrapper').forEach(wrapper => {
        const light = wrapper.querySelector('.mouse-light');
        if(!light) return;
        wrapper.addEventListener('mousemove', (e) => {
            const rect = wrapper.getBoundingClientRect();
            light.style.left = `${e.clientX - rect.left}px`;
            light.style.top = `${e.clientY - rect.top}px`;
        });
    });
}

// --- Logic Bộ lọc & Tìm kiếm (Client-side Filtering) ---
const searchInp = document.getElementById('fileSearchInp');
const filterSubject = document.getElementById('filterSubject');
const filterGrade = document.getElementById('filterGrade');

function handleFilters() {
    const searchTerm = searchInp.value.toLowerCase().trim();
    const subjectVal = filterSubject.value;
    const gradeVal = filterGrade.value;

    const filteredFiles = allFilesData.filter(file => {
        // 1. Lọc theo từ khóa tìm kiếm trong Tên file
        const matchSearch = file.fileName.toLowerCase().includes(searchTerm);
        // 2. Lọc theo Môn học
        const matchSubject = subjectVal === 'all' || file.subject === subjectVal;
        // 3. Lọc theo Khối lớp
        const matchGrade = gradeVal === 'all' || file.grade === gradeVal;

        return matchSearch && matchSubject && matchGrade;
    });

    renderFiles(filteredFiles);
}

if (searchInp) searchInp.addEventListener('input', handleFilters);
if (filterSubject) filterSubject.addEventListener('change', handleFilters);
if (filterGrade) filterGrade.addEventListener('change', handleFilters);