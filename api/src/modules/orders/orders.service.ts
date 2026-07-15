import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Order, OrderStatus } from '@entities/order.entity';
import { OrderItem } from '@entities/order-item.entity';
import { Cart } from '@entities/cart.entity';
import { CartItem } from '@entities/cart-item.entity';
import { Payment, PaymentStatus } from '@entities/payment.entity';
import { ShippingProviderConfig } from '@entities/shipping-provider-config.entity';
import { ShippingProviderCode } from '@entities/shipment.entity';
import {
  CreateOrderDto,
  GuestOrderLookupDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
} from '@modules/orders/dto/orders.dto';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { statusLabel } from '@modules/notifications/notification.templates';
import { CouponsService } from '@modules/coupons/coupons.service';
import { InventoryService } from '@modules/catalog/inventory.service';
import {
  GRIND_LABELS,
  isGrindOption,
} from '@common/constants/grind-options';
import {
  paginateResult,
  PaginatedResult,
} from '@common/utils/pagination';

@Injectable()
export class OrdersService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly coupons: CouponsService,
    private readonly inventory: InventoryService,
  ) {}

  async createFromCart(
    dto: CreateOrderDto,
    userId?: string | null,
    sessionId?: string | null,
  ): Promise<Order> {
    if (!userId && !sessionId) {
      throw new BadRequestException('Kullanıcı veya X-Session-Id gerekli');
    }

    let cart: Cart | null = null;
    if (userId) {
      cart = await this.em.findOne(Cart, {
        where: { userId },
        relations: { items: { product: true, variant: true } },
      });
    }
    if ((!cart || !cart.items?.length) && sessionId) {
      cart = await this.em.findOne(Cart, {
        where: { sessionId },
        relations: { items: { product: true, variant: true } },
      });
    }
    if (!cart?.items?.length) {
      throw new BadRequestException('Sepet boş');
    }

    await this.inventory.assertCartStock(cart.items);

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );

    let discountAmount = 0;
    let couponCode: string | null = null;
    if (dto.couponCode?.trim()) {
      const preview = await this.coupons.validate(
        {
          code: dto.couponCode.trim(),
          subtotal,
          email: dto.customerEmail,
        },
        userId,
      );
      if (!preview.valid) {
        throw new BadRequestException(preview.message || 'Geçersiz kupon');
      }
      discountAmount = Number(preview.discountAmount);
      couponCode = preview.code;
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const shippingFee = await this.resolveShippingFee(
      dto.shippingProvider,
      afterDiscount,
    );
    const { taxAmount, total } = this.calculateTotals(
      afterDiscount,
      shippingFee,
    );

    const orderNumber = await this.generateOrderNumber();

    return this.em.transaction(async (tx) => {
      const order = tx.create(Order, {
        orderNumber,
        userId: userId ?? null,
        status: OrderStatus.PENDING_PAYMENT,
        customerEmail: dto.customerEmail.toLowerCase().trim(),
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        shippingAddress: dto.shippingAddress as unknown as Record<string, string>,
        billingAddress: (dto.billingAddress as unknown as Record<
          string,
          string
        >) ?? null,
        subtotal: subtotal.toFixed(2),
        shippingFee: shippingFee.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        couponCode,
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        currency: 'TRY',
        shippingProvider: dto.shippingProvider ?? null,
        legalAcceptances: dto.legalAcceptances ?? null,
        notes: dto.notes ?? null,
      });
      await tx.save(order);

      if (couponCode) {
        await this.coupons.applyOnOrder(
          tx,
          couponCode,
          subtotal,
          order.id,
          dto.customerEmail,
          userId,
        );
      }

      const orderItems = cart!.items.map((item: CartItem) => {
        const grind =
          item.grindOption && isGrindOption(item.grindOption)
            ? item.grindOption
            : item.grindOption || 'whole_bean';
        return tx.create(OrderItem, {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product?.name || 'Ürün',
          variantLabel: item.variant?.weightLabel ?? null,
          grindOption: grind,
          grindLabel: isGrindOption(grind) ? GRIND_LABELS[grind] : grind,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: (Number(item.unitPrice) * item.quantity).toFixed(2),
        });
      });
      await tx.save(orderItems);

      const payment = tx.create(Payment, {
        orderId: order.id,
        provider: 'iyzico',
        status: PaymentStatus.PENDING,
        amount: total.toFixed(2),
        currency: 'TRY',
      });
      await tx.save(payment);

      await tx.remove(cart!.items);
      await tx.remove(cart!);

      return tx.findOneOrFail(Order, {
        where: { id: order.id },
        relations: { items: true, payment: true },
      });
    });
  }

  async listForUser(userId: string): Promise<Order[]> {
    return this.em.find(Order, {
      where: { userId },
      relations: { items: true, payment: true, shipments: true },
      order: { createdAt: 'DESC' },
    });
  }

  async listAllAdmin(
    query: OrderQueryDto = {},
  ): Promise<PaginatedResult<Order>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const qb = this.em
      .createQueryBuilder(Order, 'o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('o.payment', 'payment')
      .leftJoinAndSelect('o.shipments', 'shipments')
      .orderBy('o.created_at', 'DESC');

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }

    if (query.q?.trim()) {
      const q = `%${query.q.trim()}%`;
      qb.andWhere(
        `(
          o.order_number ILIKE :q OR
          o.customer_email ILIKE :q OR
          o.customer_name ILIKE :q OR
          o.customer_phone ILIKE :q OR
          COALESCE(o.notes, '') ILIKE :q
        )`,
        { q },
      );
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return paginateResult(items, total, page, limit);
  }

  async findById(id: string): Promise<Order> {
    const order = await this.em.findOne(Order, {
      where: { id },
      relations: { items: true, payment: true, shipments: true },
    });
    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }
    return order;
  }

  async lookupGuest(dto: GuestOrderLookupDto) {
    const order = await this.em.findOne(Order, {
      where: {
        orderNumber: dto.orderNumber,
        customerEmail: dto.email,
      },
      relations: { items: true, shipments: true },
    });
    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }

    const ship = order.shippingAddress || {};
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      customerName: order.customerName,
      shippingCity: ship.city || null,
      shippingDistrict: ship.district || null,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      total: order.total,
      currency: order.currency,
      shippingProvider: order.shippingProvider,
      items: (order.items || []).map((item) => ({
        id: item.id,
        productName: item.productName,
        variantLabel: item.variantLabel,
        grindLabel: item.grindLabel,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      shipments: (order.shipments || []).map((s) => ({
        id: s.id,
        provider: s.provider,
        status: s.status,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
      })),
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.findById(id);
    if (!Object.values(OrderStatus).includes(dto.status)) {
      throw new BadRequestException('Geçersiz sipariş durumu');
    }
    const previous = order.status;
    order.status = dto.status;
    const saved = await this.em.save(order);

    if (previous !== dto.status) {
      const template =
        dto.status === OrderStatus.PAID ? 'order_paid' : 'order_status';
      await this.notifications.enqueueOrderStatus(
        saved.id,
        template,
        ['email', 'sms'],
        {
          status: dto.status,
          statusLabel: statusLabel(dto.status),
        },
      );
    }

    return saved;
  }

  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `KLC-${y}${m}${d}-`;

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

  private async resolveShippingFee(
    providerCode: string | undefined | null,
    subtotal: number,
  ): Promise<number> {
    const freeOver = this.config.get<number>('shipping.freeOver') || 0;
    if (freeOver > 0 && subtotal >= freeOver) {
      return 0;
    }

    const defaultFee = this.config.get<number>('shipping.defaultFee') ?? 89.9;
    if (!providerCode) return defaultFee;

    const codes = Object.values(ShippingProviderCode) as string[];
    if (!codes.includes(providerCode)) {
      return defaultFee;
    }

    const config = await this.em.findOne(ShippingProviderConfig, {
      where: {
        provider: providerCode as ShippingProviderCode,
        isEnabled: true,
      },
    });
    const fee = config?.settings?.fee;
    if (typeof fee === 'number') return fee;
    if (typeof fee === 'string' && fee.trim()) {
      const n = Number(fee);
      return Number.isFinite(n) ? n : defaultFee;
    }
    return defaultFee;
  }

  private calculateTotals(subtotal: number, shippingFee: number) {
    const rate = this.config.get<number>('tax.ratePercent') ?? 20;
    const included = this.config.get<boolean>('tax.included') !== false;
    const net = subtotal + shippingFee;

    if (included) {
      const taxAmount = rate > 0 ? (net * rate) / (100 + rate) : 0;
      return { taxAmount, total: net };
    }

    const taxAmount = (net * rate) / 100;
    return { taxAmount, total: net + taxAmount };
  }
}
