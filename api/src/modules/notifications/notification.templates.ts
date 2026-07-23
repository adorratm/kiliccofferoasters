import { ConfigService } from '@nestjs/config';
import { Order } from '@entities/order.entity';
import { Shipment } from '@entities/shipment.entity';

export type NotificationTemplateContext = {
  order: Order;
  shipment?: Shipment | null;
  statusLabel?: string;
  trackingUrl?: string;
  frontendUrl: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Ödeme bekleniyor',
  paid: 'Ödeme alındı',
  processing: 'Hazırlanıyor',
  shipped: 'Kargoya verildi',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
  refunded: 'İade edildi',
  pending: 'Beklemede',
  label_created: 'Etiket oluşturuldu',
  in_transit: 'Yolda',
  failed: 'Başarısız',
  returned: 'İade kargo',
};

const BRAND = 'Kılıç Coffee Roaster';
const BRAND_EMAIL = 'info@kiliccoffeeroaster.com.tr';

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function resolveFrontendUrl(config: ConfigService): string {
  return (
    config.get<string>('frontendUrl') || 'http://localhost:3000'
  ).replace(/\/$/, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trackUrlFor(ctx: NotificationTemplateContext): string {
  const trackCode = ctx.shipment?.trackingNumber;
  return (
    ctx.trackingUrl ||
    (trackCode
      ? `${ctx.frontendUrl}/takip/${encodeURIComponent(trackCode)}`
      : `${ctx.frontendUrl}/hesabim`)
  );
}

/** Ortak markalı HTML e-posta kabuğu */
export function renderBrandedEmail(input: {
  preheader?: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
  metaRows?: { label: string; value: string }[];
}): string {
  const preheader = input.preheader || input.title;
  const rows = (input.metaRows || [])
    .map(
      (r) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #3d3229;font-family:Georgia,serif;font-size:13px;color:#a89888;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(r.label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #3d3229;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#f5efe6;text-align:right;">${escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join('');

  const paras = input.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#e8ddd0;">${p}</p>`,
    )
    .join('');

  const cta = input.cta
    ? `<p style="margin:28px 0 8px;">
        <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;background:#c4a574;color:#1a1410;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 28px;">${escapeHtml(input.cta.label)}</a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#0f0c0a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f0c0a;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1a1410;border:1px solid #3d3229;">
          <tr>
            <td style="padding:28px 28px 20px;border-bottom:1px solid #3d3229;">
              <p style="margin:0;font-family:Georgia,serif;font-size:22px;letter-spacing:0.04em;color:#f5efe6;">${BRAND}</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#c4a574;">Torbalı · İzmir</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c4a574;">${escapeHtml(input.title)}</p>
              <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;line-height:1.25;font-weight:400;color:#f5efe6;">${escapeHtml(input.greeting)}</h1>
              ${paras}
              ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 12px;">${rows}</table>` : ''}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;border-top:1px solid #3d3229;background:#14100d;">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a89888;">${BRAND}</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7a6b5c;">
                <a href="mailto:${BRAND_EMAIL}" style="color:#c4a574;text-decoration:none;">${BRAND_EMAIL}</a>
                · +90 541 214 79 63
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailContent(
  template: string,
  ctx: NotificationTemplateContext,
): { subject: string; html: string; text: string } {
  const orderNo = ctx.order.orderNumber;
  const name = ctx.order.customerName;
  const trackCode = ctx.shipment?.trackingNumber;
  const trackUrl = trackUrlFor(ctx);
  const label = ctx.statusLabel || statusLabel(ctx.order.status);
  const ordersUrl = `${ctx.frontendUrl}/hesabim`;

  switch (template) {
    case 'order_paid':
      return {
        subject: `Ödemeniz alındı — ${orderNo}`,
        html: renderBrandedEmail({
          title: 'Ödeme alındı',
          greeting: `Merhaba ${name},`,
          paragraphs: [
            `<strong style="color:#f5efe6;">${escapeHtml(orderNo)}</strong> numaralı siparişinizin ödemesi alındı. Kahveniz hazırlanmaya başlıyor.`,
          ],
          metaRows: [
            { label: 'Sipariş', value: orderNo },
            { label: 'Durum', value: 'Ödeme alındı' },
          ],
          cta: { label: 'Siparişlerim', href: ordersUrl },
        }),
        text: `Merhaba ${name}, ${orderNo} ödemesi alındı. ${ordersUrl}`,
      };
    case 'order_status':
      return {
        subject: `Sipariş durumu: ${label} — ${orderNo}`,
        html: renderBrandedEmail({
          title: 'Sipariş güncellemesi',
          greeting: `Merhaba ${name},`,
          paragraphs: [
            `<strong style="color:#f5efe6;">${escapeHtml(orderNo)}</strong> siparişinizin yeni durumu: <strong style="color:#c4a574;">${escapeHtml(label)}</strong>.`,
          ],
          metaRows: [
            { label: 'Sipariş', value: orderNo },
            { label: 'Durum', value: label },
          ],
          cta: { label: 'Siparişlerim', href: ordersUrl },
        }),
        text: `Merhaba ${name}, ${orderNo} durumu: ${label}. ${ordersUrl}`,
      };
    case 'shipment_created':
      return {
        subject: `Kargoya verildi — ${orderNo}`,
        html: renderBrandedEmail({
          title: 'Kargoya verildi',
          greeting: `Merhaba ${name},`,
          paragraphs: [
            `<strong style="color:#f5efe6;">${escapeHtml(orderNo)}</strong> siparişiniz kargoya verildi.`,
          ],
          metaRows: [
            { label: 'Sipariş', value: orderNo },
            ...(trackCode
              ? [{ label: 'Takip kodu', value: trackCode }]
              : []),
          ],
          cta: { label: 'Kargo takip', href: trackUrl },
        }),
        text: `Merhaba ${name}, ${orderNo} kargoya verildi. Takip: ${trackCode || trackUrl}`,
      };
    case 'shipment_status':
      return {
        subject: `Kargo güncellemesi: ${label} — ${orderNo}`,
        html: renderBrandedEmail({
          title: 'Kargo güncellemesi',
          greeting: `Merhaba ${name},`,
          paragraphs: [
            `Kargo durumunuz güncellendi: <strong style="color:#c4a574;">${escapeHtml(label)}</strong>.`,
          ],
          metaRows: [
            { label: 'Sipariş', value: orderNo },
            { label: 'Durum', value: label },
            ...(trackCode
              ? [{ label: 'Takip kodu', value: trackCode }]
              : []),
          ],
          cta: { label: 'Canlı takip', href: trackUrl },
        }),
        text: `Merhaba ${name}, kargo durumu ${label}. Takip: ${trackUrl}`,
      };
    default:
      return {
        subject: `${BRAND} bildirimi — ${orderNo}`,
        html: renderBrandedEmail({
          title: 'Sipariş bildirimi',
          greeting: `Merhaba ${name},`,
          paragraphs: [
            `Siparişiniz hakkında bir güncelleme var: <strong style="color:#c4a574;">${escapeHtml(label)}</strong>.`,
          ],
          metaRows: [
            { label: 'Sipariş', value: orderNo },
            { label: 'Durum', value: label },
          ],
          cta: { label: 'Siparişlerim', href: ordersUrl },
        }),
        text: `Merhaba ${name}, sipariş güncellemesi: ${label}.`,
      };
  }
}

export function buildWhatsAppBody(
  template: string,
  ctx: NotificationTemplateContext,
): string {
  const orderNo = ctx.order.orderNumber;
  const name = ctx.order.customerName?.split(' ')[0] || 'Merhaba';
  const trackCode = ctx.shipment?.trackingNumber;
  const label = ctx.statusLabel || statusLabel(ctx.order.status);
  const trackUrl = trackUrlFor(ctx);

  switch (template) {
    case 'order_paid':
      return `Merhaba ${name},\n\n${orderNo} numaralı siparişinizin ödemesi alındı. Kahveniz hazırlanmaya başlıyor.\n\n${BRAND}`;
    case 'shipment_created':
      return `Merhaba ${name},\n\n${orderNo} siparişiniz kargoya verildi.${trackCode ? `\nTakip kodu: ${trackCode}` : ''}\nTakip: ${trackUrl}\n\n${BRAND}`;
    case 'shipment_status':
      return `Merhaba ${name},\n\nKargo durumu: ${label}.${trackCode ? `\nTakip kodu: ${trackCode}` : ''}\nTakip: ${trackUrl}\n\n${BRAND}`;
    case 'order_status':
      return `Merhaba ${name},\n\n${orderNo} siparişinizin yeni durumu: ${label}.\n\n${BRAND}`;
    default:
      return `Merhaba ${name},\n\n${orderNo} — ${label}\n\n${BRAND}`;
  }
}

/** @deprecated SMS kaldırıldı; geriye dönük importlar için alias */
export const buildSmsBody = buildWhatsAppBody;

export function buildAbandonedCartEmail(input: {
  name: string;
  itemCount: number;
  cartUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: 'Sepetinizde kahve sizi bekliyor',
    html: renderBrandedEmail({
      title: 'Sepet hatırlatması',
      greeting: `Merhaba ${input.name},`,
      paragraphs: [
        `Sepetinizde <strong style="color:#f5efe6;">${input.itemCount}</strong> ürün kaldı. Siparişinizi tamamlayın — taze kavrumlar tükenmeden.`,
      ],
      cta: { label: 'Sepete dön', href: input.cartUrl },
    }),
    text: `Merhaba ${input.name}, sepetinizde ${input.itemCount} ürün var: ${input.cartUrl}`,
  };
}

export function buildLowStockEmail(input: {
  label: string;
  stock: number;
  sku: string | null;
  adminUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: `Düşük stok: ${input.label} (${input.stock})`,
    html: renderBrandedEmail({
      title: 'Admin stok uyarısı',
      greeting: 'Merhaba,',
      paragraphs: [
        `<strong style="color:#f5efe6;">${escapeHtml(input.label)}</strong> stok seviyesi eşik altına düştü.`,
      ],
      metaRows: [
        { label: 'Stok', value: String(input.stock) },
        ...(input.sku ? [{ label: 'SKU', value: input.sku }] : []),
      ],
      cta: { label: 'Ürünleri yönet', href: `${input.adminUrl}/urunler` },
    }),
    text: `Düşük stok: ${input.label} — kalan ${input.stock}${input.sku ? ` (SKU: ${input.sku})` : ''}. Yönet: ${input.adminUrl}/urunler`,
  };
}
