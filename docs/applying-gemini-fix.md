# Áp dụng bản vá bảo mật Gemini

Tài liệu này mô tả cách áp dụng thay đổi đã đề xuất để bảo mật khóa Gemini API bằng Cloud Functions và đẩy chúng lên GitHub.

## 1. Chuẩn bị

### 1.1. Chọn cách sao chép bản vá từ giao diện chat

Khi nhấn vào dấu ba chấm ở góc câu trả lời của trợ lý, bạn sẽ thấy hai lựa chọn giống hình minh họa:

- **Sao chép lệnh áp dụng thay đổi**: Dán nguyên cụm vào terminal, lệnh sẽ tạo file tạm, áp dụng diff và dọn dẹp giúp bạn. Cách này thân thiện nếu bạn quen thao tác bằng dòng lệnh.
- **Sao chép bản vá**: Nhận về đoạn diff chuẩn `git`. Bạn có thể lưu vào file `.patch` rồi chạy `git apply <file.patch>` hoặc dán trực tiếp vào lệnh `git apply` để xem và áp dụng thủ công.

Bạn có thể chọn **một trong hai** tùy thói quen. Nếu chưa từng dùng `git apply`, hãy ưu tiên **Sao chép lệnh áp dụng thay đổi** vì nó bao gồm đầy đủ các bước sẵn có.

- Cài đặt `firebase-tools` và `npm` trên máy của bạn.
- Đảm bảo bạn đã đăng nhập Firebase (`firebase login`) và có quyền truy cập repo GitHub.
- Sao chép repo về máy nếu chưa có: `git clone <url_repo>` rồi `cd <repo>`.

## 2. Cập nhật mã nguồn
Các bước dưới đây giả định bạn đang đứng ở thư mục gốc của dự án.

### 2.1. `functions/src/index.ts`
1. Mở tệp: `code functions/src/index.ts` (hoặc dùng trình soạn thảo yêu thích).
2. Xóa toàn bộ nội dung hiện có và dán chính xác đoạn mã mới dưới đây:

```ts
import * as admin from "firebase-admin";
import {defineSecret} from "firebase-functions/params";
import {onCall, HttpsError} from "firebase-functions/v2/https";

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

export const generateGeminiContent = onCall({
    secrets: [GEMINI_API_KEY],
    invoker: "firebase.users", // chỉ người dùng đã xác thực mới được gọi
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Bạn phải đăng nhập để gọi chức năng này.");
    }

    const apiKey = request.secrets.GEMINI_API_KEY;
    if (!apiKey) {
        throw new HttpsError("internal", "GEMINI_API_KEY chưa được cấu hình trên máy chủ.");
    }

    const prompt = typeof request.data?.prompt === "string" ? request.data.prompt.trim() : "";
    if (!prompt) {
        throw new HttpsError("invalid-argument", "Thiếu 'prompt'.");
    }

    const history = sanitizeHistory(request.data?.history);

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
            contents: [
                ...history,
                {
                    role: "user",
                    parts: [{text: prompt}],
                },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new HttpsError("internal", `Gemini API trả về lỗi: ${errorText}`);
    }

    const payload = await response.json() as GeminiGenerateContentResponse;
    const generatedText = extractGeminiText(payload);

    if (!generatedText) {
        throw new HttpsError("internal", "Gemini API không trả về nội dung hợp lệ.");
    }

    return {
        text: generatedText,
    };
});
```

> 📌 **Lưu ý:** Nếu bạn có thêm Cloud Function tự viết ở cuối file, hãy chèn đoạn mã trên trước phần export cuối cùng hoặc hợp nhất thủ công tùy theo cấu trúc hiện có.

### 2.2. `functions/tsconfig.json`
1. Mở tệp: `code functions/tsconfig.json`.
2. Thay nội dung bằng đoạn JSON sau để bật trình biên dịch hiểu `fetch`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2020",
    "lib": ["es2020", "dom"],
    "esModuleInterop": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

### 2.3. `vite.config.ts`
1. Mở tệp: `code vite.config.ts`.
2. Đảm bảo file **không** còn đoạn inject biến môi trường theo mẫu sau và cập nhật thành:

```ts
import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

### 2.4. `README.md`
1. Thêm đoạn mô tả cách Cloud Function hoạt động và cách cấu hình secret (xem ví dụ trong pull request gốc).
2. Bạn có thể sao chép phần “Gemini API Security” từ README của repo này nếu muốn giữ nguyên nội dung.

## 3. Lưu khóa Gemini an toàn
1. Chạy `cd functions`.
2. Thiết lập secret: `firebase functions:secrets:set GEMINI_API_KEY` và nhập khóa khi được yêu cầu.
3. Quay lại thư mục gốc repo: `cd ..`.

## 4. Kiểm tra và commit
```bash
git status -sb
npm run build --prefix functions
git add functions/src/index.ts functions/tsconfig.json vite.config.ts README.md docs/applying-gemini-fix.md
git commit -m "Secure Gemini API via callable function"
```

## 5. Đẩy lên GitHub
```bash
git push origin <ten-nhanh>
```
Thay `<ten-nhanh>` bằng nhánh bạn muốn.

## 6. Triển khai (tùy chọn)
- Nếu đã cấu hình GitHub Actions với Firebase, quá trình build/deploy sẽ tự chạy.
- Hoặc triển khai thủ công: `firebase deploy --only functions` (hoặc `--only hosting,functions`).

## 7. Xác minh
- Kiểm tra Firebase Console → Functions đảm bảo `generateGeminiContent` xuất hiện.
- Gọi thử từ client sau khi đã đăng nhập Firebase để xác nhận hoạt động.

