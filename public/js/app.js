function getCookie(name) {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}

async function addToCart(productId) {
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const data = await res.json();
    updateCartBadge(data.totalItems);
    showToast('কার্টে যোগ হয়েছে!');

    if (typeof window.trackAddToCart === 'function') {
      const priceEl = document.querySelector('[data-product-price]');
      const nameEl = document.querySelector('[data-product-name]');
      const rawPrice = priceEl?.getAttribute('data-product-price') ?? priceEl?.textContent ?? '0';
      window.trackAddToCart({
        id: productId,
        name: nameEl ? nameEl.textContent.trim() : 'Product',
        price: parseFloat(String(rawPrice).replace(/[^\d.]/g, '')) || 0,
      }, 1);
    }
  } catch (e) {
    showToast('সমস্যা হয়েছে, আবার চেষ্টা করুন', true);
  }
}

async function buyNow(productId) {
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    
    // Meta Pixel: Track AddToCart
    if (typeof window.trackAddToCart === 'function') {
      const priceEl = document.querySelector('[data-product-price]');
      const nameEl = document.querySelector('[data-product-name]');
      const rawPrice = priceEl?.getAttribute('data-product-price') ?? priceEl?.textContent ?? '0';
      window.trackAddToCart({
        id: productId,
        name: nameEl ? nameEl.textContent.trim() : 'Product',
        price: parseFloat(String(rawPrice).replace(/[^\d.]/g, '')) || 0,
      }, 1);
    }

    window.location.href = '/checkout';
  } catch (e) {
    showToast('সমস্যা হয়েছে', true);
  }
}

function updateCartBadge(count) {
  const badges = document.querySelectorAll('[data-cart-count]');
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
  const headerBadge = document.querySelector('a[href="/cart"] .absolute');
  if (headerBadge) {
    headerBadge.textContent = count;
    headerBadge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function showToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.className = `fixed bottom-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all duration-300 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function cartPage() {
  return {
    items: [],
    subtotal: 0,
    loading: true,
    async loadCart() {
      try {
        const res = await fetch('/api/cart');
        const data = await res.json();
        this.items = data.items || [];
        this.subtotal = data.subtotal || 0;
      } catch (e) {}
      this.loading = false;
    },
    async updateQty(productId, quantity) {
      if (quantity < 1) return this.removeItem(productId);
      const res = await fetch(`/api/cart/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      this.items = data.items || [];
      this.subtotal = data.subtotal || 0;
    },
    async removeItem(productId) {
      const res = await fetch(`/api/cart/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      this.items = data.items || [];
      this.subtotal = data.subtotal || 0;
    },
  };
}

function checkoutPage() {
  return {
    form: {
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      deliveryArea: 'dhaka-inside',
    },
    loading: false,
    error: '',
    get deliveryCharge() {
      return (typeof DELIVERY_CHARGES !== 'undefined' && DELIVERY_CHARGES[this.form.deliveryArea]) || 130;
    },
    async placeOrder() {
      this.error = '';
      if (!this.form.customerName || !this.form.customerPhone || !this.form.customerAddress) {
        this.error = 'সব তথ্য পূরণ করুন';
        return;
      }
      this.loading = true;

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form),
        });
        const data = await res.json();
        if (data.success && data.order) {
          window.location.href = '/order-success/' + data.order._id;
        } else {
          this.error = data.message || 'অর্ডার করতে সমস্যা হয়েছে';
        }
      } catch (e) {
        this.error = 'সংযোগে সমস্যা হয়েছে';
      }
      this.loading = false;
    },
  };
}
