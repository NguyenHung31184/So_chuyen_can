
import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// Khởi tạo Admin SDK
admin.initializeApp();

export enum UserRole {
    ADMIN = 'Admin',
    MANAGER = 'Quản lý',
    TEAM_LEADER = 'Nhóm trưởng',
    TEACHER = 'Giáo viên',
}

// Định nghĩa interface cho dữ liệu thanh toán
interface TeacherPayment {
    type: string;
    amount: number;
    rateUnit?: string;
}

// Cập nhật interface UserData để bao gồm cả thông tin thanh toán
interface UserData {
    name: string;
    phone: string;
    email: string;
    role: string;
    contractType?: string | null;
    specialty?: string | null;
    courseIds?: string[];
    theoryPayment?: TeacherPayment | null;
    practicePayment?: TeacherPayment | null;
}

/**
 * Cloud Function để tạo người dùng mới.
 */
export const createUser = onCall(async (request) => {
  // --- 1. XÁC THỰC & VALIDATION ---

  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Bạn phải là quản trị viên để thực hiện hành động này."
    );
  }

  // Lấy tất cả dữ liệu từ request, bao gồm cả thông tin thanh toán
  const {
      name,
      phone,
      role,
      password,
      contractType,
      specialty,
      courseIds,
      theoryPayment,
      practicePayment
  } = request.data;

  if (!name || !phone || !role || !password) {
    throw new HttpsError(
      "invalid-argument",
      "Dữ liệu không hợp lệ. Vui lòng cung cấp đầy đủ thông tin."
    );
  }

  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Mật khẩu phải là một chuỗi có ít nhất 6 ký tự."
    );
  }

  const email = `${phone}@htts.com`;

  // --- 2. LOGIC CHÍNH ---

  try {
    // Tạo người dùng trong Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      emailVerified: true,
      password: password,
      displayName: name,
      disabled: false,
    });

    // Chuẩn bị dữ liệu để lưu vào Firestore
    const userData: UserData = {
      name,
      phone,
      email,
      role,
    };

    // **FIX: Sử dụng giá trị Enum chính xác và thêm dữ liệu thanh toán**
    if (role === "Giáo viên") {
      userData.contractType = contractType || null;
      userData.specialty = specialty || null;
      userData.courseIds = courseIds || [];
      userData.theoryPayment = theoryPayment || null;
      userData.practicePayment = practicePayment || null;
    }

    // Lưu thông tin người dùng vào Firestore
    await admin
      .firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set(userData);

    // --- 3. TRẢ VỀ THÀNH CÔNG ---

    return {
      success: true,
      message: `Tạo người dùng ${name} thành công.`,
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
      error
    );
  }
});
