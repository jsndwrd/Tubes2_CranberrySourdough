# CSS Tracing Mechanism on DOM Tree using BFS and DFS

### IF2211 Algorithm Strategy 2nd Project

## Program Singkat

Project ini adalah visualizer penelusuran DOM tree untuk CSS selector. Pengguna bisa memasukkan URL atau raw HTML, lalu menjalankan traversal dengan BFS atau DFS untuk melihat node yang cocok, urutan kunjungan, dan hasil inspeksi DOM secara visual.

## Dependency

- Bun
- Node.js modern yang kompatibel dengan Vite
- Paket frontend utama: React, React DOM, Vite, Tailwind CSS

## Instalasi dan Run

```bash
bun install
bun dev
```

Kalau ingin build production:

```bash
bun run build
bun run preview
```

## Struktur Directory Program

```text
Tubes2_CranberrySourdough/
├─ backend/      # Server pendukung
│  └─ server.ts
├─ src/          # Source frontend
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ frontend/  # Komponen, logic, dan UI frontend
│  └─ lib/       # Utilitas parsing, search, tree, worker
├─ docs/         # Laporan dan aset dokumentasi
├─ public/       # Asset statis
└─ Dockerfile / docker-compose.yml
```


## Authors

Muhammad Nur Majiid (13524028)<br>
[GitHub Account](https://github.com/MAJIIDMN)
<br>

<hr/>

Jason Edward Salim (13524034)<br>
[Portfolio](https://www.jasonedward.dev)<br>
[GitHub Account](https://github.com/jsndwrd)<br>

<hr/>

Bryan Pratama Putra Hendra (13524067)<br>
[GitHub Account](https://github.com/BryannPPH)
