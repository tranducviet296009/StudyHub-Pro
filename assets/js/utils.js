/**
 * StudyHub Pro - Core Utility Functions
 * Xử lý Toast Notifications, Loading State, Form Validation và các hàm Helpers.
 */

// --- 1. Hệ thống Thông báo Toast (Cyberpunk Style) ---
export const showToast = (message, type = 'success') => {
    // Tạo container nếu chưa có
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }

    // Thiết lập màu sắc và icon theo loại thông báo
    let borderColor, icon, glowColor;
    switch (type) {
        case 'success':
            borderColor = 'var(--color-success)';
            glowColor = 'rgba(16, 185, 129, 0.4)';
            icon = '<i class="fa-solid fa-circle-check"></i>';
            break;
        case 'error':
            borderColor = 'var(--color-danger)';
            glowColor = 'rgba(239, 68, 68, 0.4)';
            icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
            break;
        case 'warning':
            borderColor = 'var(--color-warning)';
            glowColor = 'rgba(245, 158, 11, 0.4)';
            icon = '<i class="fa-solid fa-circle-exclamation"></i>';
            break;
        default: // info
            borderColor = 'var(--color-primary)';
            glowColor = 'var(--color-primary-glow)';
            icon = '<i class="fa-solid fa-circle-info"></i>';
    }

    // Tạo phần tử Toast
    const toast = document.createElement('div');
    toast.className = 'glass-panel animate-slide-in-right';
    toast.style.cssText = `
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 12px;
        border-left: 4px solid ${borderColor};
        box-shadow: 0 0 15px ${glowColor};
        min-width: 300px;
        background: rgba(10, 15, 37, 0.9);
        color: var(--text-primary);
        font-weight: 500;
        transition: opacity 0.3s ease, transform 0.3s ease;
    `;

    toast.innerHTML = `
        <span style="color: ${borderColor}; font-size: 1.2rem;">${icon}</span>
        <span style="flex: 1;">${message}</span>
        <button class="toast-close" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem;">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Xử lý đóng toast
    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    };

    closeBtn.addEventListener('click', removeToast);
    
    // Tự động đóng sau 4 giây
    setTimeout(removeToast, 4000);
};

// --- 2. Hệ thống Loading Overlay (Toàn màn hình) ---
export const toggleLoading = (isLoading, message = "Đang xử lý...") => {
    let loader = document.getElementById('global-loader');
    
    if (isLoading) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(5, 8, 22, 0.85);
                backdrop-filter: blur(10px);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                color: var(--color-primary);
            `;
            loader.innerHTML = `
                <div style="width: 50px; height: 50px; border: 3px solid transparent; border-top-color: var(--color-primary); border-bottom-color: var(--color-secondary); border-radius: 50%; animation: spin 1s linear infinite; box-shadow: var(--shadow-neon-primary);"></div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                <p style="margin-top: 15px; font-weight: 600; text-shadow: 0 0 5px var(--color-primary-glow);">${message}</p>
            `;
            document.body.appendChild(loader);
        }
    } else {
        if (loader) {
            loader.remove();
        }
    }
};

// --- 3. Form Validation Helpers ---
export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

export const validatePassword = (password) => {
    // Mật khẩu ít nhất 6 ký tự
    return password.length >= 6;
};

// --- 4. Chuyển đổi file size sang định dạng dễ đọc ---
export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// --- 5. Format ngày tháng ---
export const formatDate = (timestamp) => {
    if (!timestamp) return 'Chưa cập nhật';
    // Xử lý Timestamp của Firestore
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};