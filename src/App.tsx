import { Route, Routes } from 'react-router';
import NavBar from './components/NavBar';
import AboutPage from './pages/AboutPage';
import AnalyzePage from './pages/AnalyzePage';
import HomePage from './pages/HomePage';
import IntelPage from './pages/IntelPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <>
      <NavBar />
      <main>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="analyze" element={<AnalyzePage />} />
          <Route path="intel" element={<IntelPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}
