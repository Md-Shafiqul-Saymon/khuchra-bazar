function getCookie(name) {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}

// Fly a small dot from source element to the cart icon
function flyToCart(sourceEl) {
  const cartLink = document.querySelector('a[href="/cart"]');
  if (!cartLink || !sourceEl) return;

  const fromRect = sourceEl.getBoundingClientRect();
  const toRect   = cartLink.getBoundingClientRect();

  const dot = document.createElement('div');
  const startX = fromRect.left + fromRect.width / 2 - 12;
  const startY = fromRect.top  + fromRect.height / 2 - 12;

  Object.assign(dot.style, {
    position: 'fixed',
    left: startX + 'px',
    top: startY + 'px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#e11d48',
    zIndex: '9999',
    pointerEvents: 'none',
    transition: 'left 0.55s cubic-bezier(0.25,0.46,0.45,0.94), top 0.55s cubic-bezier(0.25,0.46,0.45,0.94), width 0.55s ease, height 0.55s ease, opacity 0.3s ease 0.3s',
    opacity: '0.9',
    boxShadow: '0 2px 8px rgba(225,29,72,0.5)',
  });
  document.body.appendChild(dot);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    Object.assign(dot.style, {
      left:    (toRect.left + toRect.width  / 2 - 6) + 'px',
      top:     (toRect.top  + toRect.height / 2 - 6) + 'px',
      width:   '12px',
      height:  '12px',
      opacity: '0',
    });
  }));

  setTimeout(() => dot.remove(), 650);

  // Bounce the cart icon
  const cartIcon = cartLink.querySelector('svg');
  if (cartIcon) {
    cartIcon.style.transition = 'transform 0.15s';
    setTimeout(() => { cartIcon.style.transform = 'scale(1.35)'; }, 450);
    setTimeout(() => { cartIcon.style.transform = 'scale(1)'; }, 600);
  }
}

const SPINNER = '<svg style="display:inline;vertical-align:middle;animation:spin 0.7s linear infinite" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="48" stroke-dashoffset="36"/></svg>';

// Inject the spin keyframe once
(function() {
  if (document.getElementById('_app_spin')) return;
  const s = document.createElement('style');
  s.id = '_app_spin';
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
})();

async function addToCart(productId, quantity = 1, btn = null) {
  const safeQty = Math.max(1, parseInt(quantity, 10) || 1);

  // Loading state
  let origHTML = '';
  if (btn) {
    origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = SPINNER + ' যোগ হচ্ছে...';
    btn.style.opacity = '0.75';
  }

  // Ensure loading state is visible for at least 500ms
  const minDelay = new Promise(r => setTimeout(r, 500));

  try {
    const [res] = await Promise.all([
      fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: safeQty }),
      }),
      minDelay,
    ]);
    const data = await res.json();

    // Fly animation from the button's card image
    if (btn) {
      const card = btn.closest('.group, [class*="rounded"]');
      const img  = card ? card.querySelector('img') : btn;
      flyToCart(img || btn);
    }

    updateCartBadge(data.totalItems);

    // Success state on button
    if (btn) {
      btn.innerHTML = '✓ যোগ হয়েছে!';
      btn.style.opacity = '1';
      setTimeout(() => {
        btn.innerHTML  = origHTML;
        btn.disabled   = false;
        btn.style.opacity = '';
      }, 1600);
    } else {
      showToast('কার্টে যোগ হয়েছে!');
    }

    if (typeof window.trackAddToCart === 'function') {
      const priceEl = document.querySelector('[data-product-price]');
      const nameEl  = document.querySelector('[data-product-name]');
      const raw = priceEl?.getAttribute('data-product-price') ?? priceEl?.textContent ?? '0';
      window.trackAddToCart({
        id: productId,
        name: nameEl ? nameEl.textContent.trim() : 'Product',
        price: parseFloat(String(raw).replace(/[^\d.]/g, '')) || 0,
      }, safeQty);
    }
  } catch (e) {
    if (btn) {
      btn.innerHTML  = origHTML;
      btn.disabled   = false;
      btn.style.opacity = '';
    }
    showToast('সমস্যা হয়েছে, আবার চেষ্টা করুন', true);
  }
}

async function buyNow(productId, quantity = 1, btn = null) {
  const safeQty = Math.max(1, parseInt(quantity, 10) || 1);

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = SPINNER + ' অপেক্ষা করুন...';
  }

  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity: safeQty }),
    });
    await res.json();

    if (typeof window.trackAddToCart === 'function') {
      const priceEl = document.querySelector('[data-product-price]');
      const nameEl  = document.querySelector('[data-product-name]');
      const raw = priceEl?.getAttribute('data-product-price') ?? priceEl?.textContent ?? '0';
      window.trackAddToCart({
        id: productId,
        name: nameEl ? nameEl.textContent.trim() : 'Product',
        price: parseFloat(String(raw).replace(/[^\d.]/g, '')) || 0,
      }, safeQty);
    }

    window.location.href = '/checkout';
  } catch (e) {
    if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
    showToast('সমস্যা হয়েছে', true);
  }
}

function updateCartBadge(count) {
  document.querySelectorAll('[data-cart-count]').forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
    if (count > 0) {
      b.style.transition = 'transform 0.15s';
      b.style.transform = 'scale(1.4)';
      setTimeout(() => { b.style.transform = 'scale(1)'; }, 200);
    }
  });
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
        const res  = await fetch('/api/cart');
        const data = await res.json();
        this.items    = data.items    || [];
        this.subtotal = data.subtotal || 0;
      } catch (e) {}
      this.loading = false;
    },
    async updateQty(productId, quantity) {
      if (quantity < 1) return this.removeItem(productId);
      const res  = await fetch(`/api/cart/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      this.items    = data.items    || [];
      this.subtotal = data.subtotal || 0;
    },
    async removeItem(productId) {
      const res  = await fetch(`/api/cart/${productId}`, { method: 'DELETE' });
      const data = await res.json();
      this.items    = data.items    || [];
      this.subtotal = data.subtotal || 0;
    },
  };
}

function checkoutPage() {
  return {
    form: {
      customerName:    '',
      customerPhone:   '',
      customerAddress: '',
      deliveryArea:    'dhaka-inside',
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
        const res  = await fetch('/api/orders', {
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
