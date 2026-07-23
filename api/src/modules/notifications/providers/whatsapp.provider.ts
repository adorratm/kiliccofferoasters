import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizePhoneE164 } from '@common/utils/phone';

export type SendWhatsAppInput = {
  to: string;
  body: string;
};

export interface IWhatsAppProvider {
  send(input: SendWhatsAppInput): Promise<{ id?: string }>;
}

@Injectable()
export class ConsoleWhatsAppProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(ConsoleWhatsAppProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(input: SendWhatsAppInput): Promise<{ id?: string }> {
    const from =
      this.config.get<string>('whatsapp.from') || '+905412147963';
    const to = normalizePhoneE164(input.to) || input.to;
    this.logger.log(
      `[console-whatsapp] from=${from} to=${to} body=${input.body}`,
    );
    return { id: `console-wa-${Date.now()}` };
  }
}

/**
 * Meta WhatsApp Cloud API — otomatik sipariş bildirimleri için.
 * Not: Aynı numara hem WhatsApp Business uygulamasında hem Cloud API’de
 * aynı anda kullanılamaz. Müşteri sohbeti uygulama ile yapılıyorsa
 * otomatik gönderim kapalı (console) kalabilir.
 */
@Injectable()
export class MetaWhatsAppProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsAppProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(input: SendWhatsAppInput): Promise<{ id?: string }> {
    const token = this.config.get<string>('whatsapp.metaToken');
    const phoneNumberId = this.config.get<string>(
      'whatsapp.metaPhoneNumberId',
    );
    if (!token || !phoneNumberId) {
      throw new Error(
        'Meta WhatsApp credentials eksik (META_WA_TOKEN / META_WA_PHONE_NUMBER_ID)',
      );
    }

    const e164 = normalizePhoneE164(input.to);
    if (!e164) {
      throw new Error(`Geçersiz WhatsApp numarası: ${input.to}`);
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: e164.replace(/\D/g, ''),
          type: 'text',
          text: { body: input.body, preview_url: false },
        }),
      },
    );

    const data = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message: string };
    };

    if (!res.ok || data.error) {
      throw new Error(
        `Meta WhatsApp hata: ${data.error?.message || res.status}`,
      );
    }

    const id = data.messages?.[0]?.id;
    this.logger.log(`Meta WhatsApp sent: ${id}`);
    return { id };
  }
}

@Injectable()
export class WhatsAppProviderRouter implements IWhatsAppProvider {
  private readonly logger = new Logger(WhatsAppProviderRouter.name);
  private readonly provider: IWhatsAppProvider;

  constructor(
    config: ConfigService,
    consoleWa: ConsoleWhatsAppProvider,
    metaWa: MetaWhatsAppProvider,
  ) {
    const name = (
      config.get<string>('whatsapp.provider') || 'console'
    ).toLowerCase();
    this.provider = name === 'meta' ? metaWa : consoleWa;
    const from = config.get<string>('whatsapp.from') || '+905412147963';
    this.logger.log(`WhatsApp provider: ${name === 'meta' ? 'meta' : 'console'} (from=${from})`);
  }

  send(input: SendWhatsAppInput) {
    return this.provider.send(input);
  }
}
