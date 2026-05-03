import { useState, useEffect } from "react";
import "./App.css";

// ============================================================
// GANTI URL INI DENGAN URL GOOGLE APPS SCRIPT ANDA SETELAH DEPLOY
// ============================================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbzo6LlO1zz0oY2JPtoxPF8JENk70LkN264UXCeoAkteIyVD3_M56Zi7tyVHwhYCPr74HQ/exec";
const SALDO_AWAL = 130000;

const DAFTAR_NAMA = [
  "Muhammad Ilham", "Abi Bakri", "Ahmad Hafidz Fiqhy", "Bintang Aidil Rizky",
  "Dafrino Mawla Ryadeen", "Dio Gentano Ramadhan", "Dzaky Eka Wansyah", 
  "Fauzan Naufal Muzakki", "Hera Selvya", "Ibrahim Ahsan Suryajati", 
  "Kayla Alia Atarani", "M. Carel Fauzan", "M. Rifan Adi Saputra", 
  "Marko Wardana", "Melyani Kartin Santa Tampubolon", "Muhammad Hafizh Azhar", 
  "Muhammad Zakfar Sodik", "Okta Tri Rahmadani", "Putra Bagus Satrio", 
  "Renhat Denil Ramadhan", "Rino Eqi Pratama", "Saniatun Muthoharoh", 
  "Trio Refky Wahyu Putra", "Yuda Andriansyah", "Zidan Alghifari"
];

export default function App() {
  const [route, setRoute] = useState(window.location.hash);
  
  const [periode,      setPeriode]      = useState("1");
  const [minggu,       setMinggu]       = useState("");
  const [nama,         setNama]         = useState("");
  const [jumlah,       setJumlah]       = useState("");
  
  const [loading,      setLoading]      = useState(false);
  const [fetchingList, setFetchingList] = useState(false);
  
  const [paidData, setPaidData] = useState({}); 
  const [studentActivePeriod, setStudentActivePeriod] = useState({}); 
  const [leaderboard, setLeaderboard] = useState([]); 
  const [totalCash,   setTotalCash]    = useState(0); 
  
  const [expenses,     setExpenses]     = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);
  
  const [isExpenseMode, setIsExpenseMode] = useState(false);
  const [expKeterangan, setExpKeterangan] = useState("");
  const [expJumlah,     setExpJumlah]     = useState("");

  const [notification, setNotification] = useState(null);

  // Router Listener
  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  
  // Render Ringkasan Saldo (Kartu Dashboard)
  const renderDashboardCards = () => (
    <div className="dashboard-grid">
      <div className="total-cash-card" style={{margin: 0}}>
        <div className="total-cash-info">
          <span className="total-cash-label">Total Uang Masuk</span>
          <span className="total-cash-amount">
            Rp {(totalCash + SALDO_AWAL).toLocaleString("id-ID")}
          </span>
          <span style={{fontSize: "0.7em", opacity: 0.7}}>+ Saldo Awal Rp 130rb</span>
        </div>
        <div className="total-cash-icon">💰</div>
      </div>

      <div className="total-cash-card" style={{margin: 0, background: "linear-gradient(135deg, #742a2a 0%, #c53030 100%)"}}>
        <div className="total-cash-info">
          <span className="total-cash-label">Total Pengeluaran</span>
          <span className="total-cash-amount">
            Rp {totalExpense.toLocaleString("id-ID")}
          </span>
        </div>
        <div className="total-cash-icon">📤</div>
      </div>

      <div className="total-cash-card" style={{margin: 0, background: "linear-gradient(135deg, #276749 0%, #48bb78 100%)"}}>
        <div className="total-cash-info">
          <span className="total-cash-label">Sisa Saldo</span>
          <span className="total-cash-amount">
            Rp {(totalCash + SALDO_AWAL - totalExpense).toLocaleString("id-ID")}
          </span>
        </div>
        <div className="total-cash-icon">💎</div>
      </div>
    </div>
  );

  // ── 1. AMBIL DATA DARI GOOGLE SHEETS ──
  useEffect(() => {
    let cancelled = false;
    setFetchingList(true);

    const params = new URLSearchParams({ action: "getData" });
    fetch(`${GAS_URL}?${params}`)
      .then(r => r.json())
      .then(data => {
        console.log("Data dari Google Sheets:", data);
        if (cancelled) return;
          if (data.status === "success") {
            const rawPaidData = data.paidData || {};
            setPaidData(rawPaidData);
            recalculateDataIntegrity(rawPaidData);

            setExpenses(data.expenses || []);
            setTotalExpense(data.totalExpense || 0);

            // Coba hitung dari cashData (GAS baru)
            const rawCashData = data.cashData || {};
            const computedTotal = Object.values(rawCashData)
              .flatMap(periodStudents => Object.values(periodStudents))
              .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

            if (computedTotal > 0) {
              setTotalCash(computedTotal);
            } else if ((data.totalCash || 0) > 0) {
              setTotalCash(data.totalCash);
            } else {
              let estimasi = 0;
              for (const p in rawPaidData) {
                for (const n in rawPaidData[p]) {
                  const weeks = rawPaidData[p][n] || [];
                  estimasi += weeks.length * 5000;
                }
              }
              setTotalCash(estimasi);
            }
          }
      })
      .catch(() => {
        if (!cancelled) showNotification("error", "❌ Gagal memuat sinkronisasi data dari spreadsheet.");
      })
      .finally(() => { if (!cancelled) setFetchingList(false); });

    return () => { cancelled = true; };
  }, []);

  // ── 2. LOGIKA MENGHITUNG PERIODE AKTIF & POIN KLASEMEN ──
  const recalculateDataIntegrity = (currentPaidData) => {
    // 2a. Hitung Periode Aktif
    const activePDict = {};
    DAFTAR_NAMA.forEach(n => {
       let p = 1;
       while (true) {
         const pData = currentPaidData[p] || {};
         const weeks = pData[n] || [];
         if (weeks.length < 4) {
             activePDict[n] = p; // Belum lunas 4 minggu
             break;
         }
         p++; 
       }
    });
    setStudentActivePeriod(activePDict);

    // 2b. Hitung Klasemen Poin
    let arrLeaderboard = DAFTAR_NAMA.map(n => {
      let poin = 0;
      for (const p in currentPaidData) {
         const weeks = currentPaidData[p][n] || [];
         poin += weeks.length;
      }
      return { nama: n, poin };
    });

    // Urutkan (Descend poin tertinggi). Jika poin sama, urutkan abjad
    arrLeaderboard.sort((a,b) => b.poin - a.poin || a.nama.localeCompare(b.nama));

    // Berikan label ranking
    let currentRank = 1;
    let rankGaps = 0;
    arrLeaderboard = arrLeaderboard.map((item, index) => {
       if (index > 0 && item.poin < arrLeaderboard[index - 1].poin) {
           currentRank += rankGaps + 1;
           rankGaps = 0;
       } else if (index > 0 && item.poin === arrLeaderboard[index - 1].poin) {
           rankGaps++;
       }
       return { ...item, rank: currentRank };
    });

    setLeaderboard(arrLeaderboard);
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // ── 3. FILTERING DROPDOWN SISWA SECARA DINAMIS ──
  let siswaList = [];
  if (periode && minggu) {
    const periNum = Number(periode);
    const mnguNum = Number(minggu);
    
    const eligibleStudents = DAFTAR_NAMA.filter(n => studentActivePeriod[n] === periNum);
    siswaList = eligibleStudents.filter(n => {
       const alreadyPaidWeeks = (paidData[periNum] && paidData[periNum][n]) || [];
       // FIX: Harus urut. Hanya muncul jika mnguNum adalah minggu berikutnya
       const nextWeek = alreadyPaidWeeks.length + 1;
       return mnguNum === nextWeek;
    });
  }

  useEffect(() => {
    if (minggu && nama && !siswaList.includes(nama)) setNama("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode, minggu, siswaList, nama]);

  const maxActiveP = Math.max(...Object.values(studentActivePeriod).concat(1));
  const periodeOptions = Array.from({length: maxActiveP}, (_, i) => i + 1);

  // ── 4. SUBMIT KE DATABASE ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!periode || !minggu || !nama || !jumlah || Number(jumlah) <= 0) {
      showNotification("error", "❌ Harap lengkapi formulir pembayaran dengan benar!");
      return;
    }
    setLoading(true);

    try {
      const params = new URLSearchParams({ action: "addPayment", nama: nama.trim(), periode, minggu, jumlah });
      await fetch(`${GAS_URL}?${params}`, { method: "GET", mode: "no-cors" });

      showNotification("success", `✅ Pembayaran ${nama} (P${periode}-M${minggu}) Rp ${Number(jumlah).toLocaleString("id-ID")} tersimpan!`);
      const newPaidData = JSON.parse(JSON.stringify(paidData));
      if (!newPaidData[periode]) newPaidData[periode] = {};
      if (!newPaidData[periode][nama]) newPaidData[periode][nama] = [];
      newPaidData[periode][nama].push(Number(minggu));
      
      setPaidData(newPaidData);
      setTotalCash(prev => prev + Number(jumlah));
      recalculateDataIntegrity(newPaidData);

      setNama("");
      setJumlah("");
      
      // Beri notifikasi tambahan bahwa sinkronisasi di latar belakang akan memakan waktu
      console.log("Data tersimpan secara lokal. Sinkronisasi server sedang berjalan...");
    } catch {
      showNotification("error", "❌ Gagal mengirim data. Periksa koneksi internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expKeterangan || !expJumlah || Number(expJumlah) <= 0) {
      showNotification("error", "❌ Harap lengkapi formulir pengeluaran!");
      return;
    }
    const expAmountNum = Number(expJumlah);
    setLoading(true);

    try {
      const params = new URLSearchParams({ 
        action: "addExpense", 
        keterangan: expKeterangan, 
        jumlah: expAmountNum.toString(),
        // Fallback names
        desc: expKeterangan,
        amount: expAmountNum.toString()
      });
      
      // Gunakan fetch tanpa no-cors untuk melihat apakah ada error (meskipun akan diblokir CORS jika gagal, tapi setidaknya request terkirim)
      await fetch(`${GAS_URL}?${params}`, { method: "GET", mode: "no-cors" });

      showNotification("success", `✅ Pengeluaran "${expKeterangan}" sebesar Rp ${Number(expJumlah).toLocaleString("id-ID")} tersimpan!`);
      
      setExpenses(prev => [{ date: new Date(), desc: expKeterangan, amount: Number(expJumlah) }, ...prev]);
      setTotalExpense(prev => prev + Number(expJumlah));

      setExpKeterangan("");
      setExpJumlah("");
      
      console.log("Pengeluaran tersimpan secara lokal.");
    } catch {
      showNotification("error", "❌ Gagal mencatat pengeluaran.");
    } finally {
      setLoading(false);
    }
  };

  const isPeriodCleared = periode && minggu && !fetchingList && DAFTAR_NAMA.filter(n => studentActivePeriod[n] === Number(periode)).length === 0;
  const isWeekPaid      = periode && minggu && !fetchingList && !isPeriodCleared && siswaList.length === 0;

  // Render Papan Klasemen
  const renderLeaderboard = (isFullscreen = false) => (
    <div className={`card leaderboard ${isFullscreen ? "leaderboard-fullscreen" : ""}`}>
      <h2 className="card-title" style={{textAlign: "center", marginBottom: "1rem"}}>
        🏆 Klasemen Sultan Kas
      </h2>
      <div className="leaderboard-list">
        {leaderboard.map((item) => {
          let itemClass = "lb-item ";
          let rankBadge = item.rank;
          let suffix = "";
          
          if (item.poin === 0) {
             itemClass += "lb-zero";
             suffix = " (Menunggak Total)";
             rankBadge = "⚠️";
          } else if (item.rank === 1) {
             itemClass += "lb-sultan"; 
             rankBadge = "👑";
          } else if (item.rank <= 3) {
             itemClass += "lb-top";
          }

          return (
            <div key={item.nama} className={itemClass} style={{
                display: "flex", 
                justifyContent: "space-between", 
                padding: isFullscreen ? "16px 20px" : "12px", 
                fontSize: isFullscreen ? "1.2rem" : "1rem",
                marginBottom: "8px",
                borderRadius: "8px",
                background: item.poin === 0 ? "rgba(255, 100, 100, 0.1)" : "rgba(255, 255, 255, 0.05)",
                borderLeft: item.poin === 0 ? "5px solid #ff4d4f" : (item.rank === 1 ? "5px solid #ffd700" : "5px solid transparent")
            }}>
               <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
                 <span style={{fontWeight: "bold", width: "30px", textAlign: "center"}}>{rankBadge}</span>
                 <span>{item.nama} <span style={{fontSize: "0.8em", opacity: 0.7}}>{suffix}</span></span>
               </div>
               <div style={{fontWeight: "bold", color: item.poin === 0 ? "#ff4d4f" : "#4ade80"}}>
                 {item.poin} Poin
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // JIKA ROUTE ADALAH BENDAHARA (URL RAHASIA)
  if (route === "#/AAAA") {
    return (
    <div className="page">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="container">
        {/* Header */}
        <header className="header">
          <div className="header-icon">💰</div>
          <h1 className="header-title">Kas Kelas</h1>
          <p className="header-subtitle">Sistem Pencatatan Multi-Periode</p>
        </header>

        {/* Notification */}
        {notification && (
          <div className={`notification notification--${notification.type}`}>
            {notification.message}
          </div>
        )}

        {/* Main Content Layout */}
        <div className="main-content">
          {/* KIRI: Form & Info */}
          <div className="left-pane">
            <div className="card">
              <div className="card-tabs" style={{display: "flex", gap: "10px", marginBottom: "1.5rem"}}>
                <button 
                  className={`tab-btn ${!isExpenseMode ? "active" : ""}`}
                  onClick={() => setIsExpenseMode(false)}
                >
                  📥 Pemasukan (Kas)
                </button>
                <button 
                  className={`tab-btn ${isExpenseMode ? "active" : ""}`}
                  onClick={() => setIsExpenseMode(true)}
                >
                  📤 Pengeluaran
                </button>
              </div>

              {!isExpenseMode ? (
                <>
              <h2 className="card-title">Form Pembayaran</h2>
          <form onSubmit={handleSubmit} className="form">

            {/* ── STEP 1: Pilih Periode ── */}
            <div className="field form-row-2">
              <div className="field-child">
                <label htmlFor="periode" className="label">
                  <span className="step-badge">1</span>
                  Periode (Bulan)
                </label>
                <select
                  id="periode"
                  className="input select"
                  value={periode}
                  onChange={(e) => setPeriode(e.target.value)}
                  disabled={loading || fetchingList}
                >
                  {periodeOptions.map(p => (
                    <option key={p} value={p}>Periode {p}</option>
                  ))}
                </select>
              </div>

            {/* ── STEP 2: Pilih Minggu ── */}
              <div className="field-child">
                <label htmlFor="minggu" className="label">
                  <span className="step-badge">2</span>
                  Minggu ke-
                </label>
                <select
                  id="minggu"
                  className="input select"
                  value={minggu}
                  onChange={(e) => setMinggu(e.target.value)}
                  disabled={loading || fetchingList}
                >
                  <option value="">-- Pilih --</option>
                  <option value="1">Minggu 1</option>
                  <option value="2">Minggu 2</option>
                  <option value="3">Minggu 3</option>
                  <option value="4">Minggu 4</option>
                </select>
              </div>
            </div>

            {/* ── STEP 3: Pilih Nama ── */}
            {minggu && periode && (
              <div className="field">
                <label htmlFor="nama" className="label">
                  <span className="step-badge">3</span>
                  Nama Siswa&nbsp;
                  {fetchingList && <span className="label-hint">Memuat data...</span>}
                  {!fetchingList && !isPeriodCleared && !isWeekPaid && (
                    <span className="label-hint">{siswaList.length} tagihan</span>
                  )}
                </label>

                {isPeriodCleared ? (
                   <div className="all-paid-badge" style={{background: '#e0f2f1', color: '#00695c'}}>
                     🎉 Tidak ada yang berhutang di Periode {periode}. Semua telah pindah ke periode selanjutnya!
                   </div>
                ) : isWeekPaid ? (
                  <div className="all-paid-badge">
                    ✅ Semua anak di Periode {periode} sudah lunas untuk Minggu ke-{minggu}
                  </div>
                ) : (
                  <select
                    id="nama"
                    className="input select"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    disabled={loading || fetchingList || siswaList.length === 0}
                  >
                    <option value="">
                      {fetchingList ? "Sedang verifikasi lintas-periode..." : "-- Pilih Siswa yang Menunggak --"}
                    </option>
                    {siswaList.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* ── STEP 4: Jumlah Pembayaran ── */}
            {nama && (
              <div className="field">
                <label htmlFor="jumlah" className="label">
                  <span className="step-badge">4</span>
                  Jumlah Pembayaran (Rp)
                </label>
                <div className="input-wrapper">
                  <span className="prefix">Rp</span>
                  <input
                    id="jumlah"
                    type="number"
                    className="input input--prefixed"
                    placeholder="0"
                    value={jumlah}
                    onChange={(e) => setJumlah(e.target.value)}
                    min="1"
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* ── Submit ── */}
            {nama && (
              <button
                type="submit"
                className={`btn ${loading ? "btn--loading" : ""}`}
                disabled={loading || !jumlah || Number(jumlah) <= 0}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Memproses...
                  </>
                ) : (
                  `💾 Catat — ${nama} (P${periode} / M${minggu})`
                )}
              </button>
            )}
          </form>
          </>
          ) : (
            <>
            <h2 className="card-title">Form Pengeluaran</h2>
            <form onSubmit={handleExpenseSubmit} className="form">
               <div className="field">
                <label htmlFor="expKet" className="label">Keterangan Pengeluaran</label>
                <input
                  id="expKet"
                  className="input"
                  placeholder="Misal: Beli sapu, fotocopy, dll"
                  value={expKeterangan}
                  onChange={(e) => setExpKeterangan(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="field">
                <label htmlFor="expJml" className="label">Jumlah (Rp)</label>
                <div className="input-wrapper">
                  <span className="prefix">Rp</span>
                  <input
                    id="expJml"
                    type="number"
                    className="input input--prefixed"
                    placeholder="0"
                    value={expJumlah}
                    onChange={(e) => setExpJumlah(e.target.value)}
                    min="1"
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                type="submit"
                className={`btn btn--expense ${loading ? "btn--loading" : ""}`}
                style={{background: "#e53e3e"}}
                disabled={loading || !expKeterangan || !expJumlah}
              >
                {loading ? "Memproses..." : "📤 Catat Pengeluaran"}
              </button>
            </form>
            </>
          )}
        </div>

        {/* Info Card */}
        <div className="info-card">
          <h3 className="info-title">ℹ️ Tautan Pintar</h3>
          <ol className="info-list">
            <li>Ini adalah Halaman Bendahara (Rahasia).</li>
            <li>Bagikan ke siswa tautan: <a href="/" style={{color: "#63b3ed", fontWeight: "bold"}}>Halaman Klasemen Publik ↗</a></li>
          </ol>
        </div>
        </div> {/* End Kiri */}

        {/* KANAN: Dashboard & Klasemen */}
        <div className="right-pane">
           {!fetchingList && renderDashboardCards()}
           {renderLeaderboard()}
        </div> {/* End Kanan */}
        </div> {/* End Main Content */}

      </div>
    </div>
    );
  }

  // DEFAULT ROUTE: Tampilkan Klasemen (halaman publik)
  return (
    <div className="page">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      
      <div className="container" style={{ maxWidth: "800px" }}>
        <header className="header">
           <div className="header-icon">🏅</div>
           <h1 className="header-title">Papan Peringkat</h1>
           <p className="header-subtitle">Status Pembayaran Uang Kas Kelas Real-Time</p>
        </header>
        {fetchingList && <p style={{textAlign:"center", color: "#63b3ed", marginBottom: "1rem"}}>Mensinkronkan Data...</p>}

        {/* --- TOTAL CASH CARD (ENHANCED) --- */}
        {!fetchingList && renderDashboardCards()}

        {/* --- DAFTAR PENGELUARAN --- */}
        {!fetchingList && expenses.length > 0 && (
           <div className="card" style={{marginBottom: "1.5rem"}}>
              <h2 className="card-title" style={{fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "8px"}}>
                📋 Riwayat Pengeluaran
              </h2>
              <div style={{maxHeight: "200px", overflowY: "auto"}}>
                {expenses.map((exp, i) => (
                  <div key={i} style={{display: "flex", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.05)"}}>
                    <div>
                      <div style={{fontWeight: "bold"}}>{exp.desc}</div>
                      <div style={{fontSize: "0.8em", opacity: 0.6}}>{new Date(exp.date).toLocaleDateString("id-ID")}</div>
                    </div>
                    <div style={{color: "#feb2b2", fontWeight: "bold"}}>- Rp {Number(exp.amount).toLocaleString("id-ID")}</div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {renderLeaderboard(true)}
      </div>
    </div>
  );
}
