import { useId } from 'react';
import { KEV_WINDOW_DAYS, type KevDay, type KevFile } from '../data/kev';
import { isStale } from '../time';

/** YYYY-MM-DD → 11/17（CISA 的日期是純日期，不需換時區） */
function monthDay(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day}`;
}

/** 長條圖：單一數列只用主色深藍（紅黃灰只留給判定結果），數字直接標在長條上方、日期標在下方 */
function Bars({ daily }: { daily: KevDay[] }) {
  const max = Math.max(...daily.map((day) => day.count), 1);
  const description = daily.map(({ date, count }) => `${monthDay(date)} ${count} 筆`).join('、');

  return (
    <figure role="img" aria-label={`近 ${KEV_WINDOW_DAYS} 天每日新增已被利用漏洞：${description}`} className="mt-6">
      <div aria-hidden="true" className="flex h-44 items-end gap-2 border-b border-text-primary/15 md:gap-4">
        {daily.map(({ date, count }) => (
          <div key={date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-sm font-medium tabular-nums">{count}</span>
            {/* 高度依比例；1.75rem 預留給上方的數字（text-sm 行高 1.25rem + gap-1.5），改字級或間距時要一起改 */}
            <div
              className="w-full rounded-t bg-primary"
              style={{ height: count ? `max(4px, calc((100% - 1.75rem) * ${count / max}))` : 0 }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-2 md:gap-4">
        {daily.map(({ date }) => (
          <div key={date} className="flex-1 text-center text-sm text-text-secondary tabular-nums">
            {monthDay(date)}
          </div>
        ))}
      </div>
    </figure>
  );
}

/**
 * 最新情資頁的「已被利用漏洞趨勢」：近 7 天每天新增幾筆（CISA 已被利用漏洞清單）。
 * 不放 CVE 編號與 CVSS 分數；不用燈號顏色，只用主色深藍。
 * 從未更新（佔位檔）時不顯示；超過 48 小時沒更新時照樣顯示，並提醒數字可能不是最新的。
 */
export default function KevTrend({ kev, now }: { kev: KevFile; now: number }) {
  const headingId = useId();
  if (!kev.updatedAt || !kev.daily.length) return null;

  return (
    <section aria-labelledby={headingId} className="mt-16">
      <h2 id={headingId}>已被利用漏洞趨勢</h2>
      <p className="mt-1 text-text-secondary">駭客已經實際拿來攻擊的軟體漏洞，每天新增幾筆。</p>
      <div className="mt-6 rounded-xl bg-surface-raised p-5 shadow-sm md:p-6">
        <h3 className="text-xl font-bold">近 {KEV_WINDOW_DAYS} 天新增已被利用漏洞</h3>
        <Bars daily={kev.daily} />
        {isStale(kev.updatedAt, now) && (
          // 與新聞的過期提醒同樣式：主要文字色加帶藍淺底（紅黃灰只留給判定結果）
          <p className="mt-6 rounded-lg bg-surface-sunken px-3 py-2 text-sm">統計已超過 48 小時沒有更新，數字可能不是最新的。</p>
        )}
      </div>
      <p className="mt-4 text-sm text-text-secondary">資料每日統計一次，圖表數據來自 CISA 已被利用漏洞清單。</p>
    </section>
  );
}
