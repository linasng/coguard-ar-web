// Fitur 1: Geofencing & AR Overlay (sama seperti sebelumnya, tidak berubah)
function startGeofencing() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('ar-scene').style.display = 'block';
    document.getElementById('canvas').style.display = 'none'; // Sembunyikan canvas untuk fitur 1

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            console.log(`Lokasi: ${lat}, ${lon}`);

            const zonaLat = -6.2088;
            const zonaLon = 106.8456;
            const distance = getDistance(lat, lon, zonaLat, zonaLon);
            if (distance <= 0.1) {
                showNotification('Perhatian! Anda Memasuki Zona Wisata Bersih. Dilarang Keras: Membuang puntung rokok, Membuang Sampah, atau Mengambil Objek Alam. Mari Jaga Keaslian Alam Ini Bersama.');
            }
        }, error => console.error('Error geolocation:', error), { enableHighAccuracy: true });
    } else {
        alert('Browser tidak support geolocation. Gunakan HP dengan GPS.');
    }
}

// Fungsi hitung jarak (sama)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Notifikasi (sama)
function showNotification(message) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.style.display = 'block';
    setTimeout(() => notif.style.display = 'none', 5000);
    if (Notification.permission === 'granted') {
        new Notification('EcoGuard Alert', { body: message });
    } else {
        Notification.requestPermission();
    }
}

// Fitur 2: AR Simulation & ML (UPDATED)
let detectInterval; // Untuk stop loop

async function startSimulation() {
    document.getElementById('home').style.display = 'none';
    document.getElementById('sim-scene').style.display = 'block';
    document.getElementById('canvas').style.display = 'block'; // Tampilkan canvas overlay

    // Load ML Model
    try {
        const model = await cocoSsd.load();
        console.log('Model ML loaded successfully!'); // Debug: Konfirmasi load

        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Akses kamera (sudah fix sebelumnya)
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }) // Ganti ke 'user' untuk laptop front camera
            .then(stream => {
                video.srcObject = stream;
                video.play();
                video.onloadedmetadata = () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.style.position = 'fixed'; // Overlay fixed
                    canvas.style.top = '0';
                    canvas.style.left = '0';
                    canvas.style.zIndex = '1000'; // Di atas AR scene
                    console.log('Kamera ready, mulai deteksi...'); // Debug
                    detectLoop(model, video, ctx);
                };
            })
            .catch(error => {
                console.error('Error akses kamera:', error);
                alert('Izinkan akses kamera. Di laptop, coba tutup app lain yang pakai kamera.');
            });
    } catch (error) {
        console.error('Error load model:', error);
        alert('Gagal load model ML. Cek internet (CDN TensorFlow).');
    }
}

async function detectLoop(model, video, ctx) {
    // Clear canvas setiap frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Deteksi
    const predictions = await model.detect(video);
    console.log('Predictions:', predictions); // DEBUG: Lihat di console apa yang dideteksi

    let hasTrash = false;
    predictions.forEach((pred, index) => {
        const score = pred.score;
        const className = pred.class;
        console.log(`Objek ${index}: ${className} dengan score ${ (score * 100).toFixed(1) }%`); // DEBUG per objek

        // Adaptasi: Deteksi botol/gelas sebagai sampah, atau objek apa saja jika score tinggi
        if ((className === 'bottle' || className === 'cup' || className.includes('plastic')) || score > 0.3) {
            hasTrash = true;
            // Gambar kotak merah
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 3;
            ctx.strokeRect(pred.bbox[0], pred.bbox[1], pred.bbox[2], pred.bbox[3]);
            // Label
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.fillText(`${className} (${(score * 100).toFixed(0)}%) - SAMPAH TERDETEKSI!`, pred.bbox[0], pred.bbox[1] - 5);
        }
    });

    if (hasTrash) {
        console.log('TRASH DETECTED! Trigger notifikasi.'); // DEBUG
        showNotification('Inilah Efek Jangka Panjangnya: Sampah Plastik Ini Butuh 450 Tahun untuk Hilang. Bertindak Sekarang, Lindungi Ekosistem Laut/Darat. [Jumlah Sampah] per bulan: 500 kg.');
        // AR Simulation: Sphere sudah muncul di scene (jika marker ada)
    } else {
        console.log('No trash detected this frame.'); // DEBUG jika kosong
    }

    // Loop setiap 500ms (bukan requestAnimationFrame, agar tidak terlalu cepat di laptop)
    detectInterval = setTimeout(() => detectLoop(model, video, ctx), 500);
}

// Kembali ke home (UPDATED: Stop loop)
function goHome() {
    document.getElementById('home').style.display = 'block';
    document.getElementById('ar-scene').style.display = 'none';
    document.getElementById('sim-scene').style.display = 'none';
    document.getElementById('canvas').style.display = 'none';
    
    // Stop video dan loop
    const video = document.getElementById('video');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    if (detectInterval) {
        clearTimeout(detectInterval);
    }
}