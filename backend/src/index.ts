import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { demoRouter } from './routes/demo.js';
import { agentRouter } from './routes/agent.js';
import { onboardingRouter } from './routes/onboarding.js';
import { memoryRouter } from './routes/memory.js';
import { authRouter } from './routes/auth.js';
import { plansRouter } from './routes/plans.js';

const app = express();

const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):51\d{2}$/;

app.use(cors({
  origin(origin, callback) {
    if (!origin || localDevOrigin.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRouter);
app.use('/api/demo', demoRouter);
app.use('/api/agent', agentRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/auth', authRouter);
app.use('/api/plans', plansRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Unknown server error';
  res.status(500).json({ ok: false, error: message });
});

app.listen(config.PORT, () => {
  console.log(`CalmVest API listening on http://localhost:${config.PORT}`);
});
