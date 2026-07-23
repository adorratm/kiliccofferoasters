import { User } from '@entities/user.entity';
import { AdminAllowlist } from '@entities/admin-allowlist.entity';
import { Address } from '@entities/address.entity';
import { Category } from '@entities/category.entity';
import { Product } from '@entities/product.entity';
import { ProductVariant } from '@entities/product-variant.entity';
import { Cart } from '@entities/cart.entity';
import { CartItem } from '@entities/cart-item.entity';
import { Order } from '@entities/order.entity';
import { OrderItem } from '@entities/order-item.entity';
import { ReturnRequest } from '@entities/return-request.entity';
import { Payment } from '@entities/payment.entity';
import { Shipment } from '@entities/shipment.entity';
import { ShippingProviderConfig } from '@entities/shipping-provider-config.entity';
import { MarketplaceAccount } from '@entities/marketplace-account.entity';
import { MarketplaceListing } from '@entities/marketplace-listing.entity';
import { MarketplaceOrder } from '@entities/marketplace-order.entity';
import { LegalDocument } from '@entities/legal-document.entity';
import { CookieConsentLog } from '@entities/cookie-consent-log.entity';
import { ContactMessage } from '@entities/contact-message.entity';
import { NewsletterSubscriber } from '@entities/newsletter-subscriber.entity';
import { MediaAsset } from '@entities/media-asset.entity';
import { SiteSetting } from '@entities/site-setting.entity';
import { ContentSection } from '@entities/content-section.entity';
import { NotificationLog } from '@entities/notification-log.entity';
import { BlogPost } from '@entities/blog-post.entity';
import { Coupon } from '@entities/coupon.entity';
import { CouponRedemption } from '@entities/coupon-redemption.entity';
import { ProductReview } from '@entities/product-review.entity';
import { WishlistItem } from '@entities/wishlist-item.entity';
import { Campaign } from '@entities/campaign.entity';

export const ALL_ENTITIES = [
  User,
  AdminAllowlist,
  Address,
  Category,
  Product,
  ProductVariant,
  Cart,
  CartItem,
  Order,
  OrderItem,
  ReturnRequest,
  Payment,
  Shipment,
  ShippingProviderConfig,
  MarketplaceAccount,
  MarketplaceListing,
  MarketplaceOrder,
  LegalDocument,
  CookieConsentLog,
  ContactMessage,
  NewsletterSubscriber,
  MediaAsset,
  SiteSetting,
  ContentSection,
  NotificationLog,
  BlogPost,
  Coupon,
  CouponRedemption,
  ProductReview,
  WishlistItem,
  Campaign,
];
