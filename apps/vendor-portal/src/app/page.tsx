import { redirect } from 'next/navigation';
import { getCurrentVendor } from '@/features/auth/server';

export default async function LandingPage() {
    const vendor = await getCurrentVendor();
    redirect(vendor ? '/dashboard' : '/login');
}
