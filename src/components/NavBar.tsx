import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { pages } from '../routes';

/** 導覽列互動元件共用的五種互動狀態（CLAUDE.md「元件風格」） */
const interactive =
  'rounded-lg shadow-xs transition duration-200 hover:bg-primary-hover active:scale-95 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `${interactive} block px-4 py-2 ${isActive ? 'bg-primary-hover font-bold' : ''}`;
}

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const links = pages.map(({ path, label }) => (
    <li key={path}>
      <NavLink to={path} end className={navLinkClass} onClick={closeMenu}>
        {label}
      </NavLink>
    </li>
  ));

  return (
    <header className="bg-primary text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className={`${interactive} px-2 py-1 text-xl font-bold`} onClick={closeMenu}>
          駭你好
        </Link>

        <nav aria-label="主要導覽" className="hidden md:block">
          <ul className="flex gap-2">{links}</ul>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className={`${interactive} p-2 md:hidden`}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? '關閉選單' : '開啟選單'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="手機選單" className="border-t border-white/20 md:hidden">
          <ul className="flex flex-col gap-1 px-4 py-3">{links}</ul>
        </nav>
      )}
    </header>
  );
}
