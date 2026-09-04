import { redirect } from 'next/navigation';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { getCurrentVendor } from '@/features/auth/server';

export default async function RegisterPage() {
    if (await getCurrentVendor()) redirect('/dashboard');
    return <RegisterForm />;
}
