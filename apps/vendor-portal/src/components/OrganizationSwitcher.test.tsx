import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrganizationSwitcher from './OrganizationSwitcher';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), switchOrganization: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: mocks.useAuth }));

describe('OrganizationSwitcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.switchOrganization.mockResolvedValue(undefined);
    });

    it('stays hidden for a person with only one organization', () => {
        mocks.useAuth.mockReturnValue({
            organizations: [{ id: 'org-1', name: 'One', slug: 'one' }],
            platform: { organization: { id: 'org-1' } },
            switchOrganization: mocks.switchOrganization,
        });
        const { container } = render(<OrganizationSwitcher />);
        expect(container).toBeEmptyDOMElement();
    });

    it('switches when multiple organization memberships are available', async () => {
        mocks.useAuth.mockReturnValue({
            organizations: [
                { id: 'org-1', name: 'One', slug: 'one' },
                { id: 'org-2', name: 'Two', slug: 'two' },
            ],
            platform: { organization: { id: 'org-1' } },
            switchOrganization: mocks.switchOrganization,
        });
        const user = userEvent.setup();
        render(<OrganizationSwitcher />);

        await user.selectOptions(
            screen.getByRole('combobox', { name: 'Active organization' }),
            'org-2'
        );

        expect(mocks.switchOrganization).toHaveBeenCalledWith('org-2');
    });
});
