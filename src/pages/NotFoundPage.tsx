import { Link } from 'react-router';
import PageShell from '../components/PageShell';
import { textLinkClass } from '../styles';

export default function NotFoundPage() {
  return (
    <PageShell title="找不到這個頁面">
      <p>
        這個網址沒有對應的頁面。
        <Link to="/" className={textLinkClass}>
          回到首頁
        </Link>
      </p>
    </PageShell>
  );
}
