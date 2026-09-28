import app from './app';
import { connectDB } from './config/db';
import { initElasticsearch } from './services/elasticsearchService';
import { initEmailWorker } from './queues/emailWorker';
import { config } from './config/env';

async function bootstrap() {
  try {
    // 1. Connect PostgreSQL Database
    await connectDB();

    // 2. Initialize Elasticsearch Index & Field Mappings
    await initElasticsearch();

    // 3. Start BullMQ Email Worker
    initEmailWorker();

    const PORT = config.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 ReachInbox Email Scheduler API Running on Port ${PORT}`);
      console.log(`📊 BullMQ Live Monitor: http://localhost:${PORT}${config.BULL_BOARD_PATH}`);
      console.log(`🔍 Elasticsearch Node: ${config.ELASTICSEARCH_NODE}`);
      console.log(`⚡ Concurrency: ${config.WORKER_CONCURRENCY} | Delay: ${config.MIN_EMAIL_DELAY_MS}ms`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Fatal bootstrap error:', error);
    process.exit(1);
  }
}

bootstrap();
