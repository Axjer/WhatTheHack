import { Link } from 'react-router';
import { navyItemClass } from '../styles';

export const repoUrl = 'https://github.com/Axjer/WhatTheHack';

/** GitHub 標誌（Simple Icons，CC0） */
function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-navy text-surface-raised">
      {/* 手機：logo 與 GitHub 一排、免責聲明在下；桌面：三者同一排、垂直置中 */}
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 px-4 py-5 md:grid-cols-[auto_1fr_auto] md:gap-x-10 md:px-6 md:py-4">
        <Link to="/" className={`${navyItemClass} col-start-1 row-start-1 justify-self-start px-2 py-1 text-xl font-bold`}>
          駭你好
        </Link>
        <p className="col-span-2 row-start-2 text-sm leading-relaxed text-surface-raised/80 md:col-span-1 md:col-start-2 md:row-start-1">
          <span className="block">本站的判定結果僅供參考，是依據公開的惡意網址清單與網址本身的可疑特徵比對而來。</span>
          <span className="block">「查無紀錄」不代表網址安全，「可疑」與「已知惡意」也不保證完全準確。</span>
        </p>
        <a
          href={repoUrl}
          aria-label="GitHub 專案原始碼"
          target="_blank"
          rel="noopener noreferrer"
          className={`${navyItemClass} col-start-2 row-start-1 p-2 md:col-start-3`}
        >
          <GitHubMark />
        </a>
      </div>
    </footer>
  );
}
