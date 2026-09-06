import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';

type LinkTarget = string | { pathname?: string };

type NextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    children?: ReactNode;
    href: LinkTarget;
};

const NextLinkMock = forwardRef<HTMLAnchorElement, NextLinkProps>(function NextLinkMock({ href, ...props }, ref) {
    const destination = typeof href === 'string' ? href : (href.pathname ?? '#');
    return <a ref={ref} href={destination} {...props} />;
});

export default NextLinkMock;
