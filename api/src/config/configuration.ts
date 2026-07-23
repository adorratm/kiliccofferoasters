export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPort: parseInt(process.env.API_PORT || '4000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
  adminAllowlist: (process.env.ADMIN_ALLOWLIST || 'emrekilic19983@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'kilic',
    password: process.env.POSTGRES_PASSWORD || 'kilic_secret',
    name: process.env.POSTGRES_DB || 'kiliccoffeeroaster',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:4000/auth/google/callback',
    adminCallbackUrl:
      process.env.GOOGLE_ADMIN_CALLBACK_URL ||
      'http://localhost:4000/auth/google/admin/callback',
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || '',
    appSecret: process.env.FACEBOOK_APP_SECRET || '',
    callbackUrl:
      process.env.FACEBOOK_CALLBACK_URL ||
      'http://localhost:4000/auth/facebook/callback',
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || '',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    privateKey: process.env.APPLE_PRIVATE_KEY || '',
    callbackUrl:
      process.env.APPLE_CALLBACK_URL ||
      'http://localhost:4000/auth/apple/callback',
  },
  payment: {
    /** paytr | iyzico — boşsa PayTR bilgileri varsa paytr, değilse iyzico */
    provider: process.env.PAYMENT_PROVIDER || '',
  },
  paytr: {
    merchantId: process.env.PAYTR_MERCHANT_ID || '',
    merchantKey: process.env.PAYTR_MERCHANT_KEY || '',
    merchantSalt: process.env.PAYTR_MERCHANT_SALT || '',
    /** 1 = test modu */
    testMode: process.env.PAYTR_TEST_MODE || '1',
    debugOn: process.env.PAYTR_DEBUG_ON || '1',
    noInstallment: process.env.PAYTR_NO_INSTALLMENT || '0',
    maxInstallment: process.env.PAYTR_MAX_INSTALLMENT || '0',
    /** Yerel geliştirmede dış IP yoksa kullanılır */
    fallbackIp: process.env.PAYTR_FALLBACK_IP || '85.34.78.112',
  },
  iyzico: {
    apiKey: process.env.IYZICO_API_KEY || '',
    secretKey: process.env.IYZICO_SECRET_KEY || '',
    baseUrl:
      process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
  },
  aws: {
    region: process.env.AWS_REGION || 'eu-central-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
    cdnUrl: process.env.AWS_CDN_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  mail: {
    from:
      process.env.MAIL_FROM ||
      'Kılıç Coffee Roaster <info@kiliccoffeeroaster.com.tr>',
    host: process.env.MAIL_HOST || '',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    /** true = 465 SSL; false = 587 STARTTLS */
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
  },
  whatsapp: {
    /** console | meta — otomatik sipariş WhatsApp’ı için Meta Cloud API */
    provider: process.env.WHATSAPP_PROVIDER || 'console',
    /** İş / WhatsApp Business numarası */
    from: process.env.WHATSAPP_FROM || '+905412147963',
    metaToken: process.env.META_WA_TOKEN || '',
    metaPhoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
  },
  /** @deprecated SMS kaldırıldı */
  sms: {
    provider: process.env.SMS_PROVIDER || 'console',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFrom: process.env.TWILIO_FROM || '',
    netgsmUsercode: process.env.NETGSM_USERCODE || '',
    netgsmPassword: process.env.NETGSM_PASSWORD || '',
    netgsmMsgHeader: process.env.NETGSM_MSGHEADER || '',
  },
  bullBoard: {
    path: process.env.BULL_BOARD_PATH || '/admin/queues',
  },
  tax: {
    /** Türkiye B2C için varsayılan KDV % */
    ratePercent: parseFloat(process.env.TAX_RATE_PERCENT || '20'),
    /** true: fiyatlar KDV dahil; taxAmount içinden ayrıştırılır */
    included: process.env.TAX_INCLUDED !== 'false',
  },
  shipping: {
    freeOver: parseFloat(process.env.FREE_SHIPPING_OVER || '0'),
    defaultFee: parseFloat(process.env.DEFAULT_SHIPPING_FEE || '89.90'),
  },
  abandonedCart: {
    /** Sepet güncellenmeden kaç saat sonra hatırlatma (varsayılan 4) */
    hours: parseInt(process.env.ABANDONED_CART_HOURS || '4', 10),
  },
  marketplaceSync: {
    enabled: process.env.MARKETPLACE_SYNC_ENABLED !== 'false',
    /** Saatlik varsayılan; en az 5 dk */
    intervalMinutes: parseInt(
      process.env.MARKETPLACE_SYNC_INTERVAL_MINUTES || '60',
      10,
    ),
  },
  marketplace: {
    trendyol: {
      baseUrl:
        process.env.TRENDYOL_API_BASE_URL ||
        'https://apigw.trendyol.com/integration',
    },
    hepsiburada: {
      listingBaseUrl:
        process.env.HEPSIBURADA_LISTING_BASE_URL ||
        'https://listing-external.hepsiburada.com',
      omsBaseUrl:
        process.env.HEPSIBURADA_OMS_BASE_URL ||
        'https://oms-external.hepsiburada.com',
    },
    n11: {
      baseUrl: process.env.N11_API_BASE_URL || 'https://api.n11.com',
      integrator: process.env.N11_INTEGRATOR_NAME || 'KilicCoffeeRoaster',
    },
  },
  lowStock: {
    threshold: parseInt(process.env.LOW_STOCK_THRESHOLD || '10', 10),
    /** Virgülle ayrılmış ekstra alıcılar; boşsa admin allowlist + DB allowlist */
    alertEmails: (process.env.LOW_STOCK_ALERT_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
    scanIntervalHours: parseInt(
      process.env.LOW_STOCK_SCAN_INTERVAL_HOURS || '24',
      10,
    ),
  },
});
