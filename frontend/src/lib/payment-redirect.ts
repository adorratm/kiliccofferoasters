/** retry / initialize sonrası ortak yönlendirme */
export function redirectToPayment(result: {
  paymentPageUrl?: string;
  token?: string;
  checkoutFormContent?: string;
}): boolean {
  if (result.paymentPageUrl) {
    window.location.href = result.paymentPageUrl;
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
