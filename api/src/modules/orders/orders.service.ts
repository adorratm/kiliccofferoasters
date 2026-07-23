import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
  ReturnRequest,
  ReturnRequestStatus,
  ReturnRequestType,
} from '@entities/return-request.entity';
import {
  CreateOrderDto,
  CreateReturnRequestDto,
  GuestOrderLookupDto,
  OrderQueryDto,
  ReviewReturnRequestDto,
  UpdateOrderStatusDto,
} from '@modules/orders/dto/orders.dto';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { statusLabel } from '@modules/notifications/notification.templates';
import { CouponsService } from '@modules/coupons/coupons.service';
import { InventoryService } from '@modules/catalog/inventory.service';
import { PaytrService } from '@modules/payments/paytr.service';
import { grindLabel } from '@common/constants/grind-options';
import {
  paginateResult,
  PaginatedResult,
} from '@common/utils/pagination';

const RETURN_WINDOW_DAYS = 14;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    private readonly coupons: CouponsService,
    private readonly inventory: InventoryService,
    private readonly paytr: PaytrService,
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
        sourceCartId: cart!.id,
      });
      await tx.save(order);

      // Kupon kullanımı ödeme PAID olunca confirm edilir (başarısız ödemede yanmasın)

      const orderItems = cart!.items.map((item: CartItem) => {
        const grind = item.grindOption || 'whole_bean';
        return tx.create(OrderItem, {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product?.name || 'Ürün',
          variantLabel: item.variant?.weightLabel ?? null,
          grindOption: grind,
          grindLabel: grindLabel(grind),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: (Number(item.unitPrice) * item.quantity).toFixed(2),
        });
      });
      await tx.save(orderItems);

      const payment = tx.create(Payment, {
        orderId: order.id,
        provider: 'paytr',
        status: PaymentStatus.PENDING,
        amount: total.toFixed(2),
        currency: 'TRY',
      });
      await tx.save(payment);

      // Sepet ödeme başarılı olunca temizlenir (PENDING_PAYMENT'da kalır)

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
    if (dto.status === OrderStatus.DELIVERED && previous !== OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
    }
    const saved = await this.em.save(order);

    if (previous !== dto.status) {
      try {
        await this.inventory.maybeRestoreOnStatusChange(
          saved.id,
          previous,
          dto.status,
        );
      } catch (err) {
        this.logger.warn(
          `Stock restore on status change failed for ${saved.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      const template =
        dto.status === OrderStatus.PAID ? 'order_paid' : 'order_status';
      await this.notifications.enqueueOrderStatus(
        saved.id,
        template,
        ['email', 'whatsapp'],
        {
          status: dto.status,
          statusLabel: statusLabel(dto.status),
        },
      );
    }

    return saved;
  }

  async createReturnRequest(
    orderId: string,
    userId: string,
    dto: CreateReturnRequestDto,
  ): Promise<ReturnRequest> {
    const order = await this.findById(orderId);
    if (order.userId !== userId) {
      throw new ForbiddenException('Bu siparişe erişim yok');
    }

    const open = await this.em.findOne(ReturnRequest, {
      where: {
        orderId,
        status: ReturnRequestStatus.REQUESTED,
      },
    });
    if (open) {
      throw new BadRequestException('Bu sipariş için açık bir talep zaten var');
    }

    this.assertReturnEligible(order, dto.type);

    const request = this.em.create(ReturnRequest, {
      orderId,
      userId,
      type: dto.type,
      status: ReturnRequestStatus.REQUESTED,
      reason: dto.reason.trim(),
      adminNote: null,
      reviewedAt: null,
      reviewedById: null,
    });
    const saved = await this.em.save(request);

    await this.notifications.enqueueOrderStatus(
      orderId,
      'return_requested',
      ['email'],
      {
        statusLabel:
          dto.type === ReturnRequestType.CANCEL
            ? 'İptal talebi'
            : 'İade talebi',
      },
    );

    return saved;
  }

  async listReturnRequestsForOrder(
    orderId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<ReturnRequest[]> {
    const order = await this.findById(orderId);
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('Bu siparişe erişim yok');
    }
    return this.em.find(ReturnRequest, {
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  async listReturnRequestsAdmin(status?: string): Promise<ReturnRequest[]> {
    const qb = this.em
      .createQueryBuilder(ReturnRequest, 'r')
      .leftJoinAndSelect('r.order', 'order')
      .orderBy('r.created_at', 'DESC')
      .take(100);

    if (
      status &&
      Object.values(ReturnRequestStatus).includes(
        status as ReturnRequestStatus,
      )
    ) {
      qb.andWhere('r.status = :status', { status });
    }

    return qb.getMany();
  }

  async reviewReturnRequest(
    requestId: string,
    adminUserId: string,
    dto: ReviewReturnRequestDto,
  ): Promise<ReturnRequest> {
    if (
      dto.status !== ReturnRequestStatus.APPROVED &&
      dto.status !== ReturnRequestStatus.REJECTED
    ) {
      throw new BadRequestException('Sadece onay veya red verilebilir');
    }

    const request = await this.em.findOne(ReturnRequest, {
      where: { id: requestId },
      relations: { order: true },
    });
    if (!request) {
      throw new NotFoundException('İade talebi bulunamadı');
    }
    if (request.status !== ReturnRequestStatus.REQUESTED) {
      throw new BadRequestException('Bu talep zaten incelenmiş');
    }

    request.status = dto.status;
    request.adminNote = dto.adminNote?.trim() || null;
    request.reviewedAt = new Date();
    request.reviewedById = adminUserId;
    let saved = await this.em.save(request);

    if (dto.status === ReturnRequestStatus.APPROVED) {
      const order = await this.findById(request.orderId);
      const previous = order.status;
      const targetStatus =
        request.type === ReturnRequestType.CANCEL
          ? OrderStatus.CANCELLED
          : OrderStatus.REFUNDED;

      // PayTR iadesi (ödeme alınmışsa)
      if (
        order.payment?.provider === 'paytr' &&
        order.payment.conversationId &&
        order.payment.status === PaymentStatus.SUCCESS
      ) {
        const paidAmount = Number(order.payment.amount || order.total);
        let refundNum =
          dto.refundAmount != null && Number.isFinite(dto.refundAmount)
            ? Number(dto.refundAmount)
            : paidAmount;
        if (refundNum <= 0) {
          throw new BadRequestException('İade tutarı 0’dan büyük olmalı');
        }
        if (refundNum > paidAmount) {
          refundNum = paidAmount;
        }
        const refundAmountStr = refundNum.toFixed(2);
        saved.refundAmount = refundAmountStr;
        saved = await this.em.save(saved);

        try {
          const refundResult = await this.paytr.refund({
            merchantOid: order.payment.conversationId,
            returnAmount: refundAmountStr,
            referenceNo: `RR-${request.id.slice(0, 8)}`,
          });
          if (refundNum >= paidAmount - 0.009) {
            order.payment.status = PaymentStatus.REFUNDED;
          }
          order.payment.rawResponse = {
            ...(order.payment.rawResponse || {}),
            refund: refundResult,
            refundAmount: refundAmountStr,
          };
          await this.em.save(order.payment);
        } catch (err) {
          this.logger.error(
            `PayTR refund failed for order ${order.id}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
          throw new BadRequestException(
            err instanceof Error
              ? `Ödeme iadesi başarısız: ${err.message}`
              : 'Ödeme iadesi başarısız',
          );
        }
      } else if (
        dto.refundAmount != null &&
        Number.isFinite(dto.refundAmount)
      ) {
        saved.refundAmount = Number(dto.refundAmount).toFixed(2);
        saved = await this.em.save(saved);
      }

      order.status = targetStatus;
      await this.em.save(order);

      try {
        await this.inventory.maybeRestoreOnStatusChange(
          order.id,
          previous,
          targetStatus,
        );
      } catch (err) {
        this.logger.warn(
          `Stock restore on return approve failed for ${order.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      saved.status = ReturnRequestStatus.COMPLETED;
      saved = await this.em.save(saved);

      await this.notifications.enqueueOrderStatus(
        request.orderId,
        'return_approved',
        ['email'],
        { statusLabel: statusLabel(targetStatus) },
      );
    } else {
      await this.notifications.enqueueOrderStatus(
        request.orderId,
        'return_rejected',
        ['email'],
        { statusLabel: 'Reddedildi' },
      );
    }

    return saved;
  }

  private assertReturnEligible(
    order: Order,
    type: ReturnRequestType,
  ): void {
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED ||
      order.status === OrderStatus.PENDING_PAYMENT
    ) {
      throw new BadRequestException(
        'Bu sipariş durumunda iptal/iade talebi açılamaz',
      );
    }

    if (type === ReturnRequestType.CANCEL) {
      if (
        order.status !== OrderStatus.PAID &&
        order.status !== OrderStatus.PROCESSING
      ) {
        throw new BadRequestException(
          'İptal yalnızca kargoya verilmeden önce mümkündür; teslim sonrası için iade seçin',
        );
      }
      return;
    }

    if (
      order.status !== OrderStatus.SHIPPED &&
      order.status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'İade talebi yalnızca kargoya verilen veya teslim edilen siparişler için açılabilir',
      );
    }

    const anchor =
      order.deliveredAt ||
      (order.status === OrderStatus.DELIVERED
        ? order.updatedAt
        : order.createdAt);
    const deadline =
      new Date(anchor).getTime() +
      RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      throw new BadRequestException(
        `Cayma süresi (${RETURN_WINDOW_DAYS} gün) dolmuş görünüyor`,
      );
    }
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
