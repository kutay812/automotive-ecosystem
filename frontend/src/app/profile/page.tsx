import { getUser, getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import ProfileDashboard from '@/components/ProfileDashboard';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';

async function getProfileDetails(token: string) {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/user/profile-details`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const token = await getSession();
  const profileData = token ? await getProfileDetails(token) : null;

  if (!profileData) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen pt-28 px-6 relative z-10 w-full max-w-7xl mx-auto pb-24">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[400px] bg-primary/8 blur-[180px] rounded-full pointer-events-none z-0" />
      <ProfileDashboard data={profileData} />
    </main>
  );
}
