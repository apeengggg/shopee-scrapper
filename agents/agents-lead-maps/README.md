# Lead Maps Agent

Web dashboard untuk mencari usaha dari OpenStreetMap/Overpass yang belum punya website, lalu menyimpan bisnis, nomor telepon, kategori, dan status lead ke PostgreSQL.

## Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Copy environment:

```powershell
Copy-Item .env.example .env
```

3. Jalankan PostgreSQL:

```powershell
docker compose up -d postgres
```

Database lokal dipublish di `127.0.0.1:15432` agar tidak bentrok dengan PostgreSQL lain di port `5432`.

4. Generate Prisma client dan migrate database:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
```

5. Jalankan app:

```powershell
npm.cmd run dev
```

Dashboard tersedia di `http://localhost:3001`.

## Cara Pakai

- Isi lokasi dan kategori usaha, lalu klik `Jalankan Search`.
- Lead `ready` berarti tidak ada website dan ada nomor telepon.
- Lead `candidate` berarti tidak ada website tapi belum ada nomor.
- Lead `ignored` berarti sudah punya website.
- Gunakan `Export CSV` untuk data penawaran.
- Buat campaign untuk pencarian berkala, lalu jalankan worker:

```powershell
npm.cmd run worker
```

## Catatan Sumber Data

Data gratis berasal dari OpenStreetMap. Kelengkapan nomor telepon dan website tergantung kontribusi komunitas, sehingga hasil tidak akan selengkap Google Maps. App memakai cache geocoding dan User-Agent yang bisa diubah lewat `APP_USER_AGENT`.
