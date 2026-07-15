import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_ABANDONED_CART } from '@modules/queues/queue.constants';
import { AbandonedCartService } from '@modules/cart/abandoned-cart.service';

@Processor(QUEUE_ABANDONED_CART)
export class AbandonedCartProcessor extends WorkerHost {
  private readonly logger = new Logger(AbandonedCartProcessor.name);

  constructor(private readonly abandoned: AbandonedCartService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Abandoned cart job ${job.id}`);
    await this.abandoned.processDueCarts();
  }
}
