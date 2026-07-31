/**
 * StudyHub Pro - Authentication Logic
 * Xử lý Đăng nhập, Đăng ký, Đăng nhập MXH và Quản lý phiên người dùng.
 */

import { auth, db } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    GithubAuthProvider, 
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showToast, toggleLoading, validateEmail, validatePassword } from './utils.js';

// --- 1. Theo dõi trạng thái đăng nhập ---
// Nếu người dùng đã đăng nhập và đang ở trang login/register -> chuyển hướng vào dashboard
const currentPath = window.location.pathname;
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (currentPath.includes('login.html') || currentPath.includes('register.html') || currentPath === '/' || currentPath.endsWith('index.html')) {
            window.location.href = 'dashboard.html';
        }
    } else {
        // Nếu chưa đăng nhập mà truy cập trang yêu cầu quyền -> đá ra login
        const protectedRoutes = ['dashboard.html', 'profile.html', 'upload.html', 'admin.html', 'teacher.html', 'settings.html'];
        const isProtected = protectedRoutes.some(route => currentPath.includes(route));
        if (isProtected) {
            window.location.href = 'login.html';
        }
    }
});

// --- 2. Xử lý Đăng Nhập (Email/Password) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!validateEmail(email)) {
            showToast('Email không hợp lệ.', 'warning');
            return;
        }

        toggleLoading(true, "Đang đăng nhập...");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showToast('Đăng nhập thành công!', 'success');
            // onAuthStateChanged sẽ tự động chuyển hướng
        } catch (error) {
            console.error("Login Error:", error);
            let msg = 'Đăng nhập thất bại. Vui lòng thử lại.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = 'Email hoặc mật khẩu không chính xác.';
            } else if (error.code === 'auth/too-many-requests') {
                msg = 'Tài khoản bị tạm khóa do nhập sai quá nhiều lần.';
            }
            showToast(msg, 'error');
        } finally {
            toggleLoading(false);
        }
    });
}

// --- 3. Xử lý Đăng Ký (Email/Password) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullname = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const role = document.querySelector('input[name="role"]:checked').value;

        if (!validateEmail(email)) {
            showToast('Email không hợp lệ.', 'warning');
            return;
        }
        if (!validatePassword(password)) {
            showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'warning');
            return;
        }
        if (password !== confirmPassword) {
            showToast('Mật khẩu xác nhận không khớp.', 'warning');
            return;
        }

        toggleLoading(true, "Đang tạo tài khoản...");
        try {
            // 1. Tạo user trên Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Cập nhật Profile (Display Name)
            await updateProfile(user, { displayName: fullname });

            // 3. Lưu thông tin user và Role vào Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                fullname: fullname,
                role: role, // 'student' hoặc 'teacher'
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullname)}&background=00E5FF&color=050816`,
                status: 'active',
                createdAt: serverTimestamp()
            });

            showToast('Đăng ký thành công! Đang chuyển hướng...', 'success');
            // onAuthStateChanged sẽ tự động chuyển hướng
        } catch (error) {
            console.error("Register Error:", error);
            let msg = 'Đăng ký thất bại. Vui lòng thử lại.';
            if (error.code === 'auth/email-already-in-use') {
                msg = 'Email này đã được sử dụng.';
            }
            showToast(msg, 'error');
        } finally {
            toggleLoading(false);
        }
    });
}

// --- 4. Đăng nhập qua Mạng Xã Hội ---
const handleSocialLogin = async (provider, providerName) => {
    toggleLoading(true, `Đang kết nối với ${providerName}...`);
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Kiểm tra xem user đã có trong Firestore chưa
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // Nếu là user mới từ MXH, mặc định role là student
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                fullname: user.displayName || 'Người dùng ẩn danh',
                role: 'student',
                avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=00E5FF&color=050816`,
                status: 'active',
                createdAt: serverTimestamp()
            });
        }
        showToast(`Đăng nhập ${providerName} thành công!`, 'success');
    } catch (error) {
        console.error(`${providerName} Login Error:`, error);
        if (error.code !== 'auth/popup-closed-by-user') {
            showToast(`Lỗi đăng nhập ${providerName}.`, 'error');
        }
    } finally {
        toggleLoading(false);
    }
};

const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        handleSocialLogin(provider, 'Google');
    });
}

const githubLoginBtn = document.getElementById('githubLoginBtn');
if (githubLoginBtn) {
    githubLoginBtn.addEventListener('click', () => {
        const provider = new GithubAuthProvider();
        handleSocialLogin(provider, 'GitHub');
    });
}