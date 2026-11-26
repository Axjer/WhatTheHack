import { useId } from 'react';
import { KEV_WINDOW_DAYS, type KevFile, type KevProduct } from '../data/kev';
import { interactiveClass } from '../styles';
import { isStale } from '../time';

/** YYYY-MM-DD → 11/17（CISA 的日期是純日期，不需換時區） */
function monthDay(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day}`;
}

/** 產品清單：桌面兩欄（CSS columns，由上往下再換欄，保持新到舊的閱讀順序），手機一欄 */
function ProductList({ products }: { products: KevProduct[] }) {
  return (
    <ul className="mt-4 lg:columns-2 lg:gap-12">
      {products.map((product) => (
        <ProductRow key={product.name} product={product} />
      ))}
    </ul>
  );
}

function ProductRow({ product }: { product: KevProduct }) {
  return (
    // break-inside-avoid：桌面兩欄（CSS columns）時一項不會被拆到兩欄
    <li className="break-inside-avoid border-b border-text-primary/10 py-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-bold">{product.name}</h3>
        <time dateTime={product.latestDate} className="shrink-0 text-sm text-text-secondary tabular-nums">
          {monthDay(product.latestDate)} 收錄
        </time>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-text-secondary">{product.count} 個漏洞正被利用</p>
        {product.ransomware && (
          // 嚴重程度只用主色深藍的淺底加文字：紅黃灰只留給判定結果
          <p className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">已被用於勒索軟體攻擊</p>
        )}
      </div>
    </li>
  );
}

/**
 * 最新情資頁的「最近正被攻擊的軟體」：近 30 天 CISA 已被利用漏洞清單收錄的產品，各自由新到舊。
 * 一般人常用的軟體直接顯示；其他產品（多為公司或機構使用）預設收起來，摘要列寫出數量。
 * 建議只在清單上方說一次；不放 CVE 編號與 CVSS 分數；不用燈號顏色，只用主色深藍。
 * 從未更新（佔位檔）時不顯示；超過 48 小時沒更新時照樣顯示，並提醒清單可能不是最新的。
 */
export default function KevProducts({ kev, now }: { kev: KevFile; now: number }) {
  const headingId = useId();
  // 格式不符（例如瀏覽器快取到改版前只有每日筆數的舊檔）也不顯示，避免整頁壞掉
  if (!kev.updatedAt || !Array.isArray(kev.products)) return null;
  const { products } = kev;
  // 改版前的統計檔沒有 everyday 欄位：全部視為其他產品（收起來），不會漏掉
  const everyday = products.filter((product) => product.everyday);
  const others = products.filter((product) => !product.everyday);

  return (
    <section aria-labelledby={headingId} className="mt-16">
      <h2 id={headingId}>最近正被攻擊的軟體</h2>
      <p className="mt-1 max-w-4xl text-text-secondary">
        近 {KEV_WINDOW_DAYS} 天，美國網路安全機構（CISA）確認已有攻擊者在利用漏洞的軟體。
      </p>
      <div className="mt-6 rounded-xl bg-surface-raised p-5 shadow-sm md:p-8">
        {products.length > 0 ? (
          <>
            <p className="max-w-3xl font-medium">
              如果你有使用以下任何軟體或設備，請盡快更新到最新版。
            </p>
            {everyday.length > 0 ? (
              <ProductList products={everyday} />
            ) : (
              <p className="mt-4 text-text-secondary">
                近 {KEV_WINDOW_DAYS} 天沒有常見的個人軟體被收錄，但下方仍可能有你用到的設備。
              </p>
            )}
            {others.length > 0 && (
              // 與網址分析的「分析報告（詳細）」同一套折疊樣式
              <details className="group mt-4">
                <summary
                  className={`${interactiveClass} inline-flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 font-medium text-text-secondary hover:text-text-primary focus-visible:outline-primary [&::-webkit-details-marker]:hidden`}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                  另外 {others.length} 項，多為公司或機構使用的產品
                </summary>
                <ProductList products={others} />
              </details>
            )}
          </>
        ) : (
          <p>近 {KEV_WINDOW_DAYS} 天沒有新增正被攻擊的軟體。</p>
        )}
        {isStale(kev.updatedAt, now) && (
          // 與新聞的過期提醒同樣式：主要文字色加帶藍淺底（紅黃灰只留給判定結果）
          <p className="mt-6 rounded-lg bg-surface-sunken px-3 py-2 text-sm">清單已超過 48 小時沒有更新，可能不是最新的。</p>
        )}
      </div>
      <p className="mt-4 text-sm text-text-secondary">
        資料每日統計一次，清單來自美國 CISA 已被利用漏洞清單（Known Exploited Vulnerabilities）。
      </p>
    </section>
  );
}
