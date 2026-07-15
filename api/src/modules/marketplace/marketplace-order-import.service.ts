import { Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  MarketplaceAccount,
  MarketplacePlatform,
} from '@entities/marketplace-account.entity';
import { MarketplaceListing } from '@entities/marketplace-listing.entity';
import { MarketplaceOrder } from '@entities/marketplace-order.entity';
import { Order, OrderStatus } from '@entities/order.entity';
import { OrderItem } from '@entities/order-item.entity';
import { Payment, PaymentStatus } from '@entities/payment.entity';
import { InventoryService } from '@modules/catalog/inventory.service';

type ParsedLine = {
  barcode?: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type ParsedMarketplaceOrder = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Record<string, string>;
  lines: ParsedLine[];
  shippingFee: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes: string;
};

@Injectable()
export class MarketplaceOrderImportService {
  private readonly logger = new Logger(MarketplaceOrderImportService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly inventory: InventoryService,
  ) {}

  /**
   * MarketplaceOrder henüz iç siparişe bağlı değilse Order + Payment + Items oluşturur.
   * Zaten bağlıysa yalnızca status senkronlar.
   */
  async importIfNeeded(
    marketplaceOrderId: string,
  ): Promise<{ imported: boolean; orderId: string | null; reason?: string }> {
    const mOrder = await this.em.findOne(MarketplaceOrder, {
      where: { id: marketplaceOrderId },
      relations: { account: true, internalOrder: true },
    });
    if (!mOrder) {
      return { imported: false, orderId: null, reason: 'not_found' };
    }

    if (mOrder.internalOrderId && mOrder.internalOrder) {
      await this.syncStatus(mOrder);
      return {
        imported: false,
        orderId: mOrder.internalOrderId,
        reason: 'already_linked',
      };
    }

    const platform = mOrder.account.platform;
    const parsed = this.parsePayload(platform, mOrder.payload, mOrder);
    if (!parsed.lines.length && parsed.total <= 0) {
      // minimal order with placeholder line
      parsed.lines = [
        {
          name: `Pazaryeri sipariş ${mOrder.externalOrderId}`,
          quantity: 1,
          unitPrice: 0,
          lineTotal: 0,
        },
      ];
    }

    const status = mapExternalStatus(mOrder.externalStatus);
    const orderNumber = await this.generateOrderNumber(platform);

    const order = await this.em.transaction(async (tx) => {
      const subtotal = parsed.lines.reduce((s, l) => s + l.lineTotal, 0);
      const total =
        parsed.total > 0
          ? parsed.total
          : Math.max(0, subtotal + parsed.shippingFee - parsed.discountAmount);

      const order = tx.create(Order, {
        orderNumber,
        userId: null,
        status,
        customerEmail: parsed.customerEmail,
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        shippingAddress: parsed.shippingAddress,
        billingAddress: parsed.shippingAddress,
        subtotal: subtotal.toFixed(2),
        shippingFee: parsed.shippingFee.toFixed(2),
        discountAmount: parsed.discountAmount.toFixed(2),
        couponCode: null,
        taxAmount: '0.00',
        total: total.toFixed(2),
        currency: parsed.currency || 'TRY',
        shippingProvider: platform,
        legalAcceptances: { marketplaceImport: true, platform },
        notes: parsed.notes,
        sourceCartId: null,
      });
      await tx.save(order);

      const listings = await tx.find(MarketplaceListing, {
        where: { accountId: mOrder.accountId, isActive: true },
        relations: { product: true, variant: true },
      });

      for (const line of parsed.lines) {
        const match = this.matchListing(listings, line);
        await tx.save(
          tx.create(OrderItem, {
            orderId: order.id,
            productId: match?.productId ?? null,
            variantId: match?.variantId ?? null,
            productName: line.name || match?.product?.name || 'Ürün',
            variantLabel: match?.variant?.weightLabel ?? null,
            grindOption: null,
            grindLabel: null,
            quantity: line.quantity,
            unitPrice: line.unitPrice.toFixed(2),
            lineTotal: line.lineTotal.toFixed(2),
          }),
        );
      }

      await tx.save(
        tx.create(Payment, {
          orderId: order.id,
          provider: platform,
          status:
            status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED
              ? PaymentStatus.FAILED
              : PaymentStatus.SUCCESS,
          amount: total.toFixed(2),
          currency: parsed.currency || 'TRY',
          conversationId: mOrder.externalOrderId,
          paymentId: mOrder.externalOrderId,
          rawResponse: {
            marketplace: true,
            platform,
            externalOrderId: mOrder.externalOrderId,
          },
        }),
      );

      mOrder.internalOrderId = order.id;
      await tx.save(mOrder);
      return order;
    });

    // Stok: ödenmiş/işlenen siparişlerde düş
    if (
      status !== OrderStatus.CANCELLED &&
      status !== OrderStatus.REFUNDED &&
      status !== OrderStatus.PENDING_PAYMENT
    ) {
      try {
        await this.inventory.decrementForPaidOrder(order.id);
      } catch (err) {
        this.logger.warn(
          `Marketplace stock decrement failed for ${order.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    this.logger.log(
      `Imported marketplace order ${mOrder.externalOrderId} → ${order.orderNumber}`,
    );
    return { imported: true, orderId: order.id };
  }

  private async syncStatus(mOrder: MarketplaceOrder): Promise<void> {
    if (!mOrder.internalOrder) return;
    const next = mapExternalStatus(mOrder.externalStatus);
    if (mOrder.internalOrder.status === next) return;
    // İptal → refunded geçişlerinde stok iadesi şimdilik yok
    mOrder.internalOrder.status = next;
    await this.em.save(mOrder.internalOrder);
  }

  private parsePayload(
    platform: MarketplacePlatform,
    payload: Record<string, unknown>,
    mOrder: MarketplaceOrder,
  ): ParsedMarketplaceOrder {
    switch (platform) {
      case MarketplacePlatform.TRENDYOL:
        return parseTrendyol(payload, mOrder);
      case MarketplacePlatform.HEPSIBURADA:
        return parseHepsiburada(payload, mOrder);
      case MarketplacePlatform.N11:
        return parseN11(payload, mOrder);
      default:
        return parseGeneric(payload, mOrder);
    }
  }

  private matchListing(
    listings: MarketplaceListing[],
    line: ParsedLine,
  ): MarketplaceListing | undefined {
    const keys = [line.barcode, line.sku]
      .filter(Boolean)
      .map((k) => k!.toLowerCase());
    if (!keys.length) return undefined;
    return listings.find((l) => {
      const candidates = [
        l.externalListingId,
        l.externalSku,
        l.variant?.sku,
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      return candidates.some((c) => keys.includes(c));
    });
  }

  private async generateOrderNumber(
    platform: MarketplacePlatform,
  ): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const tag =
      platform === MarketplacePlatform.TRENDYOL
        ? 'TY'
        : platform === MarketplacePlatform.HEPSIBURADA
          ? 'HB'
          : 'N11';
    const prefix = `KLC-${tag}-${y}${m}${d}-`;

    const latest = await this.em
      .createQueryBuilder(Order, 'o')
      .where('o.order_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('o.order_number', 'DESC')
      .getOne();

    let seq = 1;
    if (latest?.orderNumber) {
      const part = latest.orderNumber.split('-').pop();
      const n = parseInt(part || '0', 10);
      if (!Number.isNaN(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }
}

export function mapExternalStatus(external: string | null | undefined): OrderStatus {
  const s = (external || '').toLowerCase();
  if (!s) return OrderStatus.PAID;
  if (
    s.includes('cancel') ||
    s.includes('unsupplied') ||
    s.includes('un_supplied') ||
    s === 'unpacked'
  ) {
    return OrderStatus.CANCELLED;
  }
  if (s.includes('refund')) return OrderStatus.REFUNDED;
  if (s.includes('deliver')) return OrderStatus.DELIVERED;
  if (s.includes('ship') || s.includes('cargo') || s.includes('intransit')) {
    return OrderStatus.SHIPPED;
  }
  if (
    s.includes('creat') ||
    s.includes('pick') ||
    s.includes('invoice') ||
    s.includes('await') ||
    s.includes('open') ||
    s.includes('new') ||
    s.includes('approved') ||
    s.includes('packag')
  ) {
    return OrderStatus.PROCESSING;
  }
  return OrderStatus.PAID;
}

function parseTrendyol(
  payload: Record<string, unknown>,
  mOrder: MarketplaceOrder,
): ParsedMarketplaceOrder {
  const addr = (payload.shipmentAddress ||
    payload.shippingAddress ||
    {}) as Record<string, unknown>;
  const linesRaw = (payload.lines || payload.orderLines || []) as Array<
    Record<string, unknown>
  >;
  const lines: ParsedLine[] = linesRaw.map((l) => {
    const qty = num(l.quantity, 1);
    const unit = num(l.price ?? l.amount ?? l.lineUnitPrice, 0);
    const total = num(l.lineTotalPrice ?? l.amount, unit * qty);
    return {
      barcode: str(l.barcode),
      sku: str(l.merchantSku || l.stockCode || l.sku),
      name: str(l.productName || l.name) || 'Ürün',
      quantity: qty,
      unitPrice: unit,
      lineTotal: total,
    };
  });

  const customerName =
    str(addr.fullName || payload.customerFirstName) ||
    [str(payload.customerFirstName), str(payload.customerLastName)]
      .filter(Boolean)
      .join(' ') ||
    'Trendyol Müşteri';

  return {
    customerName,
    customerEmail:
      str(addr.email || payload.customerEmail) ||
      `trendyol+${mOrder.externalOrderId}@marketplace.local`,
    customerPhone: str(addr.phone || addr.gsmNumber || payload.gsm) || '0000000000',
    shippingAddress: {
      fullName: customerName,
      phone: str(addr.phone || addr.gsmNumber) || '0000000000',
      addressLine: str(
        addr.address1 || addr.fullAddress || addr.address || payload.address,
      ),
      district: str(addr.district || addr.districtName),
      city: str(addr.city || addr.cityName),
      postalCode: str(addr.postalCode),
      country: 'TR',
    },
    lines,
    shippingFee: num(payload.cargoProviderPrice ?? payload.cargoPrice, 0),
    discountAmount: num(payload.totalDiscount, 0),
    total: num(
      payload.packageTotalPrice ?? payload.totalPrice ?? payload.grossAmount,
      0,
    ),
    currency: 'TRY',
    notes: `Trendyol #${mOrder.externalOrderId}`,
  };
}

function parseHepsiburada(
  payload: Record<string, unknown>,
  mOrder: MarketplaceOrder,
): ParsedMarketplaceOrder {
  const items = (payload.items ||
    payload.orderItems ||
    payload.Items ||
    []) as Array<Record<string, unknown>>;
  const lines: ParsedLine[] = items.map((l) => {
    const qty = num(l.quantity ?? l.Quantity, 1);
    const unit = num(l.price ?? l.Price ?? l.unitPrice, 0);
    return {
      sku: str(l.merchantSku || l.MerchantSku || l.sku || l.hbSku),
      barcode: str(l.barcode || l.Barcode),
      name: str(l.productName || l.ProductName || l.name) || 'Ürün',
      quantity: qty,
      unitPrice: unit,
      lineTotal: unit * qty,
    };
  });

  const customer = (payload.customer ||
    payload.deliveryAddress ||
    payload.shippingAddress ||
    {}) as Record<string, unknown>;
  const name =
    str(customer.name || customer.fullName || payload.customerName) ||
    'Hepsiburada Müşteri';

  return {
    customerName: name,
    customerEmail:
      str(customer.email || payload.customerEmail) ||
      `hb+${mOrder.externalOrderId}@marketplace.local`,
    customerPhone: str(customer.phone || customer.Phone) || '0000000000',
    shippingAddress: {
      fullName: name,
      phone: str(customer.phone) || '0000000000',
      addressLine: str(
        customer.address || customer.Address || customer.addressLine,
      ),
      district: str(customer.district || customer.town),
      city: str(customer.city),
      postalCode: str(customer.postalCode),
      country: 'TR',
    },
    lines,
    shippingFee: num(payload.shippingTotal || payload.cargoAmount, 0),
    discountAmount: num(payload.discountTotal || payload.totalDiscount, 0),
    total: num(payload.totalPrice || payload.totalAmount || payload.amount, 0),
    currency: 'TRY',
    notes: `Hepsiburada #${mOrder.externalOrderId}`,
  };
}

function parseN11(
  payload: Record<string, unknown>,
  mOrder: MarketplaceOrder,
): ParsedMarketplaceOrder {
  const linesRaw = (payload.lines ||
    payload.itemList ||
    []) as Array<Record<string, unknown>>;
  const fixedLines: ParsedLine[] = linesRaw.map((l) => {
    const qty = num(l.quantity, 1);
    const lineTotal = num(l.sellerInvoiceAmount ?? l.price, 0);
    const unit = qty > 0 ? lineTotal / qty : lineTotal;
    return {
      barcode: str(l.barcode),
      sku: str(l.stockCode || l.sellerStockCode || l.productSellerCode),
      name: str(l.productName || l.title) || 'Ürün',
      quantity: qty,
      unitPrice: unit,
      lineTotal,
    };
  });

  const shipping = (payload.shippingAddress ||
    payload.billingAddress ||
    {}) as Record<string, unknown>;
  const name =
    str(payload.customerFullName || shipping.fullName) || 'N11 Müşteri';

  return {
    customerName: name,
    customerEmail:
      str(payload.customerEmail || shipping.email) ||
      `n11+${mOrder.externalOrderId}@marketplace.local`,
    customerPhone: str(payload.customerPhone || shipping.gsm) || '0000000000',
    shippingAddress: {
      fullName: name,
      phone: str(payload.customerPhone || shipping.gsm) || '0000000000',
      addressLine: str(shipping.address || shipping.fullAddress),
      district: str(shipping.district),
      city: str(shipping.city),
      postalCode: str(shipping.postalCode),
      country: 'TR',
    },
    lines: fixedLines,
    shippingFee: num(payload.shippingTotalCost || payload.cargoFee, 0),
    discountAmount: num(payload.totalSellerDiscountPrice, 0),
    total: num(
      payload.totalAmount ||
        (payload.billingTemplate as Record<string, unknown> | undefined)
          ?.grandTotal,
      0,
    ),
    currency: 'TRY',
    notes: `N11 #${mOrder.externalOrderId}`,
  };
}

function parseGeneric(
  payload: Record<string, unknown>,
  mOrder: MarketplaceOrder,
): ParsedMarketplaceOrder {
  return {
    customerName: str(payload.customerName) || 'Pazaryeri Müşteri',
    customerEmail:
      str(payload.customerEmail) ||
      `mp+${mOrder.externalOrderId}@marketplace.local`,
    customerPhone: str(payload.customerPhone) || '0000000000',
    shippingAddress: {
      fullName: str(payload.customerName) || 'Pazaryeri Müşteri',
      phone: '0000000000',
      addressLine: str(payload.address) || '—',
      district: '',
      city: str(payload.city) || '—',
      postalCode: '',
      country: 'TR',
    },
    lines: [],
    shippingFee: 0,
    discountAmount: 0,
    total: num(payload.total, 0),
    currency: 'TRY',
    notes: `Marketplace #${mOrder.externalOrderId}`,
  };
}

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}
