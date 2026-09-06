/**
 * The auth feature's public surface. Server-only helpers stay in `./server`, which route files
 * import directly so that `import 'server-only'` never reaches the client graph.
 */
export { authClient, unwrap } from './auth-client';
export { AuthShell } from './components/AuthShell';
export { ForgotPasswordForm } from './components/ForgotPasswordForm';
export { LoginForm } from './components/LoginForm';
export { OrganizationSwitcher } from './components/OrganizationSwitcher';
export { PortalUnavailable } from './components/PortalUnavailable';
export { RegisterForm } from './components/RegisterForm';
export { ResetPasswordForm } from './components/ResetPasswordForm';
export { SignOutButton } from './components/SignOutButton';
export { TwoFactorForm } from './components/TwoFactorForm';
export { VerifyEmailView } from './components/VerifyEmailView';
export { SecuritySettings } from './components/security/SecuritySettings';

export {
    useAuthIdentity,
    useCurrentVendor,
    useForgotPassword,
    useLogin,
    useLogout,
    useOrganizations,
    usePlatformContext,
    useRegister,
    useResetPassword,
    useSwitchOrganization,
} from './queries';

export {
    useConfirmTwoFactor,
    useDeviceSessions,
    useDisableTwoFactor,
    useEnableTwoFactor,
    useRegenerateBackupCodes,
    useRevokeDeviceSession,
    useSendVerificationEmail,
    useVerifyTwoFactor,
    type TwoFactorEnrollment,
} from './security-queries';

export {
    currentVendorQueryOptions,
    platformContextQueryKey,
    platformContextQueryOptions,
    sessionQueryKey,
} from './query-options';

export { portalAccessDenial } from './utils/portal-access';
export { DEFAULT_RETURN_TO, safeReturnTo } from './utils/return-to';
