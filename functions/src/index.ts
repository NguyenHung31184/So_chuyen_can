
import * as admin from "firebase-admin";
import {defineSecret} from "firebase-functions/params";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// Khởi tạo Admin SDK
admin.initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

interface GeminiHistoryPart {
    text: string;
}

interface GeminiHistoryEntry {
    role: "user" | "model";
    parts: GeminiHistoryPart[];
}

interface GeminiGenerateContentResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{text?: string}>;
        };
    }>;
}

const sanitizeHistory = (history: unknown): GeminiHistoryEntry[] => {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .map((entry) => {
            if (typeof entry !== "object" || entry === null) {
                return null;
            }

            const role = (entry as {role?: unknown}).role;
            if (role !== "user" && role !== "model") {
                return null;
            }

            const parts = Array.isArray((entry as {parts?: unknown}).parts)
                ? (entry as {parts?: unknown}).parts as unknown[]
                : [];

            const sanitizedParts = parts
                .map((part) => {
                    if (typeof part !== "object" || part === null) {
                        return null;
                    }
                    const text = (part as {text?: unknown}).text;
                    if (typeof text !== "string" || text.trim().length === 0) {
                        return null;
                    }
                    return {text};
                })
                .filter((part): part is GeminiHistoryPart => part !== null);

            if (sanitizedParts.length === 0) {
                return null;
            }

            return {
                role,
                parts: sanitizedParts,
            } satisfies GeminiHistoryEntry;
        })
        .filter((entry): entry is GeminiHistoryEntry => entry !== null)
        .slice(-10);
};

const extractGeminiText = (payload: GeminiGenerateContentResponse): string | null => {
    if (!payload.candidates || payload.candidates.length === 0) {
        return null;
    }

    for (const candidate of payload.candidates) {
        const candidateText = candidate?.content?.parts
            ?.map((part) => part?.text ?? "")
            .join("")
            .trim();

        if (candidateText) {
            return candidateText;
        }
    }

    return null;
};

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

export const generateGeminiContent = onCall({secrets: [GEMINI_API_KEY]}, async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Bạn phải đăng nhập để sử dụng trợ lý AI."
    );
  }

  const promptInput = (request.data ?? {}).prompt;
  const prompt = typeof promptInput === "string" ? promptInput.trim() : "";

  if (!prompt) {
    throw new HttpsError(
      "invalid-argument",
      "Prompt phải là một chuỗi ký tự không rỗng."
    );
  }

  const history = sanitizeHistory((request.data ?? {}).history);

  const contents = [
    ...history,
    {role: "user", parts: [{text: prompt}]},
  ];

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY.value(),
        },
        body: JSON.stringify({
          contents,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API request failed:", errorText);
      throw new HttpsError(
        "internal",
        "Gemini API trả về lỗi. Vui lòng thử lại sau."
      );
    }

    const payload = await response.json() as GeminiGenerateContentResponse;
    const text = extractGeminiText(payload);

    if (!text) {
      console.error("Gemini API did not return a valid text response:", payload);
      throw new HttpsError(
        "internal",
        "Không nhận được phản hồi hợp lệ từ Gemini."
      );
    }

    return {
      text,
    };
  } catch (error) {
    console.error("Unexpected error while calling Gemini API:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Không thể kết nối tới Gemini API. Vui lòng thử lại sau."
    );
  }
});
