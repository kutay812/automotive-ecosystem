import { getUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getMyRentals } from '@/app/actions/rental';
import ProfileRentals from '@/components/ProfileRentals';

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const rentals = await getMyRentals(user.documentId || user.id);

  return (
    <main className="min-h-screen pt-24 px-6 relative z-10 w-full max-w-7xl mx-auto pb-24">
      <div className="mb-12 border-b border-white/10 pb-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-2">Profilim</h1>
        <p className="text-xl text-gray-400">Hoş geldiniz, {user.firstName} {user.lastName}</p>
        <p className="text-sm text-gray-500 mt-1">{user.email}</p>
      </div>

      <ProfileRentals rentals={rentals} />
    </main>
  );
}
