import { OrganizationSwitcher } from './OrganizationSwitcher';
import { SignOutButton } from './SignOutButton';

/**
 * A member can be entitled in one organization and not another, so the switcher stays reachable
 * here rather than forcing a sign-out to change tenant.
 */
export const PortalUnavailable = ({ reason }: { reason: string }) => (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-500/20 bg-slate-900 p-8 text-center shadow-xl">
            <h1 className="text-xl font-semibold text-white">Vendor Portal unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">{reason}</p>
            <div className="mt-5 flex justify-center">
                <OrganizationSwitcher />
            </div>
            <SignOutButton className="mt-6" />
        </div>
    </main>
);
