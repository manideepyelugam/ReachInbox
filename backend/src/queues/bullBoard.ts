import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './emailQueue';
import { config } from '../config/env';

export function setupBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(config.BULL_BOARD_PATH);

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue as any) as any],
    serverAdapter,
  });

  return serverAdapter;
}
