import { redirect } from 'next/navigation';

export default function RedirectToAuth() {
  redirect('/login');
}
