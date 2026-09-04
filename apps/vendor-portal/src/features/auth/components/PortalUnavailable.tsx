import { SignOutButton } from './SignOutButton';

export const PortalUnavailable = ({ reason }: { reason: string }) => (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-slate-900 p-8 text-center shadow-xl">
            <h1 className="text-xl font-semibold text-white">Vendor Portal unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{reason}</p>
            <SignOutButton className="mt-6" />
        </div>
    </main>
);
