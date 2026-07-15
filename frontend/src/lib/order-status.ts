/** Backend notification.templates STATUS_LABELS ile senkron */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Ödeme bekleniyor",
  paid: "Ödeme alındı",
  processing: "Hazırlanıyor",
  shipped: "Kargoya verildi",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
  refunded: "İade edildi",
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  label_created: "Etiket oluşturuldu",
  in_transit: "Yolda",
  delivered: "Teslim edildi",
  failed: "Başarısız",
  returned: "İade kargo",
};

export const ORDER_STEPS = [
  { key: "pending_payment", label: "Ödeme" },
  { key: "paid", label: "Onay" },
  { key: "processing", label: "Hazırlık" },
  { key: "shipped", label: "Kargo" },
  { key: "delivered", label: "Teslim" },
] as const;

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

export function shipmentStatusLabel(status: string): string {
  return SHIPMENT_STATUS_LABELS[status] || ORDER_STATUS_LABELS[status] || status;
}

export function isTerminalFailure(status: string): boolean {
  return status === "cancelled" || status === "refunded";
}

/** 0–4 aktif adım; iptal/iade için -1 */
export function getOrderStepIndex(status: string): number {
  switch (status) {
    case "pending_payment":
      return 0;
    case "paid":
      return 1;
    case "processing":
      return 2;
    case "shipped":
      return 3;
    case "delivered":
      return 4;
    default:
      return -1;
  }
}

export function orderStatusHint(status: string): string | null {
  switch (status) {
    case "pending_payment":
      return "Ödeme tamamlanmadı. Ödeme ekranına yönlendirildiyseniz işlemi bitirin.";
    case "paid":
      return "Ödemeniz alındı. Siparişiniz kavurma sırasına alındı.";
    case "processing":
      return "Siparişiniz hazırlanıyor. Kargoya verildiğinde e-posta ile bilgilendirileceksiniz.";
    case "shipped":
      return "Paketinizi kargo firması teslim aldı. Takip koduyla durumu izleyebilirsiniz.";
    case "delivered":
      return "Teslim edildi. Afiyet olsun — dilerseniz ürün sayfasından yorum bırakın.";
    case "cancelled":
      return "Bu sipariş iptal edildi.";
    case "refunded":
      return "Bu sipariş için iade işlemi yapıldı.";
    default:
      return null;
  }
}
