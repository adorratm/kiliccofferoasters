import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_MARKETPLACE_SYNC } from '@modules/queues/queue.constants';
import { MarketplaceSyncService } from '@modules/marketplace/marketplace-sync.service';

@Processor(QUEUE_MARKETPLACE_SYNC)
export class MarketplaceSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketplaceSyncProcessor.name);

  constructor(private readonly sync: MarketplaceSyncService) {
    super();
  }

  async process(job: Job<{ reason?: string; mode?: 'stock' | 'orders' | 'all' }>) {
    this.logger.debug(
      `Marketplace sync job ${job.id} reason=${job.data?.reason || 'schedule'}`,
    );
    return this.sync.syncAllEnabled({
      mode: job.data?.mode || 'all',
      dryRun: false,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Marketplace sync failed ${job?.id}: ${error.message}`);
  }
}
