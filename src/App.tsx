import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import NavBar from './components/NavBar';
import AboutPage from './pages/AboutPage';
import AnalyzePage from './pages/AnalyzePage';
import HomePage from './pages/HomePage';
import IntelPage from './pages/IntelPage';
import NotFoundPage from './pages/NotFoundPage';
import { pages, type PagePath } from './routes';

/** 每個頁面路徑對應的元件；新增頁面時型別會要求兩邊同步 */
const pageElements: Record<PagePath, ReactNode> = {
  '/': <HomePage />,
  '/analyze': <AnalyzePage />,
  '/intel': <IntelPage />,
  '/about': <AboutPage />,
};

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar />
      <main className="flex flex-1 flex-col">
        <Routes>
          {pages.map(({ path }) => (
            <Route key={path} path={path} element={pageElements[path]} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
