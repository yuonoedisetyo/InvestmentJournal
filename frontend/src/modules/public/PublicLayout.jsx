import PublicFooter from './components/PublicFooter';
import PublicNav from './components/PublicNav';

export default function PublicLayout({ sessionUser, children }) {
  return (
    <div className="app-shell public-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <main className="public-main">
        <PublicNav sessionUser={sessionUser} />
        {children}
        <PublicFooter />
      </main>
    </div>
  );
}
