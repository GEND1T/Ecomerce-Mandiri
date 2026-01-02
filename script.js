// GANTI DENGAN URL APPS SCRIPT ANDA
const API_URL = 'https://script.google.com/macros/s/AKfycbxO7O0mUZe79JLYvwwx4KtlouINdluBu1UaOR7dNjOGAGpjsH0mEwyPHaGdLgBxotnUsw/exec'; 

let cart = [];
let allProducts = [];
let currentCategory = 'Semua';

// --- FUNGSI TOAST NOTIFICATION (PENGGANTI ALERT) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    // Buat elemen div baru
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    // Masukkan ke container
    container.appendChild(toast);

    // Hapus otomatis setelah 3 detik
    setTimeout(() => {
        toast.classList.add('hide'); // Memicu animasi keluar
        
        // Hapus elemen dari DOM setelah animasi selesai
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// 1. LOAD DATA
async function loadProducts() {
    const container = document.getElementById('product-container');
    container.innerHTML = '<p style="text-align:center;">Sedang memuat produk...</p>';
    
    try {
        const response = await fetch(API_URL);
        allProducts = await response.json();
        
        setupCategories();
        renderProducts(allProducts);

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="text-align:center;">Gagal memuat data.</p>';
        showToast('Gagal memuat data produk', 'error');
    }
}

// 2. KATEGORI & SEARCH
function setupCategories() {
    const categories = ['Semua', ...new Set(allProducts.map(p => p.kategori || 'Lainnya'))];
    const catContainer = document.getElementById('category-filter');
    catContainer.innerHTML = '';

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = (cat === 'Semua') ? 'cat-btn active' : 'cat-btn';
        btn.innerText = cat;
        btn.onclick = () => filterByCategory(cat, btn);
        catContainer.appendChild(btn);
    });
}

function filterByCategory(category, btnElement) {
    currentCategory = category;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    applyFilters();
}

function searchProducts() { applyFilters(); }

function applyFilters() {
    const keyword = document.getElementById('search-input').value.toLowerCase();
    const filtered = allProducts.filter(product => {
        const prodCat = product.kategori || 'Lainnya';
        const isCatMatch = (currentCategory === 'Semua') || (prodCat === currentCategory);
        const isNameMatch = product.nama_produk.toLowerCase().includes(keyword);
        return isCatMatch && isNameMatch;
    });
    renderProducts(filtered);
}

// 3. RENDER PRODUK
function renderProducts(productsToRender) {
    const container = document.getElementById('product-container');
    container.innerHTML = '';

    if (productsToRender.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Produk tidak ditemukan.</p>';
        return;
    }

    productsToRender.forEach((product) => {
        const originalIndex = allProducts.indexOf(product);
        let gambarUrl = product.gambar || 'https://via.placeholder.com/300?text=No+Image';
        const hargaIndo = formatRupiah(product.harga);
        const cardId = `product-${originalIndex}`;
        
        const stok = parseInt(product.stok) || 0;
        const isHabis = (stok <= 0);
        const cardClass = isHabis ? 'card out-of-stock' : 'card';
        const badgeHabis = isHabis ? '<div class="badge-habis">HABIS</div>' : '';

        let stockText = '';
        if(!isHabis) {
            const lowStockClass = (stok < 5) ? 'stock-info low' : 'stock-info';
            stockText = `<div class="${lowStockClass}">Stok: ${stok}</div>`;
        }

        let actionHTML = isHabis ? `<span class="text-habis">Stok Habis</span>` : `
            <button class="btn-initial" onclick="toggleMode('${cardId}', true)">+ Tambah</button>
            <div class="qty-control">
                <button class="btn-qty" onclick="updateQtyDisplay('${cardId}', -1, ${stok})">-</button>
                <span class="qty-val">1</span>
                <button class="btn-qty" onclick="updateQtyDisplay('${cardId}', 1, ${stok})">+</button>
                <button class="btn-confirm" onclick="confirmAddToCart(${originalIndex}, '${cardId}')">Beli</button>
            </div>
        `;

        const card = document.createElement('div');
        card.className = cardClass;
        card.innerHTML = `
            <div class="img-wrapper">
                ${badgeHabis}
                <img src="${gambarUrl}" alt="${product.nama_produk}" loading="lazy">
            </div>
            <h3>${product.nama_produk}</h3>
            <p class="desc">${product.deskripsi}</p>
            ${stockText}
            <h4 class="price">${hargaIndo}</h4>
            <div class="action-area" id="${cardId}">${actionHTML}</div>
        `;
        container.appendChild(card);
    });
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

function toggleMode(cardId, showControl) {
    const area = document.getElementById(cardId);
    if(!area) return;
    area.querySelector('.btn-initial').style.display = showControl ? 'none' : 'block';
    area.querySelector('.qty-control').style.display = showControl ? 'flex' : 'none';
    if(showControl) area.querySelector('.qty-val').innerText = '1';
}

function updateQtyDisplay(cardId, change, maxStock) {
    const qtyVal = document.getElementById(cardId).querySelector('.qty-val');
    let currentQty = parseInt(qtyVal.innerText);
    let newQty = currentQty + change;
    if (newQty < 1) { toggleMode(cardId, false); return; }
    
    // Ganti Alert dengan Toast
    if (newQty > maxStock) { 
        showToast(`Maaf, stok hanya tersisa ${maxStock}`, 'error'); 
        return; 
    }
    
    qtyVal.innerText = newQty;
}

// --- LOGIKA KERANJANG & CHECKOUT ---

function confirmAddToCart(productIndex, cardId) {
    const product = allProducts[productIndex];
    const area = document.getElementById(cardId);
    const qtyToAdd = parseInt(area.querySelector('.qty-val').innerText);
    const stokTersedia = parseInt(product.stok) || 0;
    
    const existingItem = cart.find(item => item.nama === product.nama_produk);
    const currentInCart = existingItem ? existingItem.qty : 0;

    // Ganti Alert dengan Toast
    if (currentInCart + qtyToAdd > stokTersedia) {
        showToast(`Stok kurang! Sisa: ${stokTersedia}. (Di keranjang: ${currentInCart})`, 'error');
        toggleMode(cardId, false);
        return;
    }

    if (existingItem) {
        existingItem.qty += qtyToAdd;
    } else {
        cart.push({
            nama: product.nama_produk,
            harga: product.harga,
            qty: qtyToAdd,
            maxStok: stokTersedia
        });
    }

    renderCartItems();
    calculateTotal();
    toggleMode(cardId, false);
    
    // Tambahkan notifikasi Sukses
    showToast(`Berhasil menambahkan ${qtyToAdd}x ${product.nama_produk}`, 'success');
}

function changeCartQty(index, change) {
    const item = cart[index];
    const newQty = item.qty + change;
    
    // Ganti Alert dengan Toast
    if (change > 0 && newQty > item.maxStok) { 
        showToast(`Maksimal stok tercapai (${item.maxStok})`, 'error'); 
        return; 
    }
    
    item.qty = newQty;
    if (item.qty <= 0) cart.splice(index, 1);
    
    renderCartItems();
    calculateTotal();
}

function renderCartItems() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartCountSpan = document.getElementById('cart-count');
    
    cartCountSpan.innerText = cart.length; 
    cartItemsDiv.innerHTML = '';

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="text-align:center; color:#888;">Keranjang kosong.</p>';
        return;
    }

    cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <div class="cart-info">
                <h4>${item.nama}</h4>
                <small>${formatRupiah(item.harga)} x ${item.qty}</small>
            </div>
            <div class="cart-controls">
                <button onclick="changeCartQty(${index}, -1)">-</button>
                <span>${item.qty}</span>
                <button onclick="changeCartQty(${index}, 1)">+</button>
            </div>
        `;
        cartItemsDiv.appendChild(itemDiv);
    });
}

function calculateTotal() {
    let subtotal = 0;
    cart.forEach(item => subtotal += (item.harga * item.qty));

    const selectedShipping = document.querySelector('input[name="pengiriman"]:checked');
    const shippingCost = selectedShipping ? parseInt(selectedShipping.getAttribute('data-ongkir')) : 0;

    const grandTotal = subtotal + shippingCost;

    document.getElementById('subtotal-display').innerText = formatRupiah(subtotal);
    document.getElementById('ongkir-display').innerText = formatRupiah(shippingCost);
    document.getElementById('cart-total').innerText = formatRupiah(grandTotal);
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
    if(modal.style.display === 'block') {
        renderCartItems();
        calculateTotal();
    }
}

async function checkoutWA() {
    // 1. Validasi Keranjang
    if (cart.length === 0) { 
        showToast("Keranjang kosong!", "error");
        return; 
    }

    // --- TIDAK ADA VALIDASI NAMA/WA LAGI ---

    // 2. Ambil Data Pengiriman & Pembayaran
    const shippingRadio = document.querySelector('input[name="pengiriman"]:checked');
    const paymentRadio = document.querySelector('input[name="pembayaran"]:checked');
    
    const shippingMethod = shippingRadio ? shippingRadio.value : 'Ambil Sendiri';
    const shippingCost = shippingRadio ? parseInt(shippingRadio.getAttribute('data-ongkir')) : 0;
    const paymentMethod = paymentRadio ? paymentRadio.value : 'Bayar Ditempat';

    // 3. Hitung Total & Susun Pesan
    let subtotal = 0;
    let itemsString = ""; 
    
    // Format Pesan Awal (Lebih umum karena data diri belum ada)
    let pesanWA = `Halo Admin/Bot, saya mau pesan order baru dari Web:\n\n`; 

    cart.forEach((item) => {
        const totalItem = item.harga * item.qty;
        subtotal += totalItem;
        
        // Pesan WA
        pesanWA += `- ${item.qty}x ${item.nama} (${formatRupiah(totalItem)})\n`;
        
        // Database
        itemsString += `${item.nama} (${item.qty}), `;
    });

    const grandTotal = subtotal + shippingCost;
    itemsString = itemsString.slice(0, -2);

    pesanWA += `\n---------------------------\n`;
    pesanWA += `Subtotal: ${formatRupiah(subtotal)}\n`;
    pesan += `Pengiriman: ${shippingMethod} (${formatRupiah(shippingCost)})\n`;
    pesanWA += `Pembayaran: ${paymentMethod}\n`;
    pesanWA += `---------------------------\n`;
    pesanWA += `*Total Estimasi: ${formatRupiah(grandTotal)}*\n`;
    pesanWA += `\nMohon diproses, terima kasih.`; 
    // Chatbot Anda nanti yang akan membalas: "Siapa nama kakak?" dll.

    // --- PROSES KIRIM KE DATABASE (GOOGLE SHEET) ---
    showToast("Menghubungkan ke WhatsApp...", "warning");
    
    const btnCheckout = document.querySelector('.btn-checkout');
    btnCheckout.disabled = true;
    btnCheckout.innerText = "Memproses...";

    try {
        const payload = {
            action: 'checkout',
            nama: 'User Website', // Placeholder (karena belum tau namanya)
            no_wa: '-',           // Placeholder
            items: itemsString,
            total: grandTotal,
            metode: paymentMethod
        };

        // Kirim ke Google Script (Rekap Order Masuk)
        // Kita tidak perlu menunggu (await) response sukses dari Sheet agar lebih cepat ke WA
        // Namun, fetch tetap dijalankan.
        fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        }).catch(() => console.log("Gagal log ke sheet, tapi lanjut WA"));

        // Langsung buka WA (Tanpa menunggu database selesai 100% biar cepat)
        setTimeout(() => {
            const nomorAdmin = '628123456789'; // GANTI NOMOR WA BOT/ADMIN
            window.open(`https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesanWA)}`, '_blank');
            
            // Reset
            cart = [];
            renderCartItems();
            calculateTotal();
            toggleCart();
            
            showToast("Beralih ke WhatsApp...", "success");
        }, 1000);

    } catch (error) {
        console.error(error);
        // Fallback jika error
        const nomorAdmin = '628123456789';
        window.open(`https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesanWA)}`, '_blank');
    } finally {
        setTimeout(() => {
            btnCheckout.disabled = false;
            btnCheckout.innerText = "Checkout via WA";
        }, 2000);
    }
}


window.onclick = function(event) {
    const modal = document.getElementById('cart-modal');
    if (event.target == modal) modal.style.display = "none";
}

loadProducts();