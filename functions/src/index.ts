
import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// Khởi tạo Admin SDK
admin.initializeApp();

// Định nghĩa một interface để thay thế cho `any`
interface UserData {
    name: string;
    phone: string;
    email: string;
    role: string;
    contractType?: string | null;
    specialty?: string | null;
    courseIds?: string[];
}

/**
 * Cloud Function để tạo người dùng mới, sử dụng cú pháp v2.
 * Hàm này có thể được gọi từ phía client.
 */
export const createUser = onCall(async (request) => {
  // --- 1. XÁC THỰC & VALIDATION ---
  if (!request.auth) {
    // Sửa lỗi max-len: Ngắt dòng thông báo lỗi
    throw new HttpsError(
      "unauthenticated",
      "Bạn phải là quản trị viên để thực hiện hành động này.",
    );
  }

  const {name, phone, role, password, contractType, specialty, courseIds} = request.data;

  if (!name || !phone || !role || !password) {
    // Sửa lỗi max-len: Ngắt dòng thông báo lỗi
    throw new HttpsError(
      "invalid-argument",
      "Dữ liệu không hợp lệ. Vui lòng cung cấp đầy đủ thông tin.",
    );
  }

  if (typeof password !== "string" || password.length < 6) {
    // Sửa lỗi max-len: Ngắt dòng thông báo lỗi
    throw new HttpsError(
      "invalid-argument",
      "Mật khẩu phải là một chuỗi có ít nhất 6 ký tự."
    );
  }

  const email = `${phone}@htts.com`;

  // --- 2. LOGIC CHÍNH ---
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      emailVerified: true,
      password: password,
      displayName: name,
      disabled: false,
    });

    // Sửa lỗi no-explicit-any: Sử dụng interface đã định nghĩa
    const userData: UserData = {
      name,
      phone,
      email,
      role,
    };

    if (role === "Teacher") {
      userData.contractType = contractType || null;
      userData.specialty = specialty || null;
      userData.courseIds = courseIds || [];
    }

    await admin
      .firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set(userData);

    // --- 3. TRẢ VỀ THÀNH CÔNG ---
    return {
      success: true,
      message: `Tạo người dùng ${name} thành công. Mật khẩu đã được thiết lập.`,
      uid: userRecord.uid,
    };
  } catch (error: unknown) {
    // --- 4. XỬ LÝ LỖI ---
    console.error("Lỗi khi tạo người dùng:", error);

    if (typeof error === "object" && error !== null && "code" in error) {
      const firebaseError = error as {code: string; message: string};
      if (firebaseError.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          `Lỗi: Số điện thoại ${phone} đã được một tài khoản khác đăng ký.`
        );
      }
      throw new HttpsError("internal", firebaseError.message, error);
    }

    throw new HttpsError(
      "internal",
      "Đã có lỗi xảy ra trên máy chủ khi tạo người dùng.",
      error,
    );
  }
});
