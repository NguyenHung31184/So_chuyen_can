
const admin = require("firebase-admin");

try {
    admin.initializeApp();
} catch (e) {
    // App may already be initialized
}

const db = admin.firestore();

async function findUser() {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', '0989057482').get();

        if (snapshot.empty) {
            console.log('Không tìm thấy người dùng có số điện thoại 0989057482.');
            return;
        }

        console.log('Đã tìm thấy người dùng:');
        snapshot.forEach(doc => {
            const userData = doc.data();
            console.log(`- ID: ${doc.id}, Tên: ${userData.name}, SĐT: ${userData.phone}, Vai trò: ${userData.role}`);
        });
    } catch (error) {
        console.error("Lỗi khi truy vấn Firestore:", error);
    }
}

findUser();
