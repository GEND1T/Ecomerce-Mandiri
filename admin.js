// GANTI DENGAN URL DEPLOYMENT APPS SCRIPT TERBARU (YANG MENDUKUNG POST)
const API_URL = 'https://script.google.com/macros/s/AKfycbxO7O0mUZe79JLYvwwx4KtlouINdluBu1UaOR7dNjOGAGpjsH0mEwyPHaGdLgBxotnUsw/exec'; 

// Password Sederhana (Ganti sesuka hati)
const ADMIN_PIN = "12345"; 

let allData = [];
let isEditing = false;

// --- 1. LOGIN SYSTEM ---
function checkLogin() {
    const input = document.getElementById('admin-pin').value;
    if (input === ADMIN_PIN) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        loadAdminData(); // Load data setelah login
    } else {
        alert("PIN Salah!");
    }
}

function logout() {
    location.reload();
}

// --- 2. LOAD DATA ---
async function loadAdminData() {
    const tbody = document.getElementById('admin-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Mengambil data terbaru...</td></tr>';
    
    try {
        // Tambahkan timestamp agar tidak dicache browser
        const response = await fetch(API_URL + '?action=read&t=' + new Date().getTime());
        const data = await response.json();
        
        allData = data;
        renderTable(allData);
        updateDashboardStats(allData);

    } catch (error) {
        console.error(error);
        showToast('Gagal koneksi ke server', 'error');
    }
}

function renderTable(data) {
    const tbody = document.getElementById('admin-tbody');
    const mobileContainer = document.getElementById('mobile-view');
    
    // Kosongkan kedua wadah
    tbody.innerHTML = '';
    mobileContainer.innerHTML = '';

    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada produk</td></tr>';
        mobileContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#888;">Belum ada produk</p>';
        return;
    }

    data.forEach(item => {
        const gambar = item.gambar || 'https://via.placeholder.com/60?text=IMG';
        const harga = parseInt(item.harga).toLocaleString('id-ID');

        // --- 1. RENDER UNTUK DESKTOP (TABEL) ---
        const rowDesktop = `
            <tr>
                <td><img src="${gambar}" alt="img" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
                <td><b>${item.nama_produk}</b></td>
                <td>${item.kategori || '-'}</td>
                <td>Rp ${harga}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <button class="btn-sm" onclick="quickStock('${item.id}', -1, ${item.stok})">-</button>
                        <span style="font-weight:bold; width:25px; text-align:center;">${item.stok}</span>
                        <button class="btn-sm" onclick="quickStock('${item.id}', 1, ${item.stok})">+</button>
                    </div>
                </td>
                <td>
                    <button class="btn-sm btn-edit" onclick="openEditModal('${item.id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteProduct('${item.id}', '${item.nama_produk}')">Hapus</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += rowDesktop;

        // --- 2. RENDER UNTUK MOBILE (CARD VIEW) ---
        const cardMobile = `
            <div class="admin-card-mobile">
                <div class="ac-header">
                    <img src="${gambar}" class="ac-img">
                    <div class="ac-info">
                        <h4>${item.nama_produk}</h4>
                        <p>${item.kategori || 'Tanpa Kategori'}</p>
                        <div class="ac-price">Rp ${harga}</div>
                    </div>
                </div>

                <div class="ac-stock-area">
                    <span class="stock-label">Stok Tersedia:</span>
                    <div class="stock-control">
                        <button class="btn-circle" onclick="quickStock('${item.id}', -1, ${item.stok})">-</button>
                        <span class="stock-val">${item.stok}</span>
                        <button class="btn-circle" onclick="quickStock('${item.id}', 1, ${item.stok})">+</button>
                    </div>
                </div>

                <div class="ac-actions">
                    <button class="btn-mobile edit" onclick="openEditModal('${item.id}')">
                        ✏️ Edit
                    </button>
                    <button class="btn-mobile del" onclick="deleteProduct('${item.id}', '${item.nama_produk}')">
                        🗑️ Hapus
                    </button>
                </div>
            </div>
        `;
        mobileContainer.innerHTML += cardMobile;
    });
}
function updateDashboardStats(data) {
    document.getElementById('total-products').innerText = data.length;
    // Hitung stok menipis (< 5)
    const lowStock = data.filter(d => d.stok < 5).length;
    document.getElementById('low-stock-count').innerText = lowStock;
}

// --- 3. MODAL & FORM HANDLING ---

function openModal(mode) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const btn = document.getElementById('btn-save');
    const form = document.getElementById('product-form');
    
    modal.style.display = 'block';

    if (mode === 'add') {
        isEditing = false;
        title.innerText = "Tambah Produk Baru";
        btn.innerText = "Simpan Produk";
        form.reset();
        document.getElementById('edit-id').value = '';
    }

    if (mode === 'add') {
        // ... kode lama reset form ...
        document.getElementById('inp-file-gambar').value = '';
        document.getElementById('img-preview').style.display = 'none';
        document.getElementById('inp-gambar-lama').value = '';
        finalBase64 = null;
    }
}

function openEditModal(id) {
    const product = allData.find(p => String(p.id) === String(id));
    if (!product) return;

    openModal('edit'); 
    isEditing = true;
    document.getElementById('modal-title').innerText = "Edit Produk";
    document.getElementById('btn-save').innerText = "Update Produk";

    document.getElementById('edit-id').value = product.id;
    document.getElementById('inp-nama').value = product.nama_produk;
    document.getElementById('inp-kategori').value = product.kategori;
    document.getElementById('inp-harga').value = product.harga;
    document.getElementById('inp-stok').value = product.stok;
    document.getElementById('inp-deskripsi').value = product.deskripsi;

    // --- BAGIAN GAMBAR DIUPDATE ---
    // Simpan URL lama di hidden input
    document.getElementById('inp-gambar-lama').value = product.gambar;
    
    // Reset input file dan base64 baru
    document.getElementById('inp-file-gambar').value = ''; 
    finalBase64 = null; 

    // Tampilkan preview gambar lama jika ada
    const preview = document.getElementById('img-preview');
    if (product.gambar && product.gambar.length > 10) {
        preview.src = product.gambar;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}

// --- 4. CRUD OPERATIONS (CREATE, UPDATE, DELETE) ---

async function saveProduct() {
    const btn = document.getElementById('btn-save');
    const originalText = btn.innerText;
    btn.innerText = "Mengupload..."; // Ubah teks karena proses upload butuh waktu
    btn.disabled = true;

    // Cek: Apakah user upload gambar baru?
    let gambarPayload = null;
    
    if (finalBase64) {
        // Jika ada file baru dipilih, kirim base64
        gambarPayload = finalBase64;
    } else {
        // Jika tidak, kirim URL lama (kosongkan base64)
        gambarPayload = null;
    }

    const payload = {
        action: isEditing ? 'edit' : 'add',
        id: document.getElementById('edit-id').value,
        nama_produk: document.getElementById('inp-nama').value,
        kategori: document.getElementById('inp-kategori').value,
        harga: document.getElementById('inp-harga').value,
        stok: document.getElementById('inp-stok').value,
        deskripsi: document.getElementById('inp-deskripsi').value,
        
        // Data Gambar
        gambar: document.getElementById('inp-gambar-lama').value, // URL Lama (Backup)
        gambar_base64: finalBase64 // Data Gambar Baru (akan diproses di server)
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        // ... sisa kode sama (tampilkan toast, close modal, reload) ...
        
        const result = await response.json();

        if(result.status === 'success') {
            showToast(result.message, 'success');
            closeModal();
            loadAdminData(); // Refresh tabel
        } else {
            showToast('Error: ' + result.message, 'error');
        }

    } catch (error) {
        console.error(error);
        showToast('Gagal menyimpan data.', 'error');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function deleteProduct(id, nama) {
    // 1. Konfirmasi Keamanan (Browser Native)
    if (!confirm(`Yakin ingin menghapus "${nama}"? Data tidak bisa dikembalikan.`)) return;

    // 2. Toast PROSES (Memberi tahu user sistem sedang bekerja)
    showToast('Sedang menghapus data...', 'warning');

    try {
        const payload = { action: 'delete', id: id };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Cek respons JSON dari script
        const result = await response.json();

        if (result.status === 'success') {
            // 3. Toast SUKSES
            showToast(`"${nama}" berhasil dihapus!`, 'success');
            
            // Refresh tabel otomatis
            loadAdminData(); 
        } else {
            // Jika script mengembalikan error logika
            throw new Error(result.message || 'Gagal menghapus');
        }

    } catch (error) {
        console.error(error);
        // 4. Toast ERROR
        showToast('Gagal menghapus produk. Cek koneksi.', 'error');
    }
}

// Fitur Quick Stock (Update stok tanpa buka modal)
async function quickStock(id, change, currentStok) {
    const newStok = parseInt(currentStok) + change;
    if (newStok < 0) return;

    // Update UI dulu biar terasa cepat (Optimistic UI)
    const product = allData.find(p => String(p.id) === String(id));
    if(product) product.stok = newStok;
    renderTable(allData); // Render ulang tabel lokal

    // Kirim ke server di background
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'edit', id: id, stok: newStok })
        });
        // Tidak perlu reloadData agar tidak berat, karena sudah diupdate lokal
    } catch (e) {
        showToast('Gagal update stok server', 'error');
        loadAdminData(); // Rollback jika gagal
    }
}

// Search Filter Table
function searchAdmin() {
    const keyword = document.getElementById('admin-search').value.toLowerCase();
    const filtered = allData.filter(item => item.nama_produk.toLowerCase().includes(keyword));
    renderTable(filtered);
}

// --- HELPER TOAST (Sama seperti user) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

// Variabel global untuk menyimpan ID produk yang mau dihapus sementara
let productToDeleteId = null;
let productToDeleteName = null;

// FUNGSI 1: Buka Modal Konfirmasi
function deleteProduct(id, nama) {
    // Simpan data ke variabel global
    productToDeleteId = id;
    productToDeleteName = nama;

    // Update teks pesan di modal
    const msg = document.getElementById('confirm-msg');
    msg.innerHTML = `Yakin ingin menghapus <b>"${nama}"</b>?<br>Data tidak bisa dikembalikan.`;

    // Tampilkan Modal
    document.getElementById('confirm-modal').style.display = 'block';
    
    // Setup tombol "Ya" agar menjalankan fungsi eksekusi
    const btnYes = document.getElementById('btn-confirm-yes');
    btnYes.onclick = executeDelete; // Hubungkan tombol dengan fungsi eksekusi
}

// FUNGSI 2: Tutup Modal
function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
    productToDeleteId = null; // Reset
}

// FUNGSI 3: Eksekusi Hapus ke Server (Dijalankan saat klik "Ya")
async function executeDelete() {
    // 1. AMBIL ID DULU SEBELUM DI-RESET
    const idToSend = productToDeleteId; 
    const nameSnapshot = productToDeleteName;

    // Cek keamanan: Jika ID kosong, batalkan
    if (!idToSend) {
        showToast("Error: ID Produk tidak ditemukan (null)", "error");
        closeConfirmModal();
        return;
    }

    // 2. BARU TUTUP MODAL (Ini akan mereset productToDeleteId jadi null)
    closeConfirmModal();

    showToast(`Menghapus ${nameSnapshot}...`, 'warning');

    try {
        // 3. GUNAKAN VARIABLE LOKAL 'idToSend'
        const payload = { action: 'delete', id: idToSend };
        
        console.log("Mengirim data:", payload); // Debugging: Pastikan ID kini ada isinya

        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === 'success') {
            showToast(`"${nameSnapshot}" berhasil dihapus!`, 'success');
            loadAdminData(); 
        } else {
            throw new Error(result.message || 'Gagal menghapus');
        }

    } catch (error) {
        console.error(error);
        showToast('Gagal menghapus produk. Cek koneksi.', 'error');
    }
}
// Tambahkan event listener agar klik di luar modal bisa menutup modal konfirmasi juga
window.onclick = function(event) {
    const modalProduct = document.getElementById('product-modal');
    const modalConfirm = document.getElementById('confirm-modal');
    
    if (event.target == modalProduct) {
        modalProduct.style.display = "none";
    }
    if (event.target == modalConfirm) {
        modalConfirm.style.display = "none";
    }
}

// --- UTILITAS GAMBAR (KOMPRESI & PREVIEW) ---
let finalBase64 = null; // Variabel global untuk menampung string gambar

function previewAndCompressImage(input) {
    const file = input.files[0];
    const preview = document.getElementById('img-preview');

    if (file) {
        // Tampilkan loading visual
        preview.src = 'https://i.gifer.com/ZZ5H.gif'; // Loading spinner sederhana
        preview.style.display = 'block';

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = function () {
                // --- PROSES KOMPRESI ---
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Atur ukuran maksimal (misal lebar 800px)
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Konversi ke Base64 (JPEG quality 0.7 = 70%)
                finalBase64 = canvas.toDataURL('image/jpeg', 0.7);
                
                // Tampilkan hasil kompresi di preview
                preview.src = finalBase64;
            };
        };
        reader.readAsDataURL(file);
    } else {
        finalBase64 = null;
    }
}