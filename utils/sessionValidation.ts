import { Course, Session } from '../types';

export interface SessionSchedulePayload {
    id?: string;
    courseId: string;
    teacherId: string;
    startTimestamp: number;
    endTimestamp: number;
}

export interface SessionValidationContext {
    courses: Course[];
    sessions: Session[];
}

export const getCourseTimeBounds = (course: Course) => {
    const courseStart = new Date(course.startDate);
    courseStart.setHours(0, 0, 0, 0);

    const courseEnd = new Date(course.endDate);
    courseEnd.setHours(23, 59, 59, 999);

    return {
        start: courseStart.getTime(),
        end: courseEnd.getTime(),
    };
};

export const hasTimeOverlap = (startA: number, endA: number, startB: number, endB: number) =>
    startA < endB && startB < endA;

export const validateSessionSchedule = (
    sessionData: SessionSchedulePayload,
    { courses, sessions }: SessionValidationContext,
) => {
    if (Number.isNaN(sessionData.startTimestamp) || Number.isNaN(sessionData.endTimestamp)) {
        throw new Error('Thời gian buổi học không hợp lệ.');
    }

    if (sessionData.startTimestamp >= sessionData.endTimestamp) {
        throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
    }

    const relatedCourse = courses.find(course => course.id === sessionData.courseId);
    if (!relatedCourse) {
        throw new Error('Không tìm thấy thông tin khóa học liên quan tới buổi học.');
    }

    const { start: courseStart, end: courseEnd } = getCourseTimeBounds(relatedCourse);
    if (Number.isNaN(courseStart) || Number.isNaN(courseEnd)) {
        throw new Error('Khóa học chưa có thời gian bắt đầu/kết thúc hợp lệ.');
    }

    if (sessionData.startTimestamp < courseStart || sessionData.endTimestamp > courseEnd) {
        throw new Error('Thời gian buổi học phải nằm trong thời gian diễn ra khóa học.');
    }

    const teacherConflict = sessions.some(existing => {
        if (sessionData.id && existing.id === sessionData.id) {
            return false;
        }
        if (existing.teacherId !== sessionData.teacherId) {
            return false;
        }
        return hasTimeOverlap(
            existing.startTimestamp,
            existing.endTimestamp,
            sessionData.startTimestamp,
            sessionData.endTimestamp,
        );
    });

    if (teacherConflict) {
        throw new Error('Giáo viên này đã có buổi học khác trùng thời gian.');
    }

    const courseConflict = sessions.some(existing => {
        if (sessionData.id && existing.id === sessionData.id) {
            return false;
        }
        if (existing.courseId !== sessionData.courseId) {
            return false;
        }
        return hasTimeOverlap(
            existing.startTimestamp,
            existing.endTimestamp,
            sessionData.startTimestamp,
            sessionData.endTimestamp,
        );
    });

    if (courseConflict) {
        throw new Error('Khóa học này đã có buổi học khác trùng thời gian.');
    }
};
