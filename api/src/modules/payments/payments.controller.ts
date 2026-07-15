import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IyzicoService } from '@modules/payments/iyzico.service';
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
    private readonly iyzicoService: IyzicoService,
    private readonly config: ConfigService,
  ) {}

  @Post('initialize')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'iyzico checkout form başlat' })
  initialize(@Body() dto: InitializePaymentDto) {
    return this.iyzicoService.initializeCheckout(dto);
  }

  @Public()
  @Post('retry')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ödenmemiş sipariş için ödemeyi yeniden başlat' })
  retry(
    @Body() dto: RetryPaymentDto,
    @CurrentUser() user?: User,
  ) {
    return this.iyzicoService.retryCheckout(dto, user);
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
}
