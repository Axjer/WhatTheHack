import { useId } from 'react';
import { KEV_WINDOW_DAYS, type KevDay, type KevFile } from '../data/kev';
import { isStale } from '../time';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 11/17 與星期（CISA 的日期是純日期，不需換時區） */
function dayLabel(date: string) {
  const [, month, day] = date.split('-').map(Number);
  return { monthDay: `${month}/${day}`, weekday: WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] };
}

/** 一句白話結論：跟前 7 天比較，並說該怎麼做 */
function conclusion(total: number, previousWeek: number): string {
  if (total === 0) return `結論：近 ${KEV_WINDOW_DAYS} 天沒有新增已被利用的漏洞。平常仍建議開啟電腦與手機的自動更新。`;
  const diff = total - previousWeek;
  const head = `結論：近 ${KEV_WINDOW_DAYS} 天新增 ${total} 筆，`;
  if (diff > 0) return `${head}比前 ${KEV_WINDOW_DAYS} 天多 ${diff} 筆，建議優先檢查軟體更新。`;
  if (diff < 0) return `${head}比前 ${KEV_WINDOW_DAYS} 天少 ${-diff} 筆，仍建議定期檢查軟體更新。`;
  return `${head}和前 ${KEV_WINDOW_DAYS} 天一樣多，建議定期檢查軟體更新。`;
}

/** 長條圖：單一數列只用主色深藍（紅黃灰只留給判定結果），數字直接標在長條上方 */
function Bars({ daily }: { daily: KevDay[] }) {
  const max = Math.max(...daily.map((day) => day.count), 1);
  const description = daily
    .map(({ date, count }) => {
      const { monthDay, weekday } = dayLabel(date);
      return `${monthDay}（${weekday}）${count} 筆`;
    })
    .join('、');

  return (
    <figure role="img" aria-label={`近 ${KEV_WINDOW_DAYS} 天每日新增已被利用漏洞：${description}`} className="mt-6">
      <div aria-hidden="true" className="flex h-44 items-end gap-2 border-b border-text-primary/15 md:gap-4">
        {daily.map(({ date, count }) => (
          <div key={date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-sm font-medium tabular-nums">{count}</span>
            {/* 高度依比例；扣掉數字標籤的空間，最高的一根剛好頂到圖表上緣 */}
            <div
              className="w-full rounded-t bg-primary"
              style={{ height: count ? `max(4px, calc((100% - 1.75rem) * ${count / max}))` : 0 }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-2 md:gap-4">
        {daily.map(({ date }) => {
          const { monthDay, weekday } = dayLabel(date);
          return (
            <div key={date} className="flex-1 text-center leading-tight">
              <div className="text-sm">{weekday}</div>
              <div className="text-xs text-text-secondary tabular-nums">{monthDay}</div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

/**
 * 最新情資頁的「已被利用漏洞趨勢」：近 7 天每天新增幾筆（CISA 已被利用漏洞清單），附一句結論。
 * 不放 CVE 編號與 CVSS 分數；不用燈號顏色，只用主色深藍。
 * 從未更新（佔位檔）時不顯示；超過 48 小時沒更新時照樣顯示，並提醒數字可能不是最新的。
 */
export default function KevTrend({ kev, now }: { kev: KevFile; now: number }) {
  const headingId = useId();
  if (!kev.updatedAt || !kev.daily.length) return null;
  const total = kev.daily.reduce((sum, day) => sum + day.count, 0);

  return (
    <section aria-labelledby={headingId} className="mt-16">
      <h2 id={headingId}>已被利用漏洞趨勢</h2>
      <p className="mt-1 text-text-secondary">駭客已經實際拿來攻擊的軟體漏洞，每天新增幾筆。</p>
      <div className="mt-6 rounded-xl bg-surface-raised p-5 shadow-sm md:p-6">
        <h3 className="text-xl font-bold">近 {KEV_WINDOW_DAYS} 天新增已被利用漏洞</h3>
        <Bars daily={kev.daily} />
        <p className="mt-6">{conclusion(total, kev.previousWeek)}</p>
        {isStale(kev.updatedAt, now) && (
          <p className="mt-2 text-sm text-text-secondary">統計已超過 48 小時沒有更新，數字可能不是最新的。</p>
        )}
      </div>
      <p className="mt-4 text-sm text-text-secondary">資料每日統計一次，圖表數據來自 CISA 已被利用漏洞清單。</p>
    </section>
  );
}
