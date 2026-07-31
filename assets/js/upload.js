/**
 * StudyHub Pro - Document Upload Logic
 * Xử lý Drag-and-Drop, kiểm tra kích thước / định dạng tệp tin tin cậy,
 * theo dõi tiến trình truyền tải theo phần trăm (Task Progress Real-time),
 * lưu dữ liệu phân tích cấu trúc vào Cloud Firestore.
 */

import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { showToast, formatBytes } from './utils.js';

let selectedFile = null;
let currentUserData = null;

// Xác thực phiên làm việc và kiểm tra phân quyền truy cập nâng cao (Giáo viên hoặc Admin)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                currentUserData = userDoc.data();
                
                // Chặn Học sinh (Student) không cho phép đăng tải vô tội vạ
                if (currentUserData.role === 'student') {
                    showToast("Tài khoản của bạn không có đặc quyền tải lên tài liệu học tập.", "warning");
                    window.location.href = 'dashboard.html';
                    return;
                }
                
                // Đồng bộ hiển thị Sidebar Profile
                document.getElementById('sidebarName').textContent = currentUserData.fullname;
                document.getElementById('sidebarRole').textContent = currentUserData.role;
                document.getElementById('sidebarAvatar').src = currentUserData.avatar;
                
                // Kết xuất bổ sung menu nếu là Admin
                if (currentUserData.role === 'admin') {
                    const roleMenu = document.getElementById('roleMenuContainer');
                    if(roleMenu) {
                        roleMenu.innerHTML = `
                            <div class="menu-label">Quản Trị Hệ Thống</div>
                            <a href="admin.html" class="menu-item"><i class="fa-solid fa-user-shield"></i> <span>Quản lý User</span></a>
                        `;
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    } else {
        window.location.href = 'login.html';
    }
});

// --- Quản lý Tương Tác Vùng Dropzone Kéo Thả ---
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const previewName = document.getElementById('previewName');
const previewSize = document.getElementById('previewSize');
const removeFileBtn = document.getElementById('removeFileBtn');

// Click vào vùng dropzone để mở hộp thoại chọn file mặc định của OS
dropzone.addEventListener('click', (e) => {
    if (e.target.closest('#removeFileBtn') || e.target.closest('#filePreview')) return;
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files[0]);
});

// Các sự kiện Drag Over và Drag Leave để đổi CSS Border sáng lên
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
    }
});

// Hàm kiểm soát và định cấu hình File được chọn đầu vào
function handleFileSelection(file) {
    if (!file) return;

    // Giới hạn kích thước File (Tối đa 20MB)
    const maxSizeBytes = 20 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        showToast("Tệp quá lớn! Vui lòng chọn tệp nhỏ hơn 20MB.", "error");
        return;
    }

    // Kiểm tra định dạng đuôi mở rộng hợp lệ
    const allowedExtensions = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'zip', 'rar'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
        showToast("Định dạng tệp không được hỗ trợ trên StudyHub.", "warning");
        return;
    }

    selectedFile = file;
    
    // Cập nhật UI Preview
    previewName.textContent = file.name;
    previewSize.textContent = formatBytes(file.size);
    filePreview.style.display = 'flex';
}

// Xóa file đã chọn để chọn lại file khác
removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    filePreview.style.display = 'none';
});

// --- Xử lý Submit Form và Tải Lên Đám Mây Real-time ---
const uploadForm = document.getElementById('uploadForm');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedFile) {
        showToast("Vui lòng kéo thả hoặc chọn một tệp tài liệu trước.", "warning");
        return;
    }

    const docCustomName = document.getElementById('documentName').value.trim();
    const subject = document.getElementById('documentSubject').value;
    const grade = document.getElementById('documentGrade').value;
    const desc = document.getElementById('documentDesc').value.trim();
    
    // Quyết định tên tệp hiển thị sau cùng
    const finalFileName = docCustomName || selectedFile.name;
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();

    // Hiển thị thanh tiến trình tải lên
    progressContainer.style.display = 'block';
    progressText.style.display = 'block';
    
    // Vô hiệu hóa nút Submit tạm thời để tránh Spam Double Click
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        // 1. Tạo đường dẫn lưu trữ duy nhất trên Firebase Storage
        const fileStoragePath = `documents/${auth.currentUser.uid}_${Date.now()}_${selectedFile.name}`;
        const storageRef = ref(storage, fileStoragePath);

        // 2. Kích hoạt luồng Upload Task Resumable để bắt % tiến độ
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        uploadTask.on('state_changed', 
            (snapshot) => {
                // Tính toán phần trăm tiến độ
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Đang tải lên: ${Math.round(progress)}%`;
            }, 
            (error) => {
                // Xử lý khi gặp lỗi luồng truyền dữ liệu
                console.error("Storage Upload Error:", error);
                showToast("Lỗi truyền dữ liệu lên Cloud Storage.", "error");
                submitBtn.disabled = false;
            }, 
            async () => {
                // 3. Khối xử lý sau khi tệp tin tải lên thành công trọn vẹn
                const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

                // 4. Lưu Metadata tương ứng vào Collection "files" trên Firestore
                await addDoc(collection(db, "files"), {
                    fileName: finalFileName,
                    originalName: selectedFile.name,
                    fileExtension: fileExtension,
                    fileSize: selectedFile.size,
                    downloadUrl: downloadUrl,
                    storagePath: fileStoragePath,
                    subject: subject,
                    grade: grade,
                    description: desc,
                    uploaderUid: auth.currentUser.uid,
                    uploaderName: currentUserData.fullname,
                    views: 0,
                    downloads: 0,
                    rating: 5.0,
                    uploadedAt: serverTimestamp()
                });

                showToast("Tài liệu đã được tải lên và phê duyệt thành công!", "success");
                
                // Reset Form
                uploadForm.reset();
                selectedFile = null;
                filePreview.style.display = 'none';
                progressContainer.style.display = 'none';
                progressText.style.display = 'none';
                submitBtn.disabled = false;
            }
        );

    } catch (error) {
        console.error("Firestore Save Error:", error);
        showToast("Đã xảy ra lỗi trong quá trình cấu trúc siêu dữ liệu.", "error");
        submitBtn.disabled = false;
    }
});