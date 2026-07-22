import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from '@modules/orders/orders.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { CreateOrderDto } from '@modules/orders/dto/orders.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@entities/user.entity';
import type { Request } from 'express';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Public()
  @Post()
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Session-Id', required: false })
  @ApiOperation({ summary: 'Sepetten sipariş + ödeme başlat (PayTR / iyzico)' })
  async checkout(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: User | undefined,
    @Headers('x-session-id') sessionId?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Req() req?: Request,
  ) {
    const order = await this.ordersService.createFromCart(
      dto,
      user?.id,
      sessionId,
    );
    const userIp = forwardedFor || req?.ip || req?.socket?.remoteAddress;
    const payment = (await this.paymentsService.initializeCheckout(
      { orderId: order.id },
      userIp,
    )) as Record<string, unknown>;
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider:
        (payment.provider as string) || this.paymentsService.activeProvider(),
      token: payment.token as string | undefined,
      paymentPageUrl: payment.paymentPageUrl as string | undefined,
      iframeUrl: (payment.iframeUrl as string | null | undefined) ?? null,
      checkoutFormContent: payment.checkoutFormContent as string | undefined,
      mock: Boolean(payment.mock),
    };
  }
}
