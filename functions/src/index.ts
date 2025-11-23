
import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// Khởi tạo Admin SDK
admin.initializeApp();

// --- ENUMS & INTERFACES ---
export enum UserRole {
    ADMIN = 'Admin',
    MANAGER = 'Quản lý',
    TEAM_LEADER = 'Nhóm trưởng',
    TEACHER = 'Giáo viên',
}
interface TeacherPayment {
    type: string;
    amount: number;
    rateUnit?: string;
}
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

// --- HELPER FUNCTIONS ---
async function getCourseTimeBounds(courseId: string) {
  const courseDoc = await admin.firestore().collection("courses").doc(courseId).get();
  const courseData = courseDoc.data();
  if (!courseData) {
    throw new HttpsError("not-found", `Không tìm thấy khóa học với ID: ${courseId}`);
  }
  return {
    startTime: courseData.startTime.toDate(),
    endTime: courseData.endTime.toDate(),
  };
}

function isOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return start1 < end2 && start2 < end1;
}

// --- CORE CLOUD FUNCTIONS ---

export const createUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bạn phải đăng nhập.");
  }
  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== UserRole.ADMIN) {
    throw new HttpsError("permission-denied", "Bạn phải là Admin.");
  }
  const { name, phone, role, password, contractType, specialty, courseIds, theoryPayment, practicePayment } = request.data;
  if (!name || !phone || !role || !password) {
    throw new HttpsError("invalid-argument", "Thông tin không hợp lệ.");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError("invalid-argument", "Mật khẩu phải dài ít nhất 6 ký tự.");
  }
  const email = `${phone}@htts.com`;
  try {
    const userRecord = await admin.auth().createUser({ email, emailVerified: true, password, displayName: name, disabled: false });
    const userData: UserData = { name, phone, email, role };
    if (role === "Giáo viên") {
      userData.contractType = contractType || null;
      userData.specialty = specialty || null;
      userData.courseIds = courseIds || [];
      userData.theoryPayment = theoryPayment || null;
      userData.practicePayment = practicePayment || null;
    }
    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);
    return { success: true, message: `Tạo người dùng ${name} thành công.`, uid: userRecord.uid };
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", `Số điện thoại ${phone} đã được đăng ký.`);
    }
    throw new HttpsError("internal", "Lỗi khi tạo người dùng.", error);
  }
});

export const createSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bạn phải đăng nhập.");
  }
  const { courseId, teacherId, startTime, endTime, title, force = false } = request.data;
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (!courseId || !teacherId || !startTime || !endTime || !title || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new HttpsError("invalid-argument", "Thông tin không hợp lệ.");
  }
  const courseBounds = await getCourseTimeBounds(courseId);
  if (start < courseBounds.startTime || end > courseBounds.endTime) {
    throw new HttpsError("out-of-range", "Buổi học phải nằm trong thời gian khóa học.");
  }
  const sessionsRef = admin.firestore().collection("sessions");
  const teacherSessions = await sessionsRef.where("teacherId", "==", teacherId).get();
  for (const doc of teacherSessions.docs) {
    const session = doc.data();
    const sessionStart = session.startTime.toDate();
    const sessionEnd = session.endTime.toDate();
    if (start.getTime() === sessionStart.getTime() && end.getTime() === sessionEnd.getTime()) {
        throw new HttpsError("already-exists", "Giáo viên đã có buổi học khác trùng thời gian chính xác.");
    }
    if (isOverlapping(start, end, sessionStart, sessionEnd)) {
        if (!force) {
            throw new HttpsError("failed-precondition", "Buổi học trùng một phần với buổi học khác. Vui lòng xác nhận.", { needsConfirmation: true });
        }
    }
  }
  const newSession = { title, courseId, teacherId, startTime: admin.firestore.Timestamp.fromDate(start), endTime: admin.firestore.Timestamp.fromDate(end), createdAt: admin.firestore.FieldValue.serverTimestamp() };
  const sessionRef = await sessionsRef.add(newSession);
  return { success: true, message: "Buổi học đã được tạo.", id: sessionRef.id };
});


// --- DATA CLEANUP FUNCTIONS ---

export const findDuplicateSessions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bạn phải đăng nhập.");
  }
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  if (callerDoc.data()?.role !== UserRole.ADMIN) {
    throw new HttpsError("permission-denied", "Bạn phải là Admin.");
  }

  const snapshot = await admin.firestore().collection("sessions").get();
  if (snapshot.empty) {
    return { success: true, message: "Không có buổi học nào.", duplicates: [] };
  }

  const seen = new Set<string>();
  const duplicates: any[] = [];
  
  // Sắp xếp để giữ lại bản ghi được tạo trước
  const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  sessions.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

  for (const session of sessions) {
      const key = `${session.teacherId}_${session.startTime.toMillis()}_${session.endTime.toMillis()}`;
      if (seen.has(key)) {
          duplicates.push({
              id: session.id,
              title: session.title,
              teacherId: session.teacherId,
              courseId: session.courseId,
              startTime: session.startTime.toDate().toISOString(),
              endTime: session.endTime.toDate().toISOString(),
          });
      } else {
          seen.add(key);
      }
  }

  return { success: true, message: `Tìm thấy ${duplicates.length} buổi học trùng lặp.`, duplicates };
});
