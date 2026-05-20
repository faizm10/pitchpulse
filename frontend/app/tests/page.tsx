import { redirect } from 'next/navigation';

// /tests has moved to /admin
export default function TestsRedirect() {
  redirect('/admin');
}
