// --- 1. STATE GLOBAL & DATA DEFAULT ---
// Data default alternatif smartwatch untuk pencarian rekomendasi terbaik
const DEFAULT_ALTERNATIVES = [
    { id: "S1", name: "Apple Watch Series 9", c1: 8500000, c2: 1.9, c3: 1, c4: 10, c5: 5, c6: 32 },
    { id: "S2", name: "Samsung Galaxy Watch 6", c1: 5200000, c2: 1.5, c3: 2, c4: 8, c5: 5, c6: 44 },
    { id: "S3", name: "Xiaomi Watch S3", c1: 1800000, c2: 1.4, c3: 15, c4: 6, c5: 5, c6: 44 },
    { id: "S4", name: "Garmin Venu 3", c1: 6200000, c2: 1.4, c3: 14, c4: 12, c5: 5, c6: 30 },
    { id: "S5", name: "Amazfit T-Rex 2", c1: 3000000, c2: 1.4, c3: 24, c4: 7, c5: 10, c6: 66 }
];

// Jenis kriteria default (cost = semakin kecil semakin baik, benefit = semakin besar semakin baik)
const DEFAULT_CRITERIA_TYPES = {
    c1: "cost",      // Harga (C1)
    c2: "benefit",   // Ukuran Layar (C2)
    c3: "benefit",   // Daya Tahan Baterai (C3)
    c4: "benefit",   // Fitur Kesehatan (C4)
    c5: "benefit",   // Ketahanan Air (C5)
    c6: "cost"        // Berat (C6)
};

// Bobot default kriteria (Total alokasi bobot harus bernilai 100%)
const DEFAULT_CRITERIA_WEIGHTS = {
    c1: 25, // Bobot C1
    c2: 20, // Bobot C2
    c3: 20, // Bobot C3
    c4: 15, // Bobot C4
    c5: 10, // Bobot C5
    c6: 10  // Bobot C6
};

// Salin data awal agar data default tidak termodifikasi secara langsung
let alternatives = JSON.parse(JSON.stringify(DEFAULT_ALTERNATIVES));
let criteriaWeights = { ...DEFAULT_CRITERIA_WEIGHTS };
let criteriaTypes = { ...DEFAULT_CRITERIA_TYPES };
let results = null; // Menyimpan hasil akhir perhitungan SAW
let myChart = null; // Menyimpan instance objek chart Chart.js

// --- 2. SELEKTOR ELEMEN DOM ---
const alternativeTbody = document.getElementById("alternative-tbody");
const btnAddAlternative = document.getElementById("btn-add-alternative");
const btnResetDefault = document.getElementById("btn-reset-default");
const btnResetAll = document.getElementById("btn-reset-all");
const btnCalculate = document.getElementById("btn-calculate");
const alternativeCountEl = document.getElementById("alternative-count");

const weightProgress = document.getElementById("weight-progress-bar");
const weightTotalBadge = document.getElementById("weight-total-badge");
const weightStatusText = document.getElementById("weight-status-text");
const validationWarning = document.getElementById("validation-warning");
const validationSuccess = document.getElementById("validation-success");

const resultsSection = document.getElementById("results-section");
const loadingOverlay = document.getElementById("loading-overlay");
const matrixTbody = document.getElementById("matrix-tbody");
const normTbody = document.getElementById("norm-tbody");
const prefTbody = document.getElementById("pref-tbody");
const rankTbody = document.getElementById("rank-tbody");
const conclusionText = document.getElementById("conclusion-text");
const calcStepsDetails = document.getElementById("calculation-steps-details");

const btnPrint = document.getElementById("btn-print");
const btnExportCsv = document.getElementById("btn-export-csv");

// Akordion Detail Perhitungan
const btnAccordion = document.getElementById("btn-accordion");
const accordionContent = document.getElementById("accordion-content");
const accordionIcon = document.getElementById("accordion-icon");

// --- 2.1 SISTEM NOTIFIKASI TOAST ---
// Fungsi untuk menampilkan pesan pop-up/toast kepada pengguna
function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");

    let bgClass = "bg-white dark:bg-slate-800 border-emerald-500 text-emerald-600 dark:text-emerald-400";
    let iconClass = "fa-solid fa-circle-check";

    if (type === "error") {
        bgClass = "bg-white dark:bg-slate-800 border-rose-500 text-rose-600 dark:text-rose-400";
        iconClass = "fa-solid fa-triangle-exclamation";
    } else if (type === "warning") {
        bgClass = "bg-white dark:bg-slate-800 border-amber-500 text-amber-600 dark:text-amber-500";
        iconClass = "fa-solid fa-circle-exclamation";
    } else if (type === "info") {
        bgClass = "bg-white dark:bg-slate-800 border-blue-500 text-blue-600 dark:text-blue-400";
        iconClass = "fa-solid fa-circle-info";
    }

    toast.className = `flex items-center gap-3 px-4 py-3.5 rounded-xl border-l-4 shadow-xl ${bgClass} font-semibold text-sm transition-all duration-300 transform translate-x-20 opacity-0 pointer-events-auto max-w-sm`;
    toast.innerHTML = `
        <i class="${iconClass} text-lg"></i>
        <div class="flex-grow">${message}</div>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2 focus:outline-none">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Memicu animasi transisi masuk
    setTimeout(() => {
        toast.classList.remove("translate-x-20", "opacity-0");
    }, 10);

    // Listener tombol tutup mandiri
    const closeBtn = toast.querySelector("button");
    closeBtn.addEventListener("click", () => {
        closeToast(toast);
    });

    // Menutup notifikasi secara otomatis setelah 4 detik
    setTimeout(() => {
        if (toast.parentNode) {
            closeToast(toast);
        }
    }, 4000);
}

// Fungsi untuk menutup notifikasi dengan efek transisi keluar
function closeToast(toast) {
    toast.classList.add("translate-x-20", "opacity-0");
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 300);
}

// --- 3. SWITCH TEMA (DARK MODE) ---
const themeToggleBtn = document.getElementById("theme-toggle");
const themeToggleIcon = document.getElementById("theme-toggle-icon");

// Inisialisasi tema saat halaman dimuat pertama kali berdasarkan preferensi sebelumnya
function initTheme() {
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleIcon.className = "fa-solid fa-sun text-lg";
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleIcon.className = "fa-solid fa-moon text-lg";
    }
}

// Event listener untuk tombol switch tema gelap/terang
themeToggleBtn.addEventListener("click", () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('color-theme', 'light');
        themeToggleIcon.className = "fa-solid fa-moon text-lg";
        showToast("Tema diubah ke Mode Terang", "info");
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
        themeToggleIcon.className = "fa-solid fa-sun text-lg";
        showToast("Tema diubah ke Mode Gelap", "info");
    }
    // Render ulang grafik Chart agar palet warna label teks menyesuaikan tema baru
    if (results && myChart) {
        renderChart();
    }
});

// --- 4. MANAJEMEN DATA (CRUD ALTERNATIF) ---
// Fungsi untuk mem-render daftar data alternatif ke dalam tabel input
function renderAlternatives() {
    alternativeTbody.innerHTML = "";
    alternativeCountEl.textContent = alternatives.length;

    alternatives.forEach((alt, index) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors";
        tr.innerHTML = `
            <td class="py-3 px-6 font-mono text-xs font-semibold text-slate-500">${alt.id}</td>
            <td class="py-3 px-6">
                <input type="text" value="${alt.name}" data-field="name" data-index="${index}" class="alt-input w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1 text-slate-800 dark:text-slate-100 font-semibold" placeholder="Nama Smartwatch">
            </td>
            <td class="py-3 px-6">
                <input type="number" min="0" value="${alt.c1}" data-field="c1" data-index="${index}" class="alt-input text-right w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1 font-medium" placeholder="Harga">
            </td>
            <td class="py-3 px-6">
                <input type="number" step="0.1" min="0" value="${alt.c2}" data-field="c2" data-index="${index}" class="alt-input text-right w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1" placeholder="Layar">
            </td>
            <td class="py-3 px-6">
                <input type="number" min="0" value="${alt.c3}" data-field="c3" data-index="${index}" class="alt-input text-right w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1" placeholder="Baterai">
            </td>
            <td class="py-3 px-6">
                <input type="number" min="0" value="${alt.c4}" data-field="c4" data-index="${index}" class="alt-input text-right w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1" placeholder="Fitur">
            </td>
            <td class="py-3 px-6">
                <input type="number" min="0" value="${alt.c5}" data-field="c5" data-index="${index}" class="alt-input text-right w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1" placeholder="Tahan Air">
            </td>
            <td class="py-3 px-6">
                <input type="number" min="0" value="${alt.c6}" data-field="c6" data-index="${index}" class="alt-input text-right w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none py-1" placeholder="Berat">
            </td>
            <td class="py-3 px-6 text-center">
                <button data-index="${index}" class="btn-delete-alt text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all focus:outline-none" title="Hapus Alternatif">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        alternativeTbody.appendChild(tr);
    });

    // Menghubungkan event handler ke setiap elemen input alternatif
    document.querySelectorAll(".alt-input").forEach(input => {
        input.addEventListener("input", handleAlternativeInputChange);
    });

    // Menghubungkan event handler tombol hapus & validasi tombol hapus jika jumlah alternatif minimal terpenuhi
    document.querySelectorAll(".btn-delete-alt").forEach(btn => {
        btn.addEventListener("click", handleDeleteAlternative);
        if (alternatives.length <= 2) {
            btn.disabled = true;
            btn.classList.add("opacity-30", "cursor-not-allowed");
            btn.setAttribute("title", "Minimal tersisa 2 alternatif");
        }
    });
}

// Fungsi untuk menjana kode alternatif secara otomatis (contoh: S1, S2, dst)
function generateCode(currentIndex) {
    return "S" + (currentIndex + 1);
}

// Handler ketika ada perubahan nilai input pada tabel alternatif
function handleAlternativeInputChange(e) {
    const field = e.target.getAttribute("data-field");
    const idx = parseInt(e.target.getAttribute("data-index"));
    let val = e.target.value;

    // Nilai numerik kriteria tidak boleh bernilai negatif
    if (field !== "name") {
        val = val === "" ? 0 : parseFloat(val);
        if (val < 0) {
            val = 0;
            e.target.value = 0;
            showToast("Nilai kriteria tidak boleh bernilai negatif!", "warning");
        }
    }

    alternatives[idx][field] = val;

    // Memberikan indikasi border merah jika input nama smartwatch kosong
    if (field === "name" && val.trim() === "") {
        e.target.classList.add("border-b-rose-500");
    } else if (field === "name") {
        e.target.classList.remove("border-b-rose-500");
    }
}

// Handler untuk menghapus baris alternatif
function handleDeleteAlternative(e) {
    if (alternatives.length <= 2) {
        showToast("Alternatif minimal 2 data, tidak bisa menghapus lebih banyak lagi!", "error");
        return;
    }

    const btn = e.currentTarget;
    const idx = parseInt(btn.getAttribute("data-index"));
    const removedName = alternatives[idx].name || alternatives[idx].id;

    alternatives.splice(idx, 1);

    // Urutkan ulang kode alternatif agar selalu sekuensial (S1, S2, dst)
    alternatives.forEach((alt, i) => {
        alt.id = generateCode(i);
    });

    renderAlternatives();
    showToast(`Alternatif "${removedName}" berhasil dihapus.`, "info");
}

// Event listener untuk tombol tambah alternatif baru
btnAddAlternative.addEventListener("click", () => {
    const nextIdx = alternatives.length;
    const nextCode = generateCode(nextIdx);

    alternatives.push({
        id: nextCode,
        name: `Smartwatch Baru ${nextIdx + 1}`,
        c1: 3000000,
        c2: 1.4,
        c3: 10,
        c4: 5,
        c5: 5,
        c6: 45
    });

    renderAlternatives();
    showToast(`Alternatif baru ${nextCode} ditambahkan. Silakan sesuaikan datanya.`, "success");

    // Gulirkan tabel alternatif ke paling bawah setelah baris ditambahkan
    const container = alternativeTbody.closest('.overflow-x-auto');
    container.scrollTop = container.scrollHeight;
});

// Event listener untuk mengembalikan data alternatif ke default awal
btnResetDefault.addEventListener("click", () => {
    alternatives = JSON.parse(JSON.stringify(DEFAULT_ALTERNATIVES));
    renderAlternatives();
    showToast("Data alternatif berhasil dikembalikan ke default bawaan.", "info");
});

// --- 5. MANAJEMEN BOBOT & JENIS KRITERIA ---
// Fungsi untuk memicu inisialisasi awal nilai bobot dan jenis kriteria (dropdown & slider)
function initWeightsAndCriteria() {
    for (let i = 1; i <= 6; i++) {
        const select = document.getElementById(`type-c${i}`);
        select.value = criteriaTypes[`c${i}`];

        // Sesuaikan warna teks berdasarkan jenis kriteria (Hijau untuk Benefit, Merah untuk Cost)
        adjustSelectColor(select);
        select.addEventListener("change", (e) => {
            criteriaTypes[`c${i}`] = e.target.value;
            adjustSelectColor(e.target);
            showToast(`Kriteria C${i} diubah menjadi jenis ${e.target.value.toUpperCase()}`, "info");
            validateWeights();
        });

        // Event listener slider input rentang bobot kriteria
        const slider = document.getElementById(`weight-c${i}`);
        slider.value = criteriaWeights[`c${i}`];

        const valLabel = document.getElementById(`weight-val-c${i}`);
        valLabel.textContent = `${criteriaWeights[`c${i}`]}%`;

        slider.addEventListener("input", (e) => {
            const weightVal = parseInt(e.target.value);
            criteriaWeights[`c${i}`] = weightVal;
            valLabel.textContent = `${weightVal}%`;
            validateWeights();
        });
    }

    validateWeights();
}

// Mengatur warna teks dropdown secara dinamis sesuai jenis kriteria
function adjustSelectColor(select) {
    select.classList.remove("text-emerald-500", "dark:text-emerald-400", "text-rose-500", "dark:text-rose-400");
    if (select.value === "benefit") {
        select.classList.add("text-emerald-500", "dark:text-emerald-400");
    } else {
        select.classList.add("text-rose-500", "dark:text-rose-400");
    }
}

// Validasi total akumulasi bobot kriteria harus tepat bernilai 100%
function validateWeights() {
    let total = 0;
    for (let i = 1; i <= 6; i++) {
        total += criteriaWeights[`c${i}`];
    }

    weightTotalBadge.textContent = `${total}%`;
    weightProgress.style.width = `${Math.min(total, 100)}%`;

    // Berikan gaya warna pada progress bar & badge berdasarkan status kecukupan bobot
    weightProgress.className = "h-full transition-all duration-300 ";
    weightTotalBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold ";

    if (total === 100) {
        weightProgress.classList.add("bg-emerald-500");
        weightTotalBadge.classList.add("bg-emerald-100", "text-emerald-700", "dark:bg-emerald-950/40", "dark:text-emerald-400");
        weightStatusText.innerHTML = `<span class="text-emerald-500"><i class="fa-solid fa-check-double"></i> Pas 100%. Siap dihitung!</span>`;
        btnCalculate.disabled = false;
        validationWarning.classList.add("hidden");
        validationSuccess.classList.remove("hidden");
    } else {
        btnCalculate.disabled = true;
        validationSuccess.classList.add("hidden");
        validationWarning.classList.remove("hidden");

        if (total >= 90 && total < 100) {
            weightProgress.classList.add("bg-amber-500");
            weightTotalBadge.classList.add("bg-amber-100", "text-amber-700", "dark:bg-amber-950/40", "dark:text-amber-400");
            weightStatusText.innerHTML = `<span class="text-amber-500">Sisa ${100 - total}% lagi</span>`;
        } else {
            weightProgress.classList.add("bg-rose-500");
            weightTotalBadge.classList.add("bg-rose-100", "text-rose-700", "dark:bg-rose-950/40", "dark:text-rose-400");
            if (total > 100) {
                weightStatusText.innerHTML = `<span class="text-rose-500">Kelebihan ${total - 100}%!</span>`;
            } else {
                weightStatusText.innerHTML = `<span class="text-rose-500">Kurang ${100 - total}% lagi</span>`;
            }
        }
    }
}

// --- 6. RESET SEMUA PENGATURAN ---
// Mengembalikan data alternatif, konfigurasi kriteria, dan menyembunyikan hasil perhitungan ke kondisi awal
btnResetAll.addEventListener("click", () => {
    // Kembalikan alternatif smartwatch ke default
    alternatives = JSON.parse(JSON.stringify(DEFAULT_ALTERNATIVES));
    renderAlternatives();

    // Kembalikan bobot kriteria dan jenis kriteria ke default
    criteriaWeights = { ...DEFAULT_CRITERIA_WEIGHTS };
    criteriaTypes = { ...DEFAULT_CRITERIA_TYPES };

    // Perbarui elemen UI bobot & jenis kriteria
    for (let i = 1; i <= 6; i++) {
        const select = document.getElementById(`type-c${i}`);
        select.value = criteriaTypes[`c${i}`];
        adjustSelectColor(select);

        const slider = document.getElementById(`weight-c${i}`);
        slider.value = criteriaWeights[`c${i}`];

        const valLabel = document.getElementById(`weight-val-c${i}`);
        valLabel.textContent = `${criteriaWeights[`c${i}`]}%`;
    }

    validateWeights();

    // Sembunyikan dan bersihkan hasil perhitungan SAW & grafik visual
    resultsSection.classList.add("hidden", "opacity-0", "transform", "translate-y-4");
    results = null;
    if (myChart) {
        myChart.destroy();
        myChart = null;
    }

    // Tutup akordion detail perhitungan jika sedang terbuka
    accordionContent.style.maxHeight = null;
    accordionIcon.style.transform = "rotate(0deg)";

    showToast("Seluruh pengaturan kriteria dan alternatif telah direset ke setelan awal.", "info");
});


// =========================================================================
// [METODE SAW] 7. ENGINE PERHITUNGAN SIMPLE ADDITIVE WEIGHTING (SAW)
// =========================================================================

// [SAW ENGINE] Fungsi Validasi & Trigger Utama Perhitungan SAW
function calculateSAW() {
    // 1. Validasi Kelengkapan Data Nama Alternatif
    let isValid = true;
    let firstEmptyIndex = -1;

    alternatives.forEach((alt, idx) => {
        if (!alt.name || alt.name.trim() === "") {
            isValid = false;
            firstEmptyIndex = idx;
        }
    });

    if (!isValid) {
        showToast(`Nama smartwatch pada alternatif baris ke-${firstEmptyIndex + 1} tidak boleh kosong!`, "error");
        // Arahkan kursor fokus secara langsung ke input nama alternatif yang kosong
        const emptyInput = document.querySelector(`.alt-input[data-field="name"][data-index="${firstEmptyIndex}"]`);
        if (emptyInput) {
            emptyInput.focus();
            emptyInput.classList.add("border-b-rose-500");
        }
        return;
    }

    // 2. Validasi Jumlah Bobot Harus Tepat 100%
    let totalW = 0;
    for (let i = 1; i <= 6; i++) {
        totalW += criteriaWeights[`c${i}`];
    }
    if (totalW !== 100) {
        showToast(`Kalkulasi gagal: Total bobot kriteria saat ini adalah ${totalW}%. Harus tepat 100%!`, "error");
        return;
    }

    // Tampilkan overlay pemrosesan data selama 800ms untuk efek UX yang dinamis dan halus
    loadingOverlay.classList.remove("hidden");

    setTimeout(() => {
        loadingOverlay.classList.add("hidden");
        performSAWLogic(); // Panggil fungsi logika utama perhitungan matematis SAW
        showToast("Perhitungan SPK SAW berhasil diselesaikan!", "success");
    }, 800);
}

// [SAW ENGINE] Fungsi Logika Utama Matematis SAW (Pencarian Min/Max, Normalisasi, & Perhitungan Preferensi)
function performSAWLogic() {
    // 1. Mencari Nilai Maksimum (Max) dan Minimum (Min) untuk setiap kolom kriteria
    // - Kriteria bertipe 'benefit' akan dibagi dengan Nilai Maksimum (max)
    // - Kriteria bertipe 'cost' akan membagi Nilai Minimum (min)
    const minVals = { c1: Infinity, c2: Infinity, c3: Infinity, c4: Infinity, c5: Infinity, c6: Infinity };
    const maxVals = { c1: -Infinity, c2: -Infinity, c3: -Infinity, c4: -Infinity, c5: -Infinity, c6: -Infinity };

    alternatives.forEach(alt => {
        for (let i = 1; i <= 6; i++) {
            const cKey = `c${i}`;
            const val = alt[cKey];
            if (val < minVals[cKey]) minVals[cKey] = val;
            if (val > maxVals[cKey]) maxVals[cKey] = val;
        }
    });

    const normalizedData = []; // Matriks Ternormalisasi (R)
    const preferenceData = []; // Matriks Preferensi Akhir (V)

    // 2. Proses Perhitungan Normalisasi & Nilai Preferensi (V) per Alternatif
    alternatives.forEach(alt => {
        const normObj = { id: alt.id, name: alt.name };
        const prefObj = { id: alt.id, name: alt.name };
        let totalPref = 0;

        for (let i = 1; i <= 6; i++) {
            const cKey = `c${i}`;
            const val = alt[cKey];
            const type = criteriaTypes[cKey];
            const weight = criteriaWeights[cKey] / 100; // Mengubah bobot % menjadi nilai desimal

            let normVal = 0; // Menyimpan nilai hasil normalisasi r_ij
            
            // Rumus Normalisasi SAW:
            // r_ij = x_ij / max(x_ij) -> Jika kriteria bertipe BENEFIT
            // r_ij = min(x_ij) / x_ij -> Jika kriteria bertipe COST
            if (type === "benefit") {
                normVal = maxVals[cKey] === 0 ? 0 : val / maxVals[cKey];
            } else {
                normVal = val === 0 ? 0 : minVals[cKey] / val;
            }

            normObj[cKey] = normVal; // Masukkan hasil normalisasi ke objek R

            // Perhitungan Preferensi: V_i = ∑ (w_j * r_ij)
            const cellPref = weight * normVal;
            prefObj[cKey] = cellPref;
            totalPref += cellPref; // Akumulasikan total penjumlahan perkalian bobot
        }

        normObj.total = totalPref;
        prefObj.total = totalPref; // Simpan nilai akhir preferensi V_i pada alternatif ini

        normalizedData.push(normObj);
        preferenceData.push(prefObj);
    });

    // 3. Proses Perangkingan (Mengurutkan alternatif berdasarkan nilai preferensi total tertinggi ke terendah)
    const rankedData = [...preferenceData].sort((a, b) => b.total - a.total);

    // Simpan hasil perhitungan ke state global hasil
    results = {
        matrix: alternatives,
        minVals: minVals,
        maxVals: maxVals,
        normalized: normalizedData,
        preference: preferenceData,
        ranked: rankedData
    };

    // 4. Render tabel hasil kalkulasi SAW ke antarmuka pengguna (DOM)
    renderDecisionMatrix();      // Tampilkan Matriks Keputusan (X)
    renderNormalizationTable();  // Tampilkan Matriks Normalisasi (R)
    renderPreferenceTable();     // Tampilkan Matriks Perhitungan Preferensi (V)
    renderRankingTable();        // Tampilkan Tabel Urutan Perangkingan
    renderChart();               // Tampilkan Grafik Batang Visual
    renderConclusion();          // Tampilkan Rekomendasi Utama (Juara 1)
    renderDetailCalculations();  // Tampilkan Detail Langkah Perhitungan Aljabar

    // Tampilkan bagian hasil perhitungan dengan efek animasi transisi smooth
    resultsSection.classList.remove("hidden");
    setTimeout(() => {
        resultsSection.classList.remove("opacity-0", "translate-y-4");
        // Gulirkan layar secara otomatis menuju ke tampilan bagian hasil analisis
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// --- 8. FUNGSI RENDER TABEL & TAMPILAN INTERFACE ---

// Format angka ke format mata uang Rupiah (IDR) secara lokal
function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
}

// Render isi tabel Matriks Keputusan (Data input awal)
function renderDecisionMatrix() {
    matrixTbody.innerHTML = "";
    results.matrix.forEach(alt => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors";
        tr.innerHTML = `
            <td class="py-3.5 px-6 font-mono text-xs font-semibold text-slate-500">${alt.id}</td>
            <td class="py-3.5 px-6 font-semibold text-slate-800 dark:text-slate-200">${alt.name}</td>
            <td class="py-3.5 px-6 text-right font-medium">${formatRupiah(alt.c1)}</td>
            <td class="py-3.5 px-6 text-right">${alt.c2.toFixed(1)} "</td>
            <td class="py-3.5 px-6 text-right">${alt.c3} Hari</td>
            <td class="py-3.5 px-6 text-right">${alt.c4} Fitur</td>
            <td class="py-3.5 px-6 text-right">${alt.c5} ATM</td>
            <td class="py-3.5 px-6 text-right">${alt.c6} gr</td>
        `;
        matrixTbody.appendChild(tr);
    });
}

// [METODE SAW] Render isi tabel Matriks Normalisasi (R) dengan indikasi warna nilai max (hijau) & min (merah)
function renderNormalizationTable() {
    normTbody.innerHTML = "";

    // Temukan nilai maksimum & minimum yang ada pada matriks normalisasi untuk dihighlight
    const colMin = { c1: 1.0, c2: 1.0, c3: 1.0, c4: 1.0, c5: 1.0, c6: 1.0 };
    const colMax = { c1: 0.0, c2: 0.0, c3: 0.0, c4: 0.0, c5: 0.0, c6: 0.0 };

    results.normalized.forEach(row => {
        for (let i = 1; i <= 6; i++) {
            const cKey = `c${i}`;
            const val = row[cKey];
            if (val < colMin[cKey]) colMin[cKey] = val;
            if (val > colMax[cKey]) colMax[cKey] = val;
        }
    });

    results.normalized.forEach(row => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors";

        let cellsHtml = `
            <td class="py-3 px-6 font-mono text-xs font-semibold text-slate-500">${row.id}</td>
            <td class="py-3 px-6 font-semibold text-slate-800 dark:text-slate-200">${row.name}</td>
        `;

        for (let i = 1; i <= 6; i++) {
            const cKey = `c${i}`;
            const val = row[cKey];

            let cellClass = "py-3 px-6 text-right font-medium";

            // Memberikan style warna khusus untuk kecocokan maksimal (hijau) atau minimal (merah)
            if (val === colMax[cKey]) {
                cellClass += " bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold";
            } else if (val === colMin[cKey]) {
                cellClass += " bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 font-semibold";
            } else {
                cellClass += " text-slate-700 dark:text-slate-300";
            }

            cellsHtml += `<td class="${cellClass}">${val.toFixed(2)}</td>`;
        }

        tr.innerHTML = cellsHtml;
        normTbody.appendChild(tr);
    });
}

// [METODE SAW] Render isi tabel Matriks Hasil Preferensi (V_i = w_j * r_ij)
function renderPreferenceTable() {
    prefTbody.innerHTML = "";
    results.preference.forEach(row => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors";
        tr.innerHTML = `
            <td class="py-3 px-6 font-mono text-xs font-semibold text-slate-500">${row.id}</td>
            <td class="py-3 px-6 font-semibold text-slate-800 dark:text-slate-200">${row.name}</td>
            <td class="py-3 px-6 text-right text-slate-500">${row.c1.toFixed(4)}</td>
            <td class="py-3 px-6 text-right text-slate-500">${row.c2.toFixed(4)}</td>
            <td class="py-3 px-6 text-right text-slate-500">${row.c3.toFixed(4)}</td>
            <td class="py-3 px-6 text-right text-slate-500">${row.c4.toFixed(4)}</td>
            <td class="py-3 px-6 text-right text-slate-500">${row.c5.toFixed(4)}</td>
            <td class="py-3 px-6 text-right text-slate-500">${row.c6.toFixed(4)}</td>
            <td class="py-3 px-6 text-right font-bold text-primary-600 dark:text-primary-400 w-32 bg-slate-100/30 dark:bg-slate-850/60">${row.total.toFixed(4)}</td>
        `;
        prefTbody.appendChild(tr);
    });
}

// Render isi tabel Perangkingan Akhir (Alternatif diurutkan dari V_i terbesar)
function renderRankingTable() {
    rankTbody.innerHTML = "";
    results.ranked.forEach((row, index) => {
        const rankNum = index + 1;
        let rankBadge = `${rankNum}`;
        let rowBgClass = "";

        // Menambahkan ikon piala emas, perak, dan perunggu untuk juara 1, 2, dan 3
        if (rankNum === 1) {
            rankBadge = `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold shadow-sm" title="Juara 1">🏆</span>`;
            rowBgClass = "bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/5 dark:hover:bg-amber-500/10";
        } else if (rankNum === 2) {
            rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-800 border border-slate-350 font-bold shadow-xs" title="Juara 2">🥈</span>`;
            rowBgClass = "bg-slate-400/5 hover:bg-slate-400/10";
        } else if (rankNum === 3) {
            rankBadge = `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50-200 text-amber-700 bg-orange-100 text-orange-800 border border-orange-250 font-bold shadow-xs" title="Juara 3">🥉</span>`;
            rowBgClass = "bg-orange-500/5 hover:bg-orange-500/10";
        }

        const tr = document.createElement("tr");
        tr.className = `${rowBgClass} transition-colors`;
        tr.innerHTML = `
            <td class="py-3 px-6 text-center font-bold font-poppins">${rankBadge}</td>
            <td class="py-3 px-6 font-mono text-xs font-semibold text-slate-500">${row.id}</td>
            <td class="py-3 px-6 font-semibold text-slate-800 dark:text-slate-200">${row.name}</td>
            <td class="py-3 px-6 text-right font-bold text-slate-800 dark:text-white">${row.total.toFixed(4)}</td>
        `;
        rankTbody.appendChild(tr);
    });
}

// --- 9. VISUALISASI GRAFIK PERANGKINGAN (CHART.JS) ---
// Membaca data perangkingan dan menampilkan visualisasi grafik batang horizontal Chart.js
function renderChart() {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#f1f5f9' : '#334155';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const sortedDataForChart = [...results.preference].sort((a, b) => b.total - a.total);
    const labels = sortedDataForChart.map(x => x.name);
    const values = sortedDataForChart.map(x => parseFloat(x.total.toFixed(4)));

    // Palet warna latar belakang bar
    const baseColors = [
        'rgba(59, 130, 246, 0.85)', // Biru primer
        'rgba(139, 92, 246, 0.85)', // Ungu sekunder
        'rgba(34, 197, 94, 0.85)',  // Hijau
        'rgba(245, 158, 11, 0.85)',  // Amber
        'rgba(239, 68, 68, 0.85)',   // Merah
        'rgba(14, 165, 233, 0.85)',  // Sky blue
        'rgba(236, 72, 153, 0.85)',  // Pink
        'rgba(100, 116, 139, 0.85)'  // Slate
    ];

    const borderColors = [
        'rgb(59, 130, 246)',
        'rgb(139, 92, 246)',
        'rgb(34, 197, 94)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)',
        'rgb(14, 165, 233)',
        'rgb(236, 72, 153)',
        'rgb(100, 116, 139)'
    ];

    const barBgColors = values.map((_, i) => baseColors[i % baseColors.length]);
    const barBorderColors = values.map((_, i) => borderColors[i % borderColors.length]);

    // Hancurkan objek chart lama terlebih dahulu jika ada untuk merender ulang chart baru
    if (myChart) {
        myChart.destroy();
    }

    const ctx = document.getElementById('ranking-chart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nilai Preferensi (Vᵢ)',
                data: values,
                backgroundColor: barBgColors,
                borderColor: barBorderColors,
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: 'start',
            }]
        },
        options: {
            indexAxis: 'y', // Membuat grafik batang menjadi horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    titleColor: isDark ? '#ffffff' : '#1e293b',
                    bodyColor: isDark ? '#e2e8f0' : '#475569',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            return ` Nilai Preferensi: ${context.parsed.x.toFixed(4)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 1.05,
                    grid: {
                        color: gridColor,
                        drawTicks: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Poppins',
                            weight: '600',
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// --- 10. RENDER DYNAMIC KESIMPULAN REKOMENDASI ---
// Menguraikan detail keunggulan smartwatch terbaik terpilih secara dinamis
function renderConclusion() {
    const bestAlt = results.ranked[0];
    const originalAlt = results.matrix.find(x => x.id === bestAlt.id);

    // Temukan kelebihan mutlak yang dimiliki oleh smartwatch pemenang dibanding alternatif lain
    let strongPoints = [];

    // Periksa Harga (C1)
    const prices = results.matrix.map(x => x.c1);
    if (originalAlt.c1 === Math.min(...prices)) {
        strongPoints.push("memiliki harga yang paling ekonomis (terjangkau)");
    }
    // Periksa Layar (C2)
    const screens = results.matrix.map(x => x.c2);
    if (originalAlt.c2 === Math.max(...screens)) {
        strongPoints.push("layar paling lapang sebesar " + originalAlt.c2 + " inci");
    }
    // Periksa Daya Tahan Baterai (C3)
    const batteries = results.matrix.map(x => x.c3);
    if (originalAlt.c3 === Math.max(...batteries)) {
        strongPoints.push("daya tahan baterai terlama hingga " + originalAlt.c3 + " hari");
    }
    // Periksa Fitur Kesehatan (C4)
    const healthFeatures = results.matrix.map(x => x.c4);
    if (originalAlt.c4 === Math.max(...healthFeatures)) {
        strongPoints.push("dukungan fitur kesehatan terbanyak (" + originalAlt.c4 + " fitur)");
    }
    // Periksa Ketahanan Air (C5)
    const waterResistance = results.matrix.map(x => x.c5);
    if (originalAlt.c5 === Math.max(...waterResistance)) {
        strongPoints.push("ketahanan air terbaik mencapai " + originalAlt.c5 + " ATM");
    }
    // Periksa Berat (C6)
    const weights = results.matrix.map(x => x.c6);
    if (originalAlt.c6 === Math.min(...weights)) {
        strongPoints.push("bobot paling ringan (" + originalAlt.c6 + " gram)");
    }

    let strongPointsText = "";
    if (strongPoints.length > 0) {
        strongPointsText = `Smartwatch ini sangat direkomendasikan karena <strong>${strongPoints.join(', dan ')}</strong> dibanding alternatif lainnya.`;
    } else {
        strongPointsText = `Smartwatch ini terpilih karena memiliki nilai komparatif seimbang yang tinggi di berbagai kriteria sesuai bobot kepentingan Anda.`;
    }

    conclusionText.innerHTML = `
        <p class="text-base text-slate-700 dark:text-slate-200">
            Berdasarkan perhitungan metode <strong>Simple Additive Weighting (SAW)</strong>, smartwatch terbaik yang terpilih adalah 
            <span class="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold text-base font-poppins border border-emerald-350 dark:border-emerald-900/50">${bestAlt.name} (${bestAlt.id})</span> 
            dengan nilai preferensi tertinggi sebesar <span class="font-extrabold text-slate-800 dark:text-white">${bestAlt.total.toFixed(4)}</span>.
        </p>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-350">
            ${strongPointsText}
        </p>
        <div class="mt-4 pt-3 border-t border-emerald-150 dark:border-slate-700/60 flex flex-wrap gap-2">
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                Harga: ${formatRupiah(originalAlt.c1)}
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                Baterai: ${originalAlt.c3} hari
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                Layar: ${originalAlt.c2} inci
            </span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                Berat: ${originalAlt.c6} gr
            </span>
        </div>
    `;
}

// --- 11. DETAIL PERHITUNGAN LANGKAH DEMI LANGKAH ALGEBRA ---
// Mem-render perincian lengkap jalannya rumus Normalisasi & Preferensi per baris alternatif secara transparan
function renderDetailCalculations() {
    calcStepsDetails.innerHTML = "";

    results.normalized.forEach(row => {
        const orig = results.matrix.find(x => x.id === row.id);
        const pref = results.preference.find(x => x.id === row.id);

        const stepsList = [];
        for (let i = 1; i <= 6; i++) {
            const cKey = `c${i}`;
            const type = criteriaTypes[cKey];
            const w = criteriaWeights[cKey];

            // Teks representasi rumus pembagian normalisasi berdasarkan tipe kriteria
            let mathExpr = "";
            if (type === "benefit") {
                mathExpr = `r<sub>i${i}</sub> = ${orig[cKey]} / ${results.maxVals[cKey]} = ${row[cKey].toFixed(4)}`;
            } else {
                mathExpr = `r<sub>i${i}</sub> = ${results.minVals[cKey]} / ${orig[cKey]} = ${row[cKey].toFixed(4)}`;
            }

            // Teks representasi rumus perkalian hasil normalisasi dengan bobot kriteria
            const subPref = `${(w / 100).toFixed(2)} &times; ${row[cKey].toFixed(4)} = ${pref[cKey].toFixed(4)}`;

            stepsList.push(`
                <div class="py-1.5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between text-xs gap-1">
                    <span class="font-medium text-slate-700 dark:text-slate-350">Kriteria C${i} (${type.toUpperCase()}):</span>
                    <div class="flex flex-wrap items-center gap-2 font-mono text-slate-500 dark:text-slate-400">
                        <span>${mathExpr}</span>
                        <span class="text-slate-300 dark:text-slate-700">|</span>
                        <span class="font-semibold text-primary-600 dark:text-primary-400">${subPref}</span>
                    </div>
                </div>
            `);
        }

        const sumSteps = [];
        for (let i = 1; i <= 6; i++) {
            sumSteps.push(pref[`c${i}`].toFixed(4));
        }

        const card = document.createElement("div");
        card.className = "bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs";
        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h5 class="font-bold text-slate-800 dark:text-white font-poppins">${row.name} (${row.id})</h5>
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400 font-bold">V<sub>${row.id}</sub> = ${pref.total.toFixed(4)}</span>
            </div>
            
            <div class="space-y-1">
                ${stepsList.join("")}
            </div>

            <div class="mt-3 pt-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span class="font-semibold text-slate-700 dark:text-slate-300">Penjumlahan Preferensi:</span>
                <div class="mt-1 p-2 rounded bg-slate-50 dark:bg-slate-900/50 break-words leading-relaxed">
                    V = ${sumSteps.join(" + ")} = <strong class="text-primary-600 dark:text-primary-400 font-bold text-sm">${pref.total.toFixed(4)}</strong>
                </div>
            </div>
        `;
        calcStepsDetails.appendChild(card);
    });
}

// --- 12. AKSESIBILITAS TRANSISI AKORDION DETAIL PERHITUNGAN ---
// Mengontrol tinggi dinamis konten akordion ketika tombol "Detail Langkah Perhitungan" ditekan
btnAccordion.addEventListener("click", () => {
    if (accordionContent.style.maxHeight) {
        accordionContent.style.maxHeight = null;
        accordionContent.classList.add("border-transparent");
        accordionIcon.style.transform = "rotate(0deg)";
    } else {
        accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
        accordionContent.classList.remove("border-transparent");
        accordionIcon.style.transform = "rotate(180deg)";

        // Setel ulang tinggi maksimum ke 'none' agar konten dinamis di dalamnya tidak terpotong
        setTimeout(() => {
            if (accordionContent.style.maxHeight) {
                accordionContent.style.maxHeight = "none";
            }
        }, 500);
    }
});

// --- 13. EKSPOR HASIL AKHIR KE FORMAT FILE CSV ---
btnExportCsv.addEventListener("click", () => {
    if (!results) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    // Header Kolom CSV
    csvContent += "Peringkat,Kode,Nama Smartwatch,Nilai Preferensi (Vi),Harga,Ukuran Layar (Inci),Daya Tahan Baterai (Hari),Fitur Kesehatan,Ketahanan Air (ATM),Berat (Gram)\n";

    // Mengisi baris data alternatif terurut berdasarkan peringkat
    results.ranked.forEach((row, index) => {
        const originalAlt = results.matrix.find(x => x.id === row.id);
        const rankNum = index + 1;

        const csvRow = [
            rankNum,
            row.id,
            `"${row.name.replace(/"/g, '""')}"`,
            row.total.toFixed(6),
            originalAlt.c1,
            originalAlt.c2,
            originalAlt.c3,
            originalAlt.c4,
            originalAlt.c5,
            originalAlt.c6
        ].join(",");

        csvContent += csvRow + "\n";
    });

    // Memicu trigger pengunduhan file CSV secara otomatis di browser
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "spk_smartwatch_saw_results.csv");
    document.body.appendChild(link); // Diperlukan kompatibilitas browser Mozilla Firefox
    link.click();
    document.body.removeChild(link);

    showToast("Hasil SPK berhasil diekspor sebagai file CSV.", "success");
});

// --- 14. SISTEM CETAK LAPORAN (PRINT LAYOUT) ---
btnPrint.addEventListener("click", () => {
    window.print();
});

// --- 15. INSTALASI INITIAL LISTENERS DI AWAL ---
btnCalculate.addEventListener("click", calculateSAW);

// Pemicu inisialisasi awal saat dokumen HTML selesai dimuat secara keseluruhan
window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    renderAlternatives();
    initWeightsAndCriteria();
});
