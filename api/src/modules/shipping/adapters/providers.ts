import { Injectable } from '@nestjs/common';
import {
  ShippingProviderCode,
  ShipmentStatus,
} from '@entities/shipment.entity';
import {
  CreateShipmentInput,
  CreateShipmentResult,
  IShippingAdapter,
  TrackShipmentResult,
  hasCredentials,
  mockTrackingNumber,
} from '@modules/shipping/adapters/shipping.adapter';
import { BadRequestException } from '@nestjs/common';

export abstract class BaseMockShippingAdapter implements IShippingAdapter {
  abstract readonly code: ShippingProviderCode;
  abstract readonly prefix: string;
  abstract readonly trackingBaseUrl: string;

  async createShipment(
    input: CreateShipmentInput,
  ): Promise<CreateShipmentResult> {
    const mock = !hasCredentials(input.credentials);
    if (mock && input.allowMock === false) {
      throw new BadRequestException(
        `${this.code}: kargo API kimlik bilgileri eksik. Prod’da mock kapalı — credentials girin veya SHIPPING_ALLOW_MOCK=true yapın.`,
      );
    }
    const trackingNumber = mockTrackingNumber(this.prefix);
    return {
      trackingNumber,
      trackingUrl: `${this.trackingBaseUrl}${trackingNumber}`,
      labelUrl: null,
      status: ShipmentStatus.LABEL_CREATED,
      rawResponse: {
        mock,
        provider: this.code,
        orderNumber: input.orderNumber,
        recipient: input.recipientName,
      },
      mock,
    };
  }

  async trackShipment(
    trackingNumber: string,
    credentials: Record<string, string>,
  ): Promise<TrackShipmentResult> {
    const mock = !hasCredentials(credentials);
    return {
      trackingNumber,
      status: ShipmentStatus.IN_TRANSIT,
      events: [
        {
          date: new Date().toISOString(),
          description: mock
            ? `${this.code} mock: kargo yolda`
            : `${this.code}: takip bilgisi`,
        },
      ],
      rawResponse: { mock, provider: this.code },
      mock,
    };
  }
}

@Injectable()
export class YurticiAdapter extends BaseMockShippingAdapter {
  readonly code = ShippingProviderCode.YURTICI;
  readonly prefix = 'YI';
  readonly trackingBaseUrl =
    'https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=';
}

@Injectable()
export class KolayGelsinAdapter extends BaseMockShippingAdapter {
  readonly code = ShippingProviderCode.KOLAY_GELSIN;
  readonly prefix = 'KG';
  readonly trackingBaseUrl = 'https://kolaygelsin.com/takip?code=';
}

@Injectable()
export class DhlAdapter extends BaseMockShippingAdapter {
  readonly code = ShippingProviderCode.DHL;
  readonly prefix = 'DHL';
  readonly trackingBaseUrl =
    'https://www.dhl.com/tr-tr/home/tracking.html?tracking-id=';
}

@Injectable()
export class SuratAdapter extends BaseMockShippingAdapter {
  readonly code = ShippingProviderCode.SURAT;
  readonly prefix = 'SR';
  readonly trackingBaseUrl =
    'https://www.suratkargo.com.tr/KargoTakip/?q=';
}

@Injectable()
export class PttAdapter extends BaseMockShippingAdapter {
  readonly code = ShippingProviderCode.PTT;
  readonly prefix = 'PTT';
  readonly trackingBaseUrl =
    'https://gonderitakip.ptt.gov.tr/Track/Verify?q=';
}

@Injectable()
export class HepsijetAdapter extends BaseMockShippingAdapter {
  readonly code = ShippingProviderCode.HEPSIJET;
  readonly prefix = 'HJ';
  readonly trackingBaseUrl =
    'https://www.hepsijet.com/gonderi-takip?code=';
}

@Injectable()
export class TrendyolExpressAdapter extends BaseMockShippingAdapter {
  readonly code = ShippingProviderCode.TRENDYOL_EXPRESS;
  readonly prefix = 'TEX';
  readonly trackingBaseUrl =
    'https://www.trendyol.com/kargo-takip?code=';
}
