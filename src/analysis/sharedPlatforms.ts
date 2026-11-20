/**
 * 共用平台：允許任何人上傳內容的網域（見 GLOSSARY.md）。
 * 其上的網址只依完整網址判定；列出的網域本身與它的所有子網域都算（例如 `github.io` 含 `someone.github.io`）。
 * 一律小寫、不含 `www.`。
 */
export const sharedPlatforms: readonly string[] = [
  // Google
  'drive.google.com',
  'docs.google.com',
  'sites.google.com',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'web.app',
  'firebaseapp.com',
  'blogspot.com',
  // Microsoft
  'onedrive.live.com',
  'sharepoint.com',
  'blob.core.windows.net',
  // 程式碼與網站託管
  'github.io',
  'github.com',
  'raw.githubusercontent.com',
  'gitlab.io',
  'netlify.app',
  'vercel.app',
  'pages.dev',
  'workers.dev',
  'herokuapp.com',
  'glitch.me',
  // 檔案分享與架站
  'dropbox.com',
  'dl.dropboxusercontent.com',
  'mediafire.com',
  'cdn.discordapp.com',
  'wordpress.com',
  'wixsite.com',
  'weebly.com',
  'notion.site',
];
