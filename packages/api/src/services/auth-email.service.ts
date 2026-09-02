import nodemailer from 'nodemailer';
import { config } from '../config';

export type AuthEmailKind = 'email-verification' | 'password-reset' | 'organization-invitation';

export interface AuthEmailMessage {
    kind: AuthEmailKind;
    to: string;
    url: string;
    organizationName?: string;
    invitedBy?: string;
}

const subjectFor = (message: AuthEmailMessage): string => {
    switch (message.kind) {
        case 'email-verification':
            return 'Verify your OmniStock email address';
        case 'password-reset':
            return 'Reset your OmniStock password';
        case 'organization-invitation':
            return `You were invited to ${message.organizationName ?? 'an OmniStock organization'}`;
    }
};

const textFor = (message: AuthEmailMessage): string => {
    switch (message.kind) {
        case 'email-verification':
            return `Verify your email address by opening this link: ${message.url}`;
        case 'password-reset':
            return `Reset your password by opening this link: ${message.url}`;
        case 'organization-invitation':
            return `${message.invitedBy ?? 'An organization owner'} invited you to ${
                message.organizationName ?? 'their OmniStock organization'
            }. Accept the invitation here: ${message.url}`;
    }
};

export const sendAuthEmail = async (message: AuthEmailMessage): Promise<void> => {
    if (config.authEmail.mode === 'log') {
        if (config.nodeEnv === 'development') {
            console.info(
                JSON.stringify({
                    level: 'info',
                    event: 'local_auth_email',
                    kind: message.kind,
                    to: message.to,
                    delivery: 'Configure SMTP or a local mail catcher to receive the link',
                })
            );
        } else if (config.nodeEnv === 'production') {
            console.warn(
                JSON.stringify({
                    level: 'warn',
                    event: 'auth_email_delivery_disabled',
                    kind: message.kind,
                    to: message.to,
                })
            );
        }
        return;
    }

    const transport = nodemailer.createTransport({
        host: config.authEmail.host,
        port: config.authEmail.port,
        secure: config.authEmail.secure,
        auth:
            config.authEmail.user && config.authEmail.password
                ? { user: config.authEmail.user, pass: config.authEmail.password }
                : undefined,
    });

    await transport.sendMail({
        from: config.authEmail.from,
        to: message.to,
        subject: subjectFor(message),
        text: textFor(message),
    });
};

export const queueAuthEmail = (message: AuthEmailMessage): void => {
    void sendAuthEmail(message).catch((error) => {
        console.error(
            JSON.stringify({
                level: 'error',
                event: 'auth_email_failed',
                kind: message.kind,
                message: error instanceof Error ? error.message : 'Unknown email error',
            })
        );
    });
};
