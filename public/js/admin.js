function dashboard() {
  return {
    today: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    chartData: [],
    syncing: false,
    syncResult: null,
    syncError: '',

    get chartMax() {
      return Math.max(...this.chartData.map((d) => d.revenue), 1);
    },
    get chart7DayTotal() {
      return this.chartData.reduce((s, d) => s + d.revenue, 0);
    },
    get chartDailyAvg() {
      const days = this.chartData.filter((d) => d.revenue > 0).length || 1;
      return Math.round(this.chart7DayTotal / days);
    },
    get chartPeakDay() {
      if (!this.chartData.length) return '—';
      const peak = this.chartData.reduce((a, b) => (b.revenue > a.revenue ? b : a));
      return peak.revenue > 0 ? peak.date : '—';
    },

    init() {
      if (typeof DASHBOARD_DATA !== 'undefined' && DASHBOARD_DATA.last7Days) {
        this.chartData = DASHBOARD_DATA.last7Days;
      }
    },
    barPct(revenue) {
      return Math.max(Math.round((revenue / this.chartMax) * 100), revenue > 0 ? 5 : 1);
    },
    fmtK(n) {
      if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      return String(n);
    },
    async syncS3() {
      this.syncing = true;
      this.syncResult = null;
      this.syncError = '';
      try {
        const res = await fetch('/api/upload/sync-s3', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + getCookie('admin_token') },
        });
        const data = await res.json();
        if (res.ok) {
          this.syncResult = data;
        } else {
          this.syncError = data.message || 'Sync failed';
        }
      } catch {
        this.syncError = 'Connection error';
      }
      this.syncing = false;
    },
  };
}

function getCookie(name) {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + getCookie('admin_token'),
  };
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) return;
  await fetch(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() });
  window.location.reload();
}

function productForm() {
  return {
    form: {
      name: '', nameEn: '', description: '', price: 0, discountPrice: null,
      images: [], category: '', productCode: '', stock: 999,
      status: 'active', isFlashSale: false, isFeatured: false,
    },
    pendingFiles: [],
    previewUrls: [],
    imageLibrary: [],
    selectedExistingImage: '',
    loadingLibrary: false,
    saving: false,
    uploading: false,
    error: '',
    success: '',
    get selectedLibraryImage() {
      return this.imageLibrary.find((img) => img.url === this.selectedExistingImage) || null;
    },
    init() {
      if (typeof EDIT_PRODUCT !== 'undefined' && EDIT_PRODUCT) {
        this.form = {
          name: EDIT_PRODUCT.name || '',
          nameEn: EDIT_PRODUCT.nameEn || '',
          description: EDIT_PRODUCT.description || '',
          price: EDIT_PRODUCT.price || 0,
          discountPrice: EDIT_PRODUCT.discountPrice || null,
          images: [...(EDIT_PRODUCT.images || [])],
          category: EDIT_PRODUCT.category?._id || EDIT_PRODUCT.category || '',
          productCode: EDIT_PRODUCT.productCode || '',
          stock: EDIT_PRODUCT.stock ?? 999,
          status: EDIT_PRODUCT.status || 'active',
          isFlashSale: EDIT_PRODUCT.isFlashSale || false,
          isFeatured: EDIT_PRODUCT.isFeatured || false,
        };
      }

      if (typeof INITIAL_IMAGE_LIBRARY !== 'undefined' && Array.isArray(INITIAL_IMAGE_LIBRARY)) {
        this.imageLibrary = INITIAL_IMAGE_LIBRARY;
      }

      if (!this.imageLibrary.length) {
        this.loadImageLibrary();
      }
    },
    async loadImageLibrary() {
      this.loadingLibrary = true;
      try {
        const res = await fetch('/api/upload/library', {
          headers: { Authorization: 'Bearer ' + getCookie('admin_token') },
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.images)) {
          this.imageLibrary = data.images;
        }
      } catch (e) {
        // Ignore library fetch errors to keep product form usable.
      }
      this.loadingLibrary = false;
    },
    addExistingImage() {
      const selectedUrl = this.selectedExistingImage;
      if (!selectedUrl) return;
      if (!this.form.images.includes(selectedUrl)) {
        this.form.images.push(selectedUrl);
      }
      this.selectedExistingImage = '';
    },
    onFileSelect(event) {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      for (const file of files) {
        this.pendingFiles.push(file);
        this.previewUrls.push(URL.createObjectURL(file));
      }
      event.target.value = '';
    },
    removePending(i) {
      URL.revokeObjectURL(this.previewUrls[i]);
      this.previewUrls.splice(i, 1);
      this.pendingFiles.splice(i, 1);
    },
    clearPendingUploads() {
      this.previewUrls.forEach((u) => URL.revokeObjectURL(u));
      this.pendingFiles = [];
      this.previewUrls = [];
      if (this.$refs.imageInput) this.$refs.imageInput.value = '';
    },
    async save() {
      if (!this.form.name || !this.form.price) {
        this.error = 'Name and price are required';
        return;
      }
      this.saving = true;
      this.error = '';
      this.success = '';

      const isEdit = typeof EDIT_PRODUCT !== 'undefined' && EDIT_PRODUCT;
      const url = isEdit ? `/api/products/${EDIT_PRODUCT._id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      try {
        if (this.pendingFiles.length) {
          this.uploading = true;
          const formData = new FormData();
          for (const file of this.pendingFiles) formData.append('files', file);
          const upRes = await fetch('/api/upload/multiple', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + getCookie('admin_token') },
            body: formData,
          });
          const upData = await upRes.json();
          if (!upRes.ok) {
            throw new Error(upData.message || 'Image upload failed');
          }
          if (upData.urls && upData.urls.length) {
            this.form.images.push(...upData.urls);
          }
          this.clearPendingUploads();
          this.uploading = false;
        }

        const res = await fetch(url, {
          method,
          headers: authHeaders(),
          body: JSON.stringify(this.form),
        });
        const data = await res.json();
        if (data._id) {
          this.success = isEdit ? 'Product updated!' : 'Product created!';
          if (!isEdit) window.location.href = '/admin/products';
        } else {
          this.error = data.message || 'Save failed';
        }
      } catch (e) {
        this.error = e.message || 'Connection error';
        this.uploading = false;
      }
      this.saving = false;
    },
  };
}

function categoryManager() {
  return {
    showForm: false,
    editId: null,
    form: { name: '', slug: '', image: '' },
    editCategory(cat) {
      this.editId = cat._id;
      this.form = { name: cat.name, slug: cat.slug, image: cat.image || '' };
      this.showForm = true;
    },
    async saveCategory() {
      if (!this.form.name) return;
      const url = this.editId ? `/api/categories/${this.editId}` : '/api/categories';
      const method = this.editId ? 'PUT' : 'POST';
      await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(this.form) });
      window.location.reload();
    },
    async deleteCategory(id) {
      if (!confirm('Delete this category?')) return;
      await fetch(`/api/categories/${id}`, { method: 'DELETE', headers: authHeaders() });
      window.location.reload();
    },
  };
}

function settingsPage() {
  return {
    form: {
      siteName: '', announcementBar: '', contactPhone: '', contactEmail: '',
      address: '', metaPixelId: '',
      socialLinks: { facebook: '', instagram: '', youtube: '' },
      deliveryChargeDhakaInside: 130, deliveryChargeDhakaOutside: 100, deliveryChargeExpress: 60,
      freeDelivery: false,
    },
    saving: false,
    success: '',
    init() {
      if (typeof CURRENT_SETTINGS !== 'undefined' && CURRENT_SETTINGS) {
        this.form = {
          siteName: CURRENT_SETTINGS.siteName || '',
          announcementBar: CURRENT_SETTINGS.announcementBar || '',
          contactPhone: CURRENT_SETTINGS.contactPhone || '',
          contactEmail: CURRENT_SETTINGS.contactEmail || '',
          address: CURRENT_SETTINGS.address || '',
          metaPixelId: CURRENT_SETTINGS.metaPixelId || '',
          socialLinks: CURRENT_SETTINGS.socialLinks || { facebook: '', instagram: '', youtube: '' },
          deliveryChargeDhakaInside: CURRENT_SETTINGS.deliveryChargeDhakaInside || 130,
          deliveryChargeDhakaOutside: CURRENT_SETTINGS.deliveryChargeDhakaOutside || 100,
          deliveryChargeExpress: CURRENT_SETTINGS.deliveryChargeExpress || 60,
          freeDelivery: CURRENT_SETTINGS.freeDelivery || false,
        };
      }
    },
    async save() {
      this.saving = true;
      this.success = '';
      await fetch('/api/settings', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(this.form),
      });
      this.success = 'Settings saved!';
      this.saving = false;
    },
  };
}
