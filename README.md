<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1u11GHUGzktVKSQQ3zfcJQPGdAy1ErMkw

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Store your Gemini API key securely for Cloud Functions:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```
   The new `generateGeminiContent` callable function will read the key from this
   secret at runtime so it never needs to be bundled with the client.
3. Run the app:
   `npm run dev`

## Áp dụng bản vá bảo mật Gemini
Nếu bạn cần biết chính xác nên sửa các tệp nào và cách đẩy thay đổi lên GitHub, hãy xem tài liệu hướng dẫn chi tiết trong [`docs/applying-gemini-fix.md`](docs/applying-gemini-fix.md).
