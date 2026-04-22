function adminLoginForm() {
  return {
    username: '',
    password: '',
    error: '',
    loading: false,
    async submitLogin() {
      this.loading = true;
      this.error = '';
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }),
        });
        const text = await res.text();
        let data = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            this.error = text.slice(0, 200) || `Server returned ${res.status}`;
            return;
          }
        }
        if (res.ok && data.token) {
          document.cookie =
            'admin_token=' +
            encodeURIComponent(data.token) +
            '; path=/; max-age=604800; SameSite=Lax';
          window.location.href = '/admin';
          return;
        }
        const msg = data.message;
        this.error = Array.isArray(msg)
          ? msg.join(', ')
          : msg || `Login failed (${res.status})`;
      } catch (e) {
        this.error =
          e instanceof TypeError && e.message === 'Failed to fetch'
            ? 'Cannot reach server. Is the app running?'
            : e instanceof Error
              ? e.message
              : 'Connection error';
      } finally {
        this.loading = false;
      }
    },
  };
}
