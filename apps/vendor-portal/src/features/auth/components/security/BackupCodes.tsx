export const BackupCodes = ({ codes }: { codes: string[] }) => {
    if (!codes.length) return null;

    return (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="font-medium text-amber-200">Recovery codes — shown only now</p>
            <p className="mt-1 text-xs text-amber-200/70">
                Store these somewhere safe. Each code works once.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-amber-100">
                {codes.map((code) => (
                    <code key={code}>{code}</code>
                ))}
            </div>
        </div>
    );
};
