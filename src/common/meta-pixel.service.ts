import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MetaPixelBundle = {
  pixelScript: string;
  eventTracker: string;
  isConfigured: boolean;
};

@Injectable()
export class MetaPixelService {
  constructor(private readonly config: ConfigService) {}

  /** Meta Pixel IDs are numeric strings (extract digits if user pasted extra text) */
  private normalizePixelId(raw: string | undefined | null): string {
    if (raw == null || typeof raw !== 'string') return '';
    const digits = raw.replace(/\D/g, '');
    if (!/^\d{5,20}$/.test(digits)) return '';
    return digits;
  }

  private resolvePixelId(override?: string | null): string {
    const fromSettings = this.normalizePixelId(override);
    if (fromSettings) return fromSettings;
    const fromEnv = this.normalizePixelId(this.config.get<string>('META_PIXEL_ID'));
    return fromEnv;
  }

  getBundle(settingsPixelId?: string | null): MetaPixelBundle {
    const pixelId = this.resolvePixelId(settingsPixelId ?? undefined);
    if (!pixelId) {
      return { pixelScript: '', eventTracker: '', isConfigured: false };
    }
    return {
      pixelScript: this.buildPixelScript(pixelId),
      eventTracker: this.buildEventTracker(pixelId),
      isConfigured: true,
    };
  }

  isConfigured(settingsPixelId?: string | null): boolean {
    return !!this.resolvePixelId(settingsPixelId ?? undefined);
  }

  private buildPixelScript(pixelId: string): string {
    return `
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" /></noscript>
<!-- End Meta Pixel Code -->
`.trim();
  }

  private buildEventTracker(_pixelId: string): string {
    return `
<script>
(function() {
  function safeFbq() {
    if (typeof fbq === 'function') fbq.apply(null, arguments);
  }
  window.trackViewContent = function(product) {
    if (!product) return;
    var id = String(product.id != null ? product.id : '');
    var price = parseFloat(product.price);
    if (isNaN(price)) price = 0;
    safeFbq('track', 'ViewContent', {
      content_name: String(product.name || ''),
      content_ids: id ? [id] : [],
      content_type: 'product',
      value: price,
      currency: 'BDT'
    });
  };
  window.trackAddToCart = function(product, quantity) {
    if (!product) return;
    var qty = parseInt(quantity, 10) || 1;
    var id = String(product.id != null ? product.id : '');
    var price = parseFloat(product.price);
    if (isNaN(price)) price = 0;
    safeFbq('track', 'AddToCart', {
      content_name: String(product.name || ''),
      content_ids: id ? [id] : [],
      content_type: 'product',
      value: price * qty,
      currency: 'BDT',
      contents: id ? [{ id: id, quantity: qty }] : [],
      content_quantity: qty
    });
  };
  window.trackInitiateCheckout = function(cart) {
    if (!cart) return;
    var n = parseInt(cart.totalItems, 10) || 0;
    var sub = parseFloat(cart.subtotal);
    if (isNaN(sub)) sub = 0;
    safeFbq('track', 'InitiateCheckout', {
      content_type: 'product',
      num_items: n,
      value: sub,
      currency: 'BDT'
    });
  };
  window.trackPurchase = function(order) {
    if (!order || !order.items) return;
    var ids = order.items.map(function(i) { return String(i.productId != null ? i.productId : ''); }).filter(Boolean);
    safeFbq('track', 'Purchase', {
      value: parseFloat(order.total) || 0,
      currency: 'BDT',
      content_type: 'product',
      content_ids: ids,
      num_items: order.items.reduce(function(s, i) { return s + (parseInt(i.quantity, 10) || 0); }, 0),
      content_name: order.items.map(function(i) { return i.name; }).filter(Boolean).join(', ')
    });
  };
  window.trackSearch = function(searchQuery) {
    if (searchQuery == null || searchQuery === '') return;
    safeFbq('track', 'Search', { search_string: String(searchQuery) });
  };
})();
</script>
`.trim();
  }
}
