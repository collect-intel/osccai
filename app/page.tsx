import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default function HomePage() {
  const { userId } = auth();

  console.log('userId', userId);

  if (userId) {
    redirect('/community-models');
    return;
  }

  return (
    <main>
      {/* Landing page content for unauthenticated users */}
      <h1>Welcome to OSCCAI</h1>
      <p>Create and manage your Community AI Models.</p>
    </main>
  );
}
