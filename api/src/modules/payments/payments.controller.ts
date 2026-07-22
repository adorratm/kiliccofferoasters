import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Headers,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IyzicoService } from '@modules/payments/iyzico.service';
import { PaytrService } from '@modules/payments/paytr.service';
import { PaymentsService } from '@modules/payments/payments.service';
import {
  InitializePaymentDto,
  PaymentCallbackDto,
  RetryPaymentDto,
} from '@modules/payments/dto/payments.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@entities/user.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly iyzicoService: IyzicoService,
    private readonly paytrService: PaytrService,
    private readonly config: ConfigService,
  ) {}

  @Post('initialize')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ödeme başlat (PayTR / iyzico)' })
  initialize(
    @Body() dto: InitializePaymentDto,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Req() req?: Request,
  ) {
    return this.paymentsService.initializeCheckout(
      dto,
      this.resolveIp(req, forwardedFor),
    );
  }

  @Public()
  @Post('retry')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ödenmemiş sipariş için ödemeyi yeniden başlat' })
  retry(
    @Body() dto: RetryPaymentDto,
    @CurrentUser() user?: User,
    @Headers('x-forwarded-for') forwardedFor?: string,
    @Req() req?: Request,
  ) {
    return this.paymentsService.retryCheckout(
      dto,
      user,
      this.resolveIp(req, forwardedFor),
    );
  }

  @Public()
  @Get('provider')
  @ApiOperation({ summary: 'Aktif ödeme sağlayıcısı' })
  provider() {
    return { provider: this.paymentsService.activeProvider() };
  }

  @Public()
  @Get('callback')
  @Post('callback')
  @ApiOperation({
    summary: 'iyzico ödeme callback — tarayıcıyı sonuç sayfasına yönlendirir',
  })
  async callback(
    @Res() res: Response,
    @Body() body: PaymentCallbackDto,
    @Query() query: PaymentCallbackDto,
  ) {
    const dto: PaymentCallbackDto = {
      token: body?.token || query?.token,
      conversationId: body?.conversationId || query?.conversationId,
      paymentId: body?.paymentId || query?.paymentId,
      status: body?.status || query?.status,
    };

    const frontend = (
      this.config.get<string>('frontendUrl') || 'http://localhost:3000'
    ).replace(/\/$/, '');

    try {
      const result = await this.iyzicoService.handleCallback(dto);
      const qs = new URLSearchParams();
      if (result.orderId) qs.set('orderId', result.orderId);
      if (result.orderNumber) qs.set('orderNumber', result.orderNumber);

      if (result.success) {
        return res.redirect(302, `${frontend}/odeme/basarili?${qs}`);
      }
      return res.redirect(302, `${frontend}/odeme/basarisiz?${qs}`);
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : 'Ödeme doğrulanamadı';
      const qs = new URLSearchParams({ reason });
      return res.redirect(302, `${frontend}/odeme/basarisiz?${qs}`);
    }
  }

  @Public()
  @Post('paytr/callback')
  @ApiOperation({
    summary: 'PayTR bildirim URL — yalnızca OK döner',
  })
  async paytrCallback(
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    await this.paytrService.handleNotification(body || {});
    return res.status(200).send('OK');
  }

  @Public()
  @Get('paytr/mock-complete')
  @ApiOperation({ summary: 'Geliştirme: mock PayTR ödeme tamamlama' })
  async paytrMockComplete(
    @Res() res: Response,
    @Query('merchant_oid') merchantOid?: string,
    @Query('status') status?: string,
  ) {
    const frontend = (
      this.config.get<string>('frontendUrl') || 'http://localhost:3000'
    ).replace(/\/$/, '');

    try {
      if (!merchantOid) {
        throw new Error('merchant_oid gerekli');
      }
      const result = await this.paytrService.handleMockComplete(
        merchantOid,
        status || 'success',
      );
      const qs = new URLSearchParams();
      if (result.orderId) qs.set('orderId', result.orderId);
      if (result.orderNumber) qs.set('orderNumber', result.orderNumber);
      if (result.success) {
        return res.redirect(302, `${frontend}/odeme/basarili?${qs}`);
      }
      return res.redirect(302, `${frontend}/odeme/basarisiz?${qs}`);
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : 'Ödeme doğrulanamadı';
      return res.redirect(
        302,
        `${frontend}/odeme/basarisiz?${new URLSearchParams({ reason })}`,
      );
    }
  }

  private resolveIp(req?: Request, forwardedFor?: string): string | undefined {
    if (forwardedFor) return forwardedFor;
    return req?.ip || req?.socket?.remoteAddress;
  }
}
