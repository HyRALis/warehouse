import { Package2 } from 'lucide-react';

export default function AuthShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <main id="main-content" tabIndex={-1} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
            <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
            <div className="relative z-10 w-full max-w-md">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30">
                        <Package2 className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-xl font-bold text-white">OmniStock</p>
                    <p className="mt-1 text-sm text-slate-400">Vendor Portal</p>
                </div>
                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
                    <h1 className="text-xl font-semibold text-white">{title}</h1>
                    <p className="mb-6 mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
                    {children}
                </section>
            </div>
        </main>
    );
}
