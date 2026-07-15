import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_LOW_STOCK } from '@modules/queues/queue.constants';
import { LowStockService } from '@modules/catalog/low-stock.service';

@Processor(QUEUE_LOW_STOCK)
export class LowStockProcessor extends WorkerHost {
  private readonly logger = new Logger(LowStockProcessor.name);

  constructor(private readonly lowStock: LowStockService) {
    super();
  }

  async process(job: Job<{ reason?: string }>) {
    this.logger.log(`Low-stock scan (${job.data?.reason || 'manual'})`);
    await this.lowStock.scanAndAlertAll();
  }
}
