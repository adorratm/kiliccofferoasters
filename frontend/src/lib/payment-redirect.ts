/** retry / initialize sonrası ortak yönlendirme */
export function redirectToPayment(result: {
  provider?: string;
  paymentPageUrl?: string;
  iframeUrl?: string | null;
  token?: string;
  checkoutFormContent?: string;
  orderId?: string;
  orderNumber?: string;
}): boolean {
  if (result.paymentPageUrl) {
    window.location.href = result.paymentPageUrl;
    return true;
  }

  if (result.provider === "paytr" && result.token) {
    const qs = new URLSearchParams({ token: result.token });
    if (result.orderId) qs.set("orderId", result.orderId);
    if (result.orderNumber) qs.set("orderNumber", result.orderNumber);
    window.location.href = `/odeme/paytr?${qs}`;
    return true;
  }

  if (result.token) {
    const sandbox =
      process.env.NEXT_PUBLIC_IYZICO_CHECKOUT_URL ||
      "https://sandbox-cpp.iyzipay.com/";
    window.location.href = `${sandbox}?token=${encodeURIComponent(result.token)}`;
    return true;
  }

  if (result.checkoutFormContent && typeof document !== "undefined") {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(result.checkoutFormContent);
      w.document.close();
      return true;
    }
  }
  return false;
}
