# 每日更新的觸發方式

網站每天更新一次惡意網址清單、最新情資新聞與 CISA KEV 統計，做法是執行 `.github/workflows/deploy.yml` 並重新部署。

| 觸發方式 | 時間 | 角色 |
|---|---|---|
| cron-job.org 呼叫 GitHub API（`workflow_dispatch`） | 每天台灣時間 06:07，誤差約一分鐘 | 主要 |
| GitHub 排程（`schedule`，UTC 22:07） | 名義上同一時間，實際在這個 repo 常延遲約 6 小時，偶爾會被丟掉 | 備援 |
| 推上 `main` | 合併 PR 時 | 順帶更新 |

一天跑兩次以上沒有壞處：已經有摘要的新聞會直接沿用，KEV 與惡意網址清單每次都重新抓。

## 設定步驟

### 1. 在 GitHub 建立 fine-grained token

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token

- **Token name**：`cron-job.org daily update`
- **Expiration**：最長的期限（記下到期日，見下方「更換 token」）
- **Repository access**：Only select repositories → `Axjer/WhatTheHack`
- **Permissions** → Repository permissions → **Actions：Read and write**（Metadata 會自動變成 Read-only，其他權限都不要開）

這個 token 只能觸發與查看這個 repo 的 workflow。就算外流，別人最多也只能多觸發幾次部署，不能改程式碼或讀到 Secrets。

### 2. 在 cron-job.org 建立排程

cron-job.org → Create cronjob

- **Title**：`駭你好 每日更新`
- **URL**：`https://api.github.com/repos/Axjer/WhatTheHack/actions/workflows/deploy.yml/dispatches`
- **Execution schedule**：每天 06:07，時區選 `Asia/Taipei`
- **Advanced** 頁籤：
  - **Request method**：`POST`
  - **Headers**：
    - `Authorization`：`Bearer <剛剛建立的 token>`
    - `Accept`：`application/vnd.github+json`
    - `X-GitHub-Api-Version`：`2022-11-28`
    - `Content-Type`：`application/json`
  - **Request body**：`{"ref":"main"}`
- **Notifications**：勾選執行失敗時寄信通知

GitHub 成功時回傳 **HTTP 204**（沒有內容），這是正常的。

### 3. 確認

在 cron-job.org 按 **Test run**，接著到 repo 的 Actions 頁面，應該會看到一筆事件為 `workflow_dispatch` 的「Deploy to GitHub Pages」開始執行。

## 更換 token

token 到期後，cron-job.org 會開始收到 **HTTP 401**（有開通知的話會收到信）。這段期間只剩 GitHub 排程這個備援，更新會變慢。處理方式：

1. 照步驟 1 建立新的 token。
2. 在 cron-job.org 編輯這個排程，把 `Authorization` 標頭換成新 token。
3. 按 Test run 確認回傳 204。
4. 刪除 GitHub 上舊的 token。

## 排查

| cron-job.org 收到的回應 | 原因 |
|---|---|
| 204 | 成功 |
| 401 | token 錯誤或已過期 |
| 403 | token 沒有 Actions 寫入權限，或沒有選到這個 repo |
| 404 | 網址打錯，或 token 看不到這個 repo |
| 422 | Request body 的 `ref` 不是存在的分支 |
