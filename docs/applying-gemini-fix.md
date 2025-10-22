# Áp dụng bản vá bảo mật Gemini

Tài liệu này mô tả cách áp dụng thay đổi đã đề xuất để bảo mật khóa Gemini API bằng Cloud Functions và đẩy chúng lên GitHub.

## 1. Chuẩn bị
- Cài đặt `firebase-tools` và `npm` trên máy của bạn.
- Đảm bảo bạn đã đăng nhập Firebase (`firebase login`) và có quyền truy cập repo GitHub.
- Sao chép repo về máy nếu chưa có: `git clone <url_repo>` rồi `cd <repo>`.

## 2. Cập nhật mã nguồn
Các chỉnh sửa chính nằm ở bốn tệp sau:

1. `functions/src/index.ts`
   - Thay nội dung bằng phiên bản mới cung cấp Cloud Function `generateGeminiContent`.
2. `functions/tsconfig.json`
   - Cập nhật cấu hình TypeScript để hỗ trợ `fetch`.
3. `vite.config.ts`
   - Gỡ bỏ việc inject `GEMINI_API_KEY` vào bundle.
4. `README.md`
   - Bổ sung hướng dẫn sử dụng secret Gemini và Cloud Function.

Bạn có thể sao chép nội dung tệp mới từ pull request hoặc bản vá và dán vào đúng vị trí trong repository cục bộ.

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

