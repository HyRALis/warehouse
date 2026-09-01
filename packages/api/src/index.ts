import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prisma, { disconnectDatabase } from '@inventory-system/database';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import templateRoutes from './routes/template.routes';
import vendorRoutes from './routes/vendor.routes';
import searchRoutes from './routes/search.routes';
import { errorHandler } from './middleware/error-handler';
import { generalLimiter } from './middleware/rate-limit';
import { requestContext } from './middleware/request-context';
import { config } from './config';

const app: Express = express();

if (config.trustProxy) app.set('trust proxy', 1);

app.use(requestContext);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
    cors({
        credentials: true,
        origin: (origin, callback) => {
            if (!origin || config.corsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            const error = Object.assign(new Error('Origin is not allowed'), {
                statusCode: 403,
                code: 'CORS_ORIGIN_DENIED',
            });
            callback(error);
        },
        exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
    })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/ready', async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ready' });
    } catch {
        res.status(503).json({ status: 'not_ready' });
    }
});

if (config.storageDriver === 'local') {
    app.use('/uploads', express.static(config.uploadDir, { index: false, maxAge: '1d' }));
}
app.use(generalLimiter);

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/search', searchRoutes);

// Error handler
app.use(errorHandler);

if (config.nodeEnv !== 'test') {
    const server = app.listen(config.port, () => {
        console.log(`Server is running on port ${config.port}`);
    });

    let shuttingDown = false;
    const shutdown = (signal: NodeJS.Signals) => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log(`${signal} received; closing the API and database pool`);

        server.close((serverError) => {
            void disconnectDatabase()
                .then(() => {
                    process.exitCode = serverError ? 1 : 0;
                })
                .catch((databaseError) => {
                    console.error('Failed to close the database pool', databaseError);
                    process.exitCode = 1;
                });
        });
    };

    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
}

export { app };
