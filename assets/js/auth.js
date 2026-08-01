/

* StudyHub Pro - Authentication Logic
* Xử lý Đăng nhập, Đăng ký, Đăng nhập MXH và Quản lý phiên người dùng.
*/

import { auth, database, storage, googleProvider, githubProvider } from './firebase.js';
import {
signInWithEmailAndPassword,
createUserWithEmailAndPassword,
signInWithPopup,
onAuthStateChanged,
updateProfile
} from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js](https://www.google.com/search?q=https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js)";
import {
ref,
set,
get,
update
} from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js](https://www.google.com/search?q=https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js)";
import { showToast, toggleLoading, validateEmail, validatePassword } from './utils.js';

const BASE_PATH = "/StudyHub-Pro/";

function go(page) {
window.location.href = BASE_PATH + page;
}

// --- 1. Theo dõi trạng thái đăng nhập ---
const currentPath = window.location.pathname;
onAuthStateChanged(auth, (user) => {
if (user) {
if (currentPath.includes('login.html') || currentPath.includes('register.html') || currentPath === '/' || currentPath.endsWith('index.html')) {
go('dashboard.html');
}
} else {
const protectedRoutes = ['dashboard.html', 'profile.html', 'upload.html', 'admin.html', 'teacher.html', 'settings.html'];
const isProtected = protectedRoutes.some(route => currentPath.includes(route));
if (isProtected) {
go('login.html');
}
}
});

// --- 2. Xử lý Đăng Nhập (Email/Password) ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
loginForm.addEventListener('submit', async (e) => {
e.preventDefault();

```
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!validateEmail(email)) {
        showToast('Email không hợp lệ.', 'warning');
        return;
    }

    toggleLoading(true, "Đang đăng nhập...");
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await update(ref(database, "users/" + user.uid), {
            lastLogin: Date.now()
        });

        showToast('Đăng nhập thành công!', 'success');
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

```

}

// --- 3. Xử lý Đăng Ký (Email/Password) ---
const registerForm = document.getElementById('registerForm');
if (registerForm) {
registerForm.addEventListener('submit', async (e) => {
e.preventDefault();

```
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const roleEl = document.querySelector('input[name="role"]:checked');
    const role = roleEl ? roleEl.value : 'student';

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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: fullname });

        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullname)}&background=00E5FF&color=050816`;

        await set(ref(database, "users/" + user.uid), {
            uid: user.uid,
            fullname: fullname,
            email: user.email,
            role: role,
            avatar: avatarUrl,
            status: 'active',
            provider: "password",
            createdAt: Date.now(),
            lastLogin: Date.now()
        });

        showToast('Đăng ký thành công! Đang chuyển hướng...', 'success');
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

```

}

// --- 4. Đăng nhập qua Mạng Xã Hội ---
const handleSocialLogin = async (provider, providerName) => {
toggleLoading(true, `Đang kết nối với ${providerName}...`);
try {
const result = await signInWithPopup(auth, provider);
const user = result.user;

```
    const userRef = ref(database, "users/" + user.uid);
    const snapshot = await get(userRef);

    const displayName = user.displayName || 'Người dùng ẩn danh';
    const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00E5FF&color=050816`;

    if (snapshot.exists()) {
        await update(userRef, {
            lastLogin: Date.now(),
            photoURL: photoURL,
            avatar: photoURL, 
            displayName: displayName,
            fullname: displayName 
        });
    } else {
        await set(userRef, {
            uid: user.uid,
            email: user.email,
            fullname: displayName,
            displayName: displayName,
            role: 'student',
            avatar: photoURL,
            photoURL: photoURL,
            status: 'active',
            provider: providerName.toLowerCase(),
            createdAt: Date.now(),
            lastLogin: Date.now()
        });
    }
    showToast(`Đăng nhập ${providerName} thành công!`, 'success');
} catch (error) {
    console.error(`${providerName} Login Error:`, error);
    if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        showToast(`Lỗi đăng nhập ${providerName}.`, 'error');
    }
} finally {
    toggleLoading(false);
}

```

};

const googleLoginBtn = document.getElementById('googleLoginBtn');
if (googleLoginBtn) {
googleLoginBtn.addEventListener('click', () => {
handleSocialLogin(googleProvider, 'Google');
});
}

const githubLoginBtn = document.getElementById('githubLoginBtn');
if (githubLoginBtn) {
githubLoginBtn.addEventListener('click', () => {
handleSocialLogin(githubProvider, 'GitHub');
});
}

// END OF auth.js
