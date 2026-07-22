import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IyzicoService } from '@modules/payments/iyzico.service';
import { PaytrService } from '@modules/payments/paytr.service';
import {
  InitializePaymentDto,
  RetryPaymentDto,
} from '@modules/payments/dto/payments.dto';
import { User } from '@entities/user.entity';

export type PaymentProviderName = 'paytr' | 'iyzico';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly config: ConfigService,
    private readonly paytr: PaytrService,
    private readonly iyzico: IyzicoService,
  ) {}

  activeProvider(): PaymentProviderName {
    const configured = (
      this.config.get<string>('payment.provider') || ''
    ).toLowerCase();
    if (configured === 'iyzico') return 'iyzico';
    if (configured === 'paytr') return 'paytr';
    // Otomatik: PayTR bilgileri varsa PayTR, yoksa iyzico
    if (this.paytr.isConfigured()) return 'paytr';
    return 'iyzico';
  }

  initializeCheckout(dto: InitializePaymentDto, userIp?: string) {
    if (this.activeProvider() === 'paytr') {
      return this.paytr.initializeCheckout(dto, userIp);
    }
    return this.iyzico.initializeCheckout(dto);
  }

  retryCheckout(dto: RetryPaymentDto, user?: User | null, userIp?: string) {
    if (this.activeProvider() === 'paytr') {
      return this.paytr.retryCheckout(dto, user, userIp);
    }
    return this.iyzico.retryCheckout(dto, user);
  }
}
