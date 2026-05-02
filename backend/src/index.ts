import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { demoRouter } from './routes/demo.js';
import { agentRouter } from './routes/agent.js';
import { onboardingRouter } from './routes/onboarding.js';
import { memoryRouter } from './routes/memory.js';
import { authRouter } from './routes/auth.js';

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'] }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRouter);
app.use('/api/demo', demoRouter);
app.use('/api/agent', agentRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/auth', authRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown server error';
  res.status(500).json({ ok: false, error: message });
});

app.listen(config.PORT, () => {
  console.log(`CalmVest API listening on http://localhost:${config.PORT}`);
});
