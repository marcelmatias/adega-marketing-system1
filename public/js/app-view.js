const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

async function api(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = { ...options.headers };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    const res = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    if (res.redirected && res.url.includes('/login')) {
      window.location.href = '/login';
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Erro de conexao. Verifique o servidor.');
    }
    throw err;
  }
}

function formatMoney(v) {
  return 'R$ ' + (v || 0).toFixed(2).replace('.', ',');
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast-container');
  if (existing) existing.remove();
  const container = document.createElement('div');
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  container.innerHTML = `
    <div class="toast show align-items-center text-bg-${type === 'error' ? 'danger' : 'success'} border-0">
      <div class="d-flex"><div class="toast-body">${msg}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>
    </div>`;
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3000);
}
