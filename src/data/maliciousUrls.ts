import type { MaliciousEntry } from '../analysis/analyzeUrl';

/**
 * 暫時的惡意網址清單：之後由每日更新（URLhaus + OpenPhish，GitHub Actions 產生的靜態檔）取代。
 * 只放 `.example` 等保留網域與共用平台上虛構的路徑，不指涉真實網站。
 */
export const maliciousUrls: readonly MaliciousEntry[] = [
  {
    url: 'https://evil-login.example/pay',
    source: 'URLhaus',
    threat: 'malware',
    firstSeen: '2026-11-13T08:00:00+08:00',
    lastSeen: '2026-11-18T08:00:00+08:00',
  },
  {
    url: 'https://evil-login.example/pay',
    source: 'OpenPhish',
    threat: 'phishing',
    firstSeen: '2026-11-14T08:00:00+08:00',
    lastSeen: '2026-11-15T08:00:00+08:00',
  },
  {
    url: 'http://phishing.example/verify-account',
    source: 'OpenPhish',
    threat: 'phishing',
    firstSeen: '2026-11-10T08:00:00+08:00',
    lastSeen: '2026-11-17T08:00:00+08:00',
  },
  {
    url: 'http://malware-download.example/invoice.exe',
    source: 'URLhaus',
    threat: 'malware',
    firstSeen: '2026-11-11T08:00:00+08:00',
    lastSeen: '2026-11-19T08:00:00+08:00',
  },
  {
    url: 'https://drive.google.com/file/d/fake-malware-file/view',
    source: 'URLhaus',
    threat: 'malware',
    firstSeen: '2026-11-12T08:00:00+08:00',
    lastSeen: '2026-11-16T08:00:00+08:00',
  },
  {
    url: 'https://fake-bank-login.github.io/',
    source: 'OpenPhish',
    threat: 'phishing',
    firstSeen: '2026-11-09T08:00:00+08:00',
    lastSeen: '2026-11-18T08:00:00+08:00',
  },
];
