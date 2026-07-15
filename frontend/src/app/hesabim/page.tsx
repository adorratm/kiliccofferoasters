"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  createAddress,
  deleteAddress,
  getMe,
  getMyAddresses,
  getMyOrders,
  updateAddress,
} from "@/lib/api";
import { Reveal } from "@/components/Reveal";
import { StatusBadge } from "@/components/StatusBadge";
import { clearToken, getToken } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { clearWishlistCache } from "@/lib/wishlist";
import type { Address, AddressPayload, Order, User } from "@/lib/types";

const emptyAddressForm = (): AddressPayload => ({
  title: "",
  fullName: "",
  phone: "",
  city: "",
  district: "",
  neighborhood: "",
  addressLine: "",
  postalCode: "",
  isDefaultShipping: false,
  isDefaultBilling: false,
});

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AddressPayload>(emptyAddressForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function reload(token: string) {
    const [me, myOrders, myAddresses] = await Promise.all([
      getMe(token),
      getMyOrders(token),
      getMyAddresses(token),
    ]);
    setUser(me);
    setOrders(myOrders);
    setAddresses(myAddresses);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/giris");
      return;
    }

    reload(token)
      .catch(() => {
        setError("Oturum doğrulanamadı. Tekrar giriş yapın.");
        clearToken();
      })
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    clearToken();
    clearWishlistCache();
    router.push("/giris");
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyAddressForm());
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(addr: Address) {
    setEditingId(addr.id);
    setForm({
      title: addr.title,
      fullName: addr.fullName,
      phone: addr.phone,
      city: addr.city,
      district: addr.district,
      neighborhood: addr.neighborhood || "",
      addressLine: addr.addressLine,
      postalCode: addr.postalCode,
      isDefaultShipping: addr.isDefaultShipping,
      isDefaultBilling: addr.isDefaultBilling,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function onSubmitAddress(e: FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload: AddressPayload = {
        ...form,
        neighborhood: form.neighborhood || undefined,
      };
      if (editingId) {
        await updateAddress(token, editingId, payload);
      } else {
        await createAddress(token, payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyAddressForm());
      await reload(token);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Adres kaydedilemedi",
      );
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(id: string, kind: "shipping" | "billing") {
    const token = getToken();
    if (!token) return;
    try {
      await updateAddress(
        token,
        id,
        kind === "shipping"
          ? { isDefaultShipping: true }
          : { isDefaultBilling: true },
      );
      await reload(token);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Varsayılan ayarlanamadı",
      );
    }
  }

  async function confirmDelete() {
    const token = getToken();
    if (!token || !deleteId) return;
    setDeleting(true);
    try {
      await deleteAddress(token, deleteId);
      setDeleteId(null);
      await reload(token);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Silinemedi");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell py-24 font-meta text-sm uppercase text-secondary">
        Hesap yükleniyor…
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page-shell py-24">
        <p className="font-meta text-sm uppercase text-error">
          {error || "Yetkisiz erişim"}
        </p>
        <Link href="/giris" className="btn-cta mt-8 inline-block px-8 py-4 text-xs">
          Giriş Yap
        </Link>
      </div>
    );
  }

  const pendingDelete = addresses.find((a) => a.id === deleteId);

  return (
    <div className="page-shell py-16 md:py-24">
      <div className="mb-2 flex items-center justify-between gap-4 page-enter">
        <div className="font-meta text-xs uppercase tracking-widest text-primary">
          Hesap / Siparişler
        </div>
        <button
          type="button"
          onClick={logout}
          className="font-meta text-[11px] uppercase text-secondary underline hover:text-primary"
        >
          Çıkış
        </button>
      </div>
      <h1 className="font-display text-4xl md:text-5xl animate-fade-up">Hesabım</h1>
      <p
        className="mt-3 font-meta text-xs uppercase text-secondary animate-fade-up"
        style={{ animationDelay: "80ms" }}
      >
        {user.firstName || user.email}
      </p>

      <div
        className="mt-8 flex flex-wrap gap-4 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <Link
          href="/hesabim/favoriler"
          className="border border-outline-variant/40 px-5 py-3 font-meta text-[11px] uppercase tracking-widest hover:border-primary hover:text-primary"
        >
          Favorilerim
        </Link>
        <Link
          href="/urunler"
          className="border border-outline-variant/40 px-5 py-3 font-meta text-[11px] uppercase tracking-widest hover:border-primary hover:text-primary"
        >
          Alışverişe devam
        </Link>
      </div>

      <section className="mt-12">
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl">Adreslerim</h2>
          <button
            type="button"
            onClick={startCreate}
            className="btn-ghost px-5 py-3 text-xs"
          >
            Yeni adres
          </button>
        </Reveal>

        {formError ? (
          <p className="mb-4 font-meta text-[11px] uppercase text-error">
            {formError}
          </p>
        ) : null}

        {showForm ? (
          <Reveal variant="scale" className="mb-8">
          <form
            onSubmit={onSubmitAddress}
            className="industrial-border bg-surface-container-low p-6 md:p-8"
          >
            <h3 className="mb-6 font-display text-xl">
              {editingId ? "Adresi düzenle" : "Yeni adres"}
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Başlık"
                value={form.title}
                onChange={(title) => setForm((f) => ({ ...f, title }))}
                required
                placeholder="Ev, İş"
              />
              <Field
                label="Ad Soyad"
                value={form.fullName}
                onChange={(fullName) => setForm((f) => ({ ...f, fullName }))}
                required
              />
              <Field
                label="Telefon"
                value={form.phone}
                onChange={(phone) => setForm((f) => ({ ...f, phone }))}
                required
              />
              <Field
                label="Şehir"
                value={form.city}
                onChange={(city) => setForm((f) => ({ ...f, city }))}
                required
              />
              <Field
                label="İlçe"
                value={form.district}
                onChange={(district) => setForm((f) => ({ ...f, district }))}
                required
              />
              <Field
                label="Mahalle"
                value={form.neighborhood || ""}
                onChange={(neighborhood) =>
                  setForm((f) => ({ ...f, neighborhood }))
                }
              />
              <div className="md:col-span-2">
                <Field
                  label="Adres"
                  value={form.addressLine}
                  onChange={(addressLine) =>
                    setForm((f) => ({ ...f, addressLine }))
                  }
                  required
                />
              </div>
              <Field
                label="Posta Kodu"
                value={form.postalCode}
                onChange={(postalCode) =>
                  setForm((f) => ({ ...f, postalCode }))
                }
                required
              />
            </div>
            <div className="mt-6 space-y-3">
              <ToggleCheck
                checked={Boolean(form.isDefaultShipping)}
                onChange={(isDefaultShipping) =>
                  setForm((f) => ({ ...f, isDefaultShipping }))
                }
                label="Varsayılan teslimat adresi"
              />
              <ToggleCheck
                checked={Boolean(form.isDefaultBilling)}
                onChange={(isDefaultBilling) =>
                  setForm((f) => ({ ...f, isDefaultBilling }))
                }
                label="Varsayılan fatura adresi"
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-cta px-8 py-3 text-xs disabled:opacity-50"
              >
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="btn-ghost px-8 py-3 text-xs"
              >
                İptal
              </button>
            </div>
          </form>
          </Reveal>
        ) : null}

        {!addresses.length ? (
          <Reveal>
          <div className="industrial-border p-8 font-meta text-xs uppercase text-secondary">
            Kayıtlı adres yok. Teslimat ve fatura için adres ekleyin.
          </div>
          </Reveal>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((addr, i) => (
              <Reveal key={addr.id} delay={i * 70} variant={i % 2 ? "right" : "left"}>
              <article
                className="panel-motion industrial-border bg-surface-container-low p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl">{addr.title}</h3>
                    <p className="mt-1 font-meta text-xs uppercase text-secondary">
                      {addr.fullName} · {addr.phone}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {addr.isDefaultShipping ? (
                      <span className="font-meta text-[10px] uppercase text-primary">
                        Teslimat
                      </span>
                    ) : null}
                    {addr.isDefaultBilling ? (
                      <span className="font-meta text-[10px] uppercase text-primary">
                        Fatura
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 font-meta text-xs leading-relaxed text-on-surface">
                  {addr.addressLine}
                  <br />
                  {addr.neighborhood ? `${addr.neighborhood}, ` : ""}
                  {addr.district} / {addr.city}
                  <br />
                  {addr.postalCode}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 border-t border-outline-variant/20 pt-4 font-meta text-[11px] uppercase">
                  {!addr.isDefaultShipping ? (
                    <button
                      type="button"
                      onClick={() => void setDefault(addr.id, "shipping")}
                      className="text-secondary underline hover:text-primary"
                    >
                      Varsayılan teslimat
                    </button>
                  ) : null}
                  {!addr.isDefaultBilling ? (
                    <button
                      type="button"
                      onClick={() => void setDefault(addr.id, "billing")}
                      className="text-secondary underline hover:text-primary"
                    >
                      Varsayılan fatura
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startEdit(addr)}
                    className="text-secondary underline hover:text-primary"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(addr.id)}
                    className="text-error underline"
                  >
                    Sil
                  </button>
                </div>
              </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16">
        <Reveal>
          <h2 className="mb-6 font-display text-2xl">Sipariş geçmişi</h2>
        </Reveal>
        {!orders.length ? (
          <Reveal delay={60}>
          <div className="industrial-border p-8 font-meta text-xs uppercase text-secondary">
            Henüz sipariş yok.{" "}
            <Link href="/urunler" className="text-primary underline">
              Koleksiyona git
            </Link>
          </div>
          </Reveal>
        ) : (
          <div className="divide-y divide-outline-variant/20 border border-outline-variant/20">
            {orders.map((order, i) => {
              const trackCode = order.shipments?.[0]?.trackingNumber;
              return (
              <Reveal key={order.id} delay={Math.min(i, 6) * 55} variant="fade">
              <div className="row-motion flex flex-col justify-between gap-4 px-5 py-5 hover:bg-surface-container-low md:flex-row md:items-center">
                <Link
                  href={`/hesabim/siparisler/${order.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-meta text-sm uppercase text-primary">
                      {order.orderNumber}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-2 font-meta text-[11px] uppercase text-secondary">
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("tr-TR")
                      : null}
                    {order.shippingProvider
                      ? ` · ${order.shippingProvider}`
                      : null}
                  </div>
                  <div className="mt-1 font-meta text-[11px] text-secondary">
                    {(order.items || [])
                      .map((it) => `${it.productName} ×${it.quantity}`)
                      .join(", ") || "—"}
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                  <div className="font-meta text-sm text-on-surface">
                    {formatMoney(order.total, order.currency)}
                  </div>
                  {trackCode ? (
                    <Link
                      href={`/takip/${encodeURIComponent(trackCode)}`}
                      className="font-meta text-[10px] uppercase tracking-widest text-primary underline"
                    >
                      Kargo takip
                    </Link>
                  ) : (
                    <Link
                      href={`/hesabim/siparisler/${order.id}`}
                      className="font-meta text-[10px] uppercase tracking-widest text-secondary underline hover:text-primary"
                    >
                      Detay
                    </Link>
                  )}
                </div>
              </div>
              </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {deleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Kapat"
            className="absolute inset-0 bg-deep-carbon/80"
            onClick={() => setDeleteId(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md border border-outline-variant/40 bg-surface-container-high p-6"
          >
            <p className="font-meta text-[10px] uppercase tracking-widest text-secondary">
              Onay
            </p>
            <h3 className="mt-2 font-display text-2xl">Adresi sil?</h3>
            <p className="mt-3 font-meta text-xs leading-relaxed text-secondary">
              {pendingDelete
                ? `"${pendingDelete.title}" kalıcı olarak silinecek.`
                : "Bu adres kalıcı olarak silinecek."}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="btn-ghost px-6 py-3 text-xs"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="bg-error px-6 py-3 font-meta text-xs uppercase text-deep-carbon disabled:opacity-50"
              >
                {deleting ? "Siliniyor…" : "Sil"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </div>
  );
}

function ToggleCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 font-meta text-xs uppercase text-secondary">
      <span
        className={`flex h-5 w-5 items-center justify-center border ${
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
