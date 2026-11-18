import { Link } from 'react-router';
import PageShell from '../components/PageShell';

export default function NotFoundPage() {
  return (
    <PageShell title="找不到這個頁面">
      <p>
        這個網址沒有對應的頁面。
        <Link to="/" className="text-primary underline underline-offset-4 hover:text-primary-hover">
          回到首頁
        </Link>
      </p>
    </PageShell>
  );
}
