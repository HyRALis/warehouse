'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@inventory-system/ui';
import { useLogout } from '../queries';

export const SignOutButton = ({ className }: { className?: string }) => {
    const logout = useLogout();

    return (
        <Button
            type="button"
            variant="outline"
            className={className}
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
        >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
    );
};
