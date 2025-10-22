# Applet

## connection

Gunakan applet ini untuk menampilkan koneksi database yang Anda miliki

```bash
$ node index.js -a dobo:connection                        # Masuk ke mode interaktif
$ node index.js -a dobo:connection default                # Tampilkan koneksi dengan nama 'default'
$ node index.js -a dobo:connection default --format=json  # Tampilkan dalam format 'json'
```

## modelClear

Hapus tabel yang Anda inginkan. **Perhatian**: tabel akan dihapus dari database BESERTA isinya. Jadi pastikan bahwa Anda telah membackup tabel Anda terlebih dahulu sebelum Anda memanggil applet ini.

```bash
$ node index.js -a dobo:modelRebuild                      # Masuk ke mode interaktif
$ node index.js -a dobo:modelRebuild 'Cdb*'               # Hapus model dengan awalan 'Cdb'
```

## modelRebuild

Pada saat pertama kali sebuah plugin dimuat dan plugin meng-extend Dobo, Anda perlu memanggil applet ini untuk membuat tabel sesuai dengan skema yang telah ditentukan.

```bash
$ node index.js -a dobo:modelRebuild                      # Gunakan mode interaktif
$ node index.js -a dobo:modelRebuild CdbCountry Sumba     # Masukkan satu persatu nama modelnya
$ node index.js -a dobo:modelRebuild 'Cdb*'               # List semua model dengan awalan 'Cdb'
```
Setelah tabel sukses dibuat, maka jika model dilengkapi dengan fixture, fixture tersebut akan dimuat didalam tabel yang bersangkutan.

Jika tabel telah ada di database, Anda harus menggunakan switch ```--force``` untuk memaksa model bisa di hapus kemudian dibuat ulang kembali.

## recordCreate

Gunakan applet ini untuk membuat rekord:

```bash
$ node index.js -a dobo:recordCreate CdbCountry
ℹ App is running as applet...
✔ Enter JSON payload: { "id": "XX", "name": "My Country" }
╭ CdbCountry ─────────────╮
│ {                       │
│   "id": "XX",           │
│   "name": "My Country"  │
│ }                       │
╰─────────────────────────╯
? Are you sure to continue? (y/N)
```

## recordFind

Mencari rekord yang sesuai dengan kriteria pemilihan Anda. Jika kriteria tidak dimasukkan (filter kosong), maka akan diberikan semua rekord yang ada.

```bash

