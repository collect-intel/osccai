import UserDebug from './UserDebug';

export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-6xl mt-10 mx-auto">
      {children}
    </div>
  );
}