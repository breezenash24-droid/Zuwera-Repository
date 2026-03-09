/* =============================================
   ZUWERA — main.js
   ============================================= */

// --- State ---
let cart = []; // { name, price }

// --- DOM refs ---
const cartCountEl   = document.querySelector('.cart-count');
const toastEl       = document.getElementById('toast');

const loginModal    = document.getElementById('login-modal');
const cartModal     = document.getElementById('cart-modal');

const loginBtn      = document.getElementById('login-btn');
const cartBtn       = document.getElementById('cart-btn');

const loginSubmit   = document.getElementById('login-submit');
const loginError    = document.getElementById('login-error');

const cartItemsEl   = document.getElementById('cart-items');
const cartTotalEl   = document.getElementById('cart-total');
const checkoutBtn   = document.getElementById('checkout-btn');

// --- Toast helper ---
let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// --- Cart helpers ---
function updateCartCount() {
  cartCountEl.textContent = cart.length;
}

function renderCart() {
  cartItemsEl.innerHTML = '';
  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<li style="color:#888;padding:1rem 0;text-align:center;">Your cart is empty.</li>';
    cartTotalEl.textContent = '0';
    return;
  }
  let total = 0;
  cart.forEach((item, idx) => {
    total += item.price;
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="item-name">${item.name}</span>
      <span class="item-price">$${item.price}</span>
      <button class="remove-item" data-idx="${idx}" aria-label="Remove ${item.name}">✕</button>
    `;
    cartItemsEl.appendChild(li);
  });
  cartTotalEl.textContent = total;
}

// --- Add to Cart ---
document.querySelectorAll('.add-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const name  = btn.dataset.name;
    const price = parseInt(btn.dataset.price, 10);
    cart.push({ name, price });
    updateCartCount();
    showToast(`${name} added to cart`);
  });
});

// --- Remove from Cart (delegated) ---
cartItemsEl.addEventListener('click', e => {
  const removeBtn = e.target.closest('.remove-item');
  if (!removeBtn) return;
  const idx = parseInt(removeBtn.dataset.idx, 10);
  const removed = cart.splice(idx, 1)[0];
  updateCartCount();
  renderCart();
  showToast(`${removed.name} removed`);
});

// --- Checkout ---
checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }
  cart = [];
  updateCartCount();
  renderCart();
  closeModal(cartModal);
  showToast('Order placed! Thank you 🎉');
});

// --- Modal helpers ---
function openModal(modal) {
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

// --- Login Modal ---
loginBtn.addEventListener('click', () => openModal(loginModal));

loginModal.querySelector('.close').addEventListener('click', () => closeModal(loginModal));

loginSubmit.addEventListener('click', () => {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  loginError.textContent = '';

  if (!email || !password) {
    loginError.textContent = 'Please fill in all fields.';
    return;
  }
  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    loginError.textContent = 'Please enter a valid email address.';
    return;
  }
  if (password.length < 6) {
    loginError.textContent = 'Password must be at least 6 characters.';
    return;
  }
  // Simulate login success
  closeModal(loginModal);
  showToast('Logged in successfully!');
});

// --- Cart Modal ---
cartBtn.addEventListener('click', () => {
  renderCart();
  openModal(cartModal);
});

document.getElementById('cart-close').addEventListener('click', () => closeModal(cartModal));

// --- Close modals on backdrop click ---
[loginModal, cartModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal(modal);
  });
});

// --- Close modals on Escape key ---
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal(loginModal);
    closeModal(cartModal);
  }
});
