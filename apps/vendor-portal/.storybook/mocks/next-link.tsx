import type { AnchorHTMLAttributes, ReactNode } from 'react';

type LinkTarget = string | { pathname?: string };

type NextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    children?: ReactNode;
    href: LinkTarget;
};

export default function NextLinkMock({ href, ...props }: NextLinkProps) {
    const destination = typeof href === 'string' ? href : (href.pathname ?? '#');
    return <a href={destination} {...props} />;
}
