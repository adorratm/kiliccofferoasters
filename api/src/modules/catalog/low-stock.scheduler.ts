import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_LOW_STOCK } from '@modules/queues/queue.constants';

@Injectable()
export class LowStockScheduler implements OnModuleInit {
  private readonly logger = new Logger(LowStockScheduler.name);

  constructor(
    @InjectQueue(QUEUE_LOW_STOCK) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const hours = Math.max(
      1,
      Number(this.config.get<number>('lowStock.scanIntervalHours') ?? 24),
    );
    const every = hours * 60 * 60 * 1000;
    await this.queue.add(
      'scan-low-stock',
      { reason: 'repeat' },
      {
        repeat: { every },
        jobId: 'low-stock-repeat',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Scheduled low-stock scan every ${hours}h`);
  }
}
