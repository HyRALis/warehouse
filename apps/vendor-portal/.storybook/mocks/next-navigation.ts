import { fn } from 'storybook/test';

const router = { push: fn(), replace: fn(), refresh: fn(), back: fn(), prefetch: fn() };
export const useRouter = () => router;
export const usePathname = () => '/dashboard/products';
export const useSearchParams = () => new URLSearchParams();
