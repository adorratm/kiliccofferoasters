"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  checkout,
  getMe,
  getMyAddresses,
  getShippingProviders,
  validateCoupon,
} from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { getToken } from "@/lib/auth";
import {
  cartSubtotal,
  fetchCart,
  getCartSessionId,
} from "@/lib/cart";
import { formatMoney } from "@/lib/format";
import { calculateOrderTotals } from "@/lib/pricing";
import type {
  Address,
  Cart,
  CouponPreview,
  ShippingProvider,
  User,
} from "@/lib/types";

type AddressFields = {
  city: string;
  district: string;
  neighborhood: string;
  addressLine: string;
  postalCode: string;
};

const emptyAddr = (): AddressFields => ({
  city: "",
  district: "",
  neighborhood: "",
  addressLine: "",
  postalCode: "",
});

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(
    null,
  );
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [shippingId, setShippingId] = useState<string>("");
  const [billingId, setBillingId] = useState<string>("");
  const [billingSame, setBillingSame] = useState(true);

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shipping: emptyAddr(),
    billing: emptyAddr(),
    shippingProvider: "",
    mesafeliSatis: false,
    onBilgilendirme: false,
    kvkk: false,
    notes: "",
  });

  useEffect(() => {
    const token = getToken();
    Promise.all([
      fetchCart(),
      getShippingProviders(),
      token ? getMyAddresses(token) : Promise.resolve([] as Address[]),
      token ? getMe(token).catch(() => null) : Promise.resolve(null),
    ]).then(([cartData, providerData, addressData, me]) => {
      setCart(cartData);
      setProviders(providerData);
      setAddresses(addressData);
      setUser(me);

      setForm((f) => {
        const next = { ...f };
        if (providerData[0] && !f.shippingProvider) {
          next.shippingProvider = providerData[0].code;
        }
        if (me) {
          next.customerEmail = me.email || f.customerEmail;
          next.customerName =
            [me.firstName, me.lastName].filter(Boolean).join(" ") ||
            f.customerName;
          next.customerPhone = me.phone || f.customerPhone;
        }
        return next;
      });

      const defShip =
        addressData.find((a) => a.isDefaultShipping) || addressData[0];
      const defBill =
        addressData.find((a) => a.isDefaultBilling) || defShip;
      if (defShip) {
        setShippingId(defShip.id);
        applyAddressToShipping(defShip);
      }
      if (defBill && defBill.id !== defShip?.id) {
        setBillingSame(false);
        setBillingId(defBill.id);
        applyAddressToBilling(defBill);
      } else if (defBill) {
        setBillingId(defBill.id);
      }

      setLoading(false);
    });
  }, []);

  function applyAddressToShipping(addr: Address) {
    setForm((f) => ({
      ...f,
      customerName: addr.fullName || f.customerName,
      customerPhone: addr.phone || f.customerPhone,
      shipping: {
        city: addr.city,
        district: addr.district,
        neighborhood: addr.neighborhood || "",
        addressLine: addr.addressLine,
        postalCode: addr.postalCode,
      },
    }));
  }

  function applyAddressToBilling(addr: Address) {
    setForm((f) => ({
      ...f,
      billing: {
        city: addr.city,
        district: addr.district,
        neighborhood: addr.neighborhood || "",
        addressLine: addr.addressLine,
        postalCode: addr.postalCode,
      },
    }));
  }

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setShippingField<K extends keyof AddressFields>(
    key: K,
    value: AddressFields[K],
  ) {
    setShippingId("");
    setForm((prev) => ({
      ...prev,
      shipping: { ...prev.shipping, [key]: value },
    }));
  }

  function setBillingField<K extends keyof AddressFields>(
    key: K,
    value: AddressFields[K],
  ) {
    setBillingId("");
    setForm((prev) => ({
      ...prev,
      billing: { ...prev.billing, [key]: value },
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.mesafeliSatis || !form.onBilgilendirme || !form.kvkk) {
      setError("Yasal onay kutularını işaretlemeniz gerekir.");
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = getCartSessionId();
      const shippingAddress = {
        fullName: form.customerName,
        phone: form.customerPhone,
        city: form.shipping.city,
        district: form.shipping.district,
        neighborhood: form.shipping.neighborhood,
        addressLine: form.shipping.addressLine,
        postalCode: form.shipping.postalCode,
      };
      const billingSource = billingSame ? form.shipping : form.billing;
      const billingAddress = {
        fullName: form.customerName,
        phone: form.customerPhone,
        city: billingSource.city,
        district: billingSource.district,
        neighborhood: billingSource.neighborhood,
        addressLine: billingSource.addressLine,
        postalCode: billingSource.postalCode,
      };

      const result = await checkout(
        sessionId,
        {
          customerEmail: form.customerEmail,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          shippingAddress,
          billingAddress,
          shippingProvider: form.shippingProvider,
          couponCode: couponPreview?.valid ? couponPreview.code : undefined,
          legalAcceptances: {
            mesafeliSatis: form.mesafeliSatis,
            onBilgilendirme: form.onBilgilendirme,
            kvkk: form.kvkk,
          },
          notes: form.notes || undefined,
        },
        getToken(),
      );

      if (result.paymentPageUrl) {
        window.location.href = result.paymentPageUrl;
        return;
      }
      if (result.token) {
        window.location.href = `https://sandbox-cpp.iyzipay.com/?token=${encodeURIComponent(result.token)}`;
        return;
      }
      if (result.checkoutFormContent) {
        const win = window.open("", "_self");
        if (win) {
          win.document.write(result.checkoutFormContent);
          win.document.close();
        }
        return;
      }
      setError("Ödeme yönlendirmesi alınamadı.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ödeme başlatılamadı. API bağlantısını kontrol edin.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const subtotal = cartSubtotal(cart);
  const selected = providers.find((p) => p.code === form.shippingProvider);
  const shippingFee = Number(selected?.fee || 0);
  const discountAmount = couponPreview?.valid
    ? Number(couponPreview.discountAmount)
    : 0;
  const totals = calculateOrderTotals(subtotal, shippingFee, {
    discountAmount,
  });
  const total = totals.total;

  async function applyCoupon() {
    setCouponError(null);
    setCouponPreview(null);
    const code = couponInput.trim();
    if (!code) {
      setCouponError("Kupon kodu girin");
      return;
    }
    setCouponLoading(true);
    try {
      const preview = await validateCoupon(
        code,
        subtotal,
        form.customerEmail || undefined,
        getToken(),
      );
      if (!preview.valid) {
        setCouponError(preview.message || "Geçersiz kupon");
        return;
      }
      setCouponPreview(preview);
      setCouponInput(preview.code);
    } catch (err) {
      setCouponError(
        err instanceof Error ? err.message : "Kupon doğrulanamadı",
      );
    } finally {
      setCouponLoading(false);
    }
  }

  function clearCoupon() {
    setCouponPreview(null);
    setCouponError(null);
    setCouponInput("");
  }

  if (loading) {
    return (
      <div className="page-shell py-24 font-meta text-sm uppercase text-secondary">
        Ödeme hazırlanıyor…
      </div>
    );
  }

  if (!cart?.items?.length) {
    return (
      <div className="page-shell py-24">
        <h1 className="font-display text-4xl">Ödeme</h1>
        <p className="mt-4 font-meta text-sm uppercase text-secondary">
          Sepet boş.
        </p>
        <Link href="/urunler" className="btn-cta mt-8 inline-block px-8 py-4 text-xs">
          Alışverişe Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell py-16 md:py-24">
      <div className="page-enter mb-0">
        <div className="mb-2 font-meta text-xs uppercase tracking-widest text-primary">
          Checkout / iyzico
        </div>
        <h1 className="font-display text-4xl md:text-6xl">Ödeme</h1>
        {user ? (
          <p className="mt-3 font-meta text-[11px] uppercase text-secondary">
            Kayıtlı adresleriniz yüklenir. Yönetmek için{" "}
            <Link href="/hesabim" className="text-primary underline">
              Hesabım
            </Link>
          </p>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-12"
      >
        <div className="space-y-8 lg:col-span-8">
          <Reveal variant="left">
          <section className="panel-motion industrial-border bg-surface-container-low p-6 md:p-8">
            <h2 className="mb-6 font-display text-2xl">İletişim</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Ad Soyad"
                value={form.customerName}
                onChange={(v) => setField("customerName", v)}
                required
              />
              <Field
                label="Telefon"
                value={form.customerPhone}
                onChange={(v) => setField("customerPhone", v)}
                required
              />
              <Field
                label="E-posta"
                type="email"
                value={form.customerEmail}
                onChange={(v) => setField("customerEmail", v)}
                required
              />
            </div>
          </section>
          </Reveal>

          <Reveal variant="left" delay={70}>
          <section className="panel-motion industrial-border bg-surface-container-low p-6 md:p-8">
            <h2 className="mb-6 font-display text-2xl">Teslimat adresi</h2>
            {addresses.length > 0 ? (
              <div className="mb-6 space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setShippingId(addr.id);
                      applyAddressToShipping(addr);
                    }}
                    className={`w-full border px-4 py-3 text-left font-meta text-[11px] uppercase transition-colors ${
                      shippingId === addr.id
                        ? "border-primary text-primary"
                        : "border-outline-variant/30 text-secondary hover:border-outline"
                    }`}
                  >
                    <span className="font-medium">{addr.title}</span>
                    {addr.isDefaultShipping ? " · varsayılan" : ""}
                    <span className="mt-1 block normal-case tracking-normal text-secondary">
                      {addr.district}, {addr.city}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Şehir"
                value={form.shipping.city}
                onChange={(v) => setShippingField("city", v)}
                required
              />
              <Field
                label="İlçe"
                value={form.shipping.district}
                onChange={(v) => setShippingField("district", v)}
                required
              />
              <Field
                label="Mahalle"
                value={form.shipping.neighborhood}
                onChange={(v) => setShippingField("neighborhood", v)}
              />
              <Field
                label="Posta Kodu"
                value={form.shipping.postalCode}
                onChange={(v) => setShippingField("postalCode", v)}
                required
              />
              <div className="md:col-span-2">
                <Field
                  label="Adres"
                  value={form.shipping.addressLine}
                  onChange={(v) => setShippingField("addressLine", v)}
                  required
                />
              </div>
            </div>
          </section>
          </Reveal>

          <Reveal variant="left" delay={120}>
          <section className="panel-motion industrial-border bg-surface-container-low p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-2xl">Fatura adresi</h2>
              <Check
                checked={billingSame}
                onChange={(v) => {
                  setBillingSame(v);
                  if (v) setBillingId(shippingId);
                }}
                label={<span>Teslimat ile aynı</span>}
              />
            </div>
            {!billingSame ? (
              <>
                {addresses.length > 0 ? (
                  <div className="mb-6 space-y-2">
                    {addresses.map((addr) => (
                      <button
                        key={`bill-${addr.id}`}
                        type="button"
                        onClick={() => {
                          setBillingId(addr.id);
                          applyAddressToBilling(addr);
                        }}
                        className={`w-full border px-4 py-3 text-left font-meta text-[11px] uppercase transition-colors ${
                          billingId === addr.id
                            ? "border-primary text-primary"
                            : "border-outline-variant/30 text-secondary hover:border-outline"
                        }`}
                      >
                        <span className="font-medium">{addr.title}</span>
                        {addr.isDefaultBilling ? " · varsayılan fatura" : ""}
                        <span className="mt-1 block normal-case tracking-normal text-secondary">
                          {addr.district}, {addr.city}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Şehir"
                    value={form.billing.city}
                    onChange={(v) => setBillingField("city", v)}
                    required
                  />
                  <Field
                    label="İlçe"
                    value={form.billing.district}
                    onChange={(v) => setBillingField("district", v)}
                    required
                  />
                  <Field
                    label="Mahalle"
                    value={form.billing.neighborhood}
                    onChange={(v) => setBillingField("neighborhood", v)}
                  />
                  <Field
                    label="Posta Kodu"
                    value={form.billing.postalCode}
                    onChange={(v) => setBillingField("postalCode", v)}
                    required
                  />
                  <div className="md:col-span-2">
                    <Field
                      label="Adres"
                      value={form.billing.addressLine}
                      onChange={(v) => setBillingField("addressLine", v)}
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="font-meta text-xs uppercase text-secondary">
                Fatura bilgileri teslimat adresiyle aynı olacak.
              </p>
            )}
          </section>
          </Reveal>

          <Reveal variant="left" delay={160}>
          <section className="panel-motion industrial-border bg-surface-container-low p-6 md:p-8">
            <h2 className="mb-6 font-display text-2xl">Kargo Sağlayıcı</h2>
            <div className="space-y-3">
              {providers.map((p) => (
                <label
                  key={p.code}
                  className={`flex cursor-pointer items-center justify-between border px-4 py-4 font-meta text-xs uppercase ${
                    form.shippingProvider === p.code
                      ? "border-primary text-primary"
                      : "border-outline-variant/30 text-secondary"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      checked={form.shippingProvider === p.code}
                      onChange={() => setField("shippingProvider", p.code)}
                    />
                    {p.name}
                  </span>
                  <span>{formatMoney(p.fee)}</span>
                </label>
              ))}
            </div>
          </section>
          </Reveal>

          <Reveal variant="left" delay={200}>
          <section className="panel-motion industrial-border bg-surface-container-low p-6 md:p-8">
            <h2 className="mb-6 font-display text-2xl">Yasal Onaylar</h2>
            <div className="space-y-4 font-meta text-xs uppercase text-secondary">
              <Check
                checked={form.mesafeliSatis}
                onChange={(v) => setField("mesafeliSatis", v)}
                label={
                  <>
                    <Link href="/mesafeli-satis" className="text-primary underline">
                      Mesafeli satış sözleşmesini
                    </Link>{" "}
                    okudum, kabul ediyorum.
                  </>
                }
              />
              <Check
                checked={form.onBilgilendirme}
                onChange={(v) => setField("onBilgilendirme", v)}
                label={
                  <>
                    <Link href="/on-bilgilendirme" className="text-primary underline">
                      Ön bilgilendirme formunu
                    </Link>{" "}
                    okudum.
                  </>
                }
              />
              <Check
                checked={form.kvkk}
                onChange={(v) => setField("kvkk", v)}
                label={
                  <>
                    <Link href="/kvkk" className="text-primary underline">
                      KVKK
                    </Link>{" "}
                    metnini kabul ediyorum.
                  </>
                }
              />
            </div>
          </section>
          </Reveal>
        </div>

        <aside className="lg:col-span-4">
          <Reveal variant="right" delay={100}>
          <div className="sticky top-28 border border-outline-variant/30 bg-surface-container-low p-6 panel-motion">
            <h2 className="mb-6 font-display text-2xl">Özet</h2>
            <div className="mb-6 space-y-2">
              <label className="field-label">Kupon kodu</label>
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(e) =>
                    setCouponInput(e.target.value.toUpperCase())
                  }
                  disabled={Boolean(couponPreview?.valid)}
                  placeholder="HOSGELDIN10"
                  className="field-input flex-1 uppercase"
                />
                {couponPreview?.valid ? (
                  <button
                    type="button"
                    onClick={clearCoupon}
                    className="shrink-0 border border-outline-variant/40 px-3 font-meta text-[10px] uppercase"
                  >
                    Kaldır
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={couponLoading}
                    className="shrink-0 border border-primary px-3 font-meta text-[10px] uppercase text-primary disabled:opacity-50"
                  >
                    {couponLoading ? "…" : "Uygula"}
                  </button>
                )}
              </div>
              {couponError ? (
                <p className="font-meta text-[10px] uppercase text-error">
                  {couponError}
                </p>
              ) : null}
              {couponPreview?.valid ? (
                <p className="font-meta text-[10px] uppercase text-primary">
                  {couponPreview.title || couponPreview.code} uygulandı
                </p>
              ) : null}
            </div>
            <div className="space-y-3 border-b border-outline-variant/20 pb-6 font-meta text-xs uppercase">
              <Row label="Ara Toplam" value={formatMoney(subtotal)} />
              {discountAmount > 0 ? (
                <Row
                  label={`İndirim (${couponPreview?.code})`}
                  value={`−${formatMoney(discountAmount)}`}
                />
              ) : null}
              <Row label="Kargo" value={formatMoney(shippingFee)} />
              <Row
                label={`KDV (%${totals.ratePercent}${totals.taxIncluded ? " dahil" : ""})`}
                value={formatMoney(totals.taxAmount)}
              />
              <Row label="Toplam" value={formatMoney(total)} accent />
            </div>
            {error ? (
              <p className="mt-4 font-meta text-[11px] uppercase text-error">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="btn-cta mt-6 w-full py-4 text-xs"
            >
              {submitting ? "Yönlendiriliyor…" : "iyzico ile Öde"}
            </button>
          </div>
          </Reveal>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border ${
          checked
            ? "border-primary bg-primary text-on-primary"
            : "border-outline-variant/50"
        }`}
        aria-hidden
      >
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6.2L4.6 9L10 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="square"
            />
          </svg>
        ) : null}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-secondary">{label}</span>
      <span className={accent ? "text-primary" : "text-on-surface"}>{value}</span>
    </div>
  );
}
