import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { allowedOrigins, config } from './config.js';
import { HttpError } from './http/errors.js';
import { requireAuth } from './middleware/auth.js';
import { agentRouter } from './routes/agent.js';
import { authRouter } from './routes/auth.js';
import { demoRouter } from './routes/demo.js';
import { healthRouter } from './routes/health.js';
import { memoryRouter } from './routes/memory.js';
import { onboardingRouter } from './routes/onboarding.js';
import { plansRouter } from './routes/plans.js';

const app = express();
const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):51\d{2}$/;

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const normalized = origin?.replace(/\/$/, '');
    if (!normalized || localDevOrigin.test(normalized) || allowedOrigins.includes(normalized)) {
      callback(null, true);
      return;
    }
    callback(new HttpError(403, `CORS origin not allowed: ${normalized}`, 'CORS_ORIGIN_DENIED'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/demo', demoRouter);
app.use('/api/agent', requireAuth, agentRouter);
app.use('/api/onboarding', requireAuth, onboardingRouter);
app.use('/api/memory', requireAuth, memoryRouter);
app.use('/api/plans', requireAuth, plansRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = error instanceof HttpError ? error.status : error instanceof ZodError ? 400 : 500;
  const message = error instanceof Error ? error.message : 'Unknown server error';
  const code = error instanceof HttpError ? error.code : error instanceof ZodError ? 'INVALID_REQUEST' : 'SERVER_ERROR';
  res.status(status).json({ ok: false, code, message });
});

app.listen(config.PORT, () => {
  console.log(`Northstar API listening on http://localhost:${config.PORT}`);
});
