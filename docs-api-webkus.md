# Dokumentasi API Webkus (Unofficial) by Elfa Digital

Dokumentasi ini dibuat berdasarkan hasil rekayasa balik (*reverse-engineering*) dari situs web `elfa-dev.webkus.com` (Webkus v3.4) melalui serangkaian panggilan API nyata pada tanggal 11 Maret 2026. Gunakan sebagai panduan untuk memahami bagaimana cara berinteraksi dengan backend Webkus.

**Base URL**: `https://{nama-toko-anda}.webkus.com`

---

## Konsep Kunci: `local_id`

Sebagian besar interaksi API yang terkait dengan pengguna (seperti keranjang belanja) tidak menggunakan autentikasi akun pengguna tradisional. Sebagai gantinya, Webkus mengidentifikasi setiap pengunjung unik menggunakan sebuah `local_id`.

-   **Apa itu `local_id`?**: Sebuah string unik yang secara otomatis dibuat oleh Webkus untuk setiap pengunjung baru.
-   **Bagaimana cara kerjanya?**: `local_id` ini disimpan di dalam `localStorage` browser pengunjung. Setiap kali pengunjung kembali, ID ini digunakan untuk mengambil data keranjang mereka.
-   **Bagaimana cara mendapatkannya?**: Anda bisa mendapatkan `local_id` pertama kali dengan memanggil endpoint `GET /api/get-data/-`. Tanda `-` menandakan permintaan untuk `local_id` baru. API akan merespons dengan `local_id` yang bisa Anda gunakan untuk panggilan selanjutnya.

---

## Ringkasan Endpoint

### 1. Data Toko & Produk

Endpoint ini digunakan untuk mengambil informasi publik mengenai toko dan produk.

#### GET /api/info
Mengambil informasi konfigurasi dasar sebuah toko.

-   **Method**: `GET`
-   **Deskripsi**: Mengambil data konfigurasi dasar toko.
-   **Contoh `curl`**:
    ```bash
    curl -L "https://elfa-dev.webkus.com/api/info"
    ```
-   **Respons Sukses (Raw)**:
    ```json
    {
      "bootstrap_css": "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css",
      "contact_urls": "https://wa.me/085891113984,https://instagram.com/elfa_digital",
      "description": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "extended_css": "",
      "extended_html": "",
      "extended_js": "",
      "logo": "https://img.webkus.com/eciadmpiq/e6iqxaniq.webp",
      "name": "Elfa Dev"
    }
    ```

#### GET /api/get-data/{local_id}
Endpoint utama untuk memuat data halaman depan dan memulai sesi pengguna.

-   **Method**: `GET`
-   **Parameter URL**:
    -   `local_id` (string, wajib): ID unik pengunjung. Gunakan `-` untuk mendapatkan `local_id` baru.
-   **Deskripsi & Alur Implementasi**:
    Ini adalah endpoint terpenting untuk memulai sesi. Cukup satu panggilan untuk menangani pengguna baru maupun pengguna lama.
    1.  Saat halaman dimuat, periksa `localStorage` untuk `local_id` yang mungkin sudah ada.
    2.  Jika **tidak ada**, panggil endpoint ini menggunakan `-` (`GET /api/get-data/-`).
    3.  Jika **ada**, panggil endpoint ini menggunakan ID yang tersimpan (`GET /api/get-data/ID_YANG_TERSIMPAN`).
    4.  Respons dari panggilan akan selalu berisi data produk. Jika Anda menggunakan `-`, responsnya juga akan berisi `local_id` baru yang harus Anda simpan untuk panggilan selanjutnya.
-   **Contoh `curl`**:
    ```bash
    # Meminta data dan local_id baru
    curl -L "https://elfa-dev.webkus.com/api/get-data/-"
    ```
-   **Respons Sukses (Raw)**:
    ```json
    {
      "cart_count": 0,
      "local_id": "1773180573477_829959",
      "products": [
        {
          "id": "e7i9ybiq",
          "name": "Tes 1",
          "price": 500,
          "discount": 0,
          "description": "untuk Tes order",
          "photo": "https://img.webkus.com/eciadmpiq/e6iqxaniq.webp",
          "more_photos": [],
          "available_stock": 1,
          "unique_stock": false,
          "sold_count": 2,
          "category": "tes-order"
        },
        {
          "id": "e8ij7aiq",
          "name": "Template Webkus ",
          "price": 25000,
          "discount": 0,
          "description": "Tes",
          "photo": "https://img.webkus.com/eciadmpiq/ehiae1niq.webp",
          "more_photos": [],
          "available_stock": 1,
          "unique_stock": false,
          "sold_count": 0,
          "category": "template"
        }
      ],
      "social_proofs": [],
      "testimonials": [
        {
          "id": "euir7miq",
          "website_id": "e7i966iq",
          "name": "Her",
          "message": "Testi1",
          "position": 1,
          "updated_at": "0001-01-01T00:00:00Z"
        }
      ],
      "categories": [
        "tes-order",
        "template",
        "canva",
        "capcut",
        "netflix"
      ]
    }
    ```
-   **Penjelasan Kunci Respons**:
    -   `local_id` (string): ID unik sesi pengguna.
    -   `products` (array): Daftar produk.
        -   `unique_stock` (boolean): `true` untuk stok terbatas, `false` untuk stok tidak terbatas.
        -   `available_stock` (integer): Jumlah stok jika `unique_stock` adalah `true`.
    -   `categories` (array): Daftar nama kategori unik untuk membuat filter.
    -   `cart_count` (integer): Jumlah item di keranjang untuk `local_id` yang diberikan.

### 2. Manajemen Keranjang (Cart)

Semua endpoint di bawah ini memerlukan `local_id` untuk mengidentifikasi keranjang milik siapa.

#### POST /api/carts/{local_id}
Menambahkan sebuah produk ke dalam keranjang atau menambah jumlah (quantity) produk yang sudah ada di keranjang.

-   **Method**: `POST`
-   **Parameter URL**:
    -   `local_id` (string, wajib): ID unik pengunjung.
-   **Headers**: `Content-Type: application/json`
-   **Payload (Request Body)**:
    ```json
    {
      "product_id": "ID_PRODUK_YANG_AKAN_DITAMBAH"
    }
    ```
-   **Deskripsi**: Jika produk baru, akan ditambahkan dengan `quantity = 1`. Jika `product_id` tersebut sudah ada di keranjang, maka panggilan ini akan menambah jumlah produk tersebut (`quantity = quantity + 1`).
-   **Contoh `curl` (Simulasi)**:
    ```bash
    curl -L -X POST "https://elfa-dev.webkus.com/api/carts/1773180573477_829959" \
    -H "Content-Type: application/json" \
    -d '{"product_id": "e7i9ybiq"}'
    ```
-   **Respons Sukses (Raw)**:
    ```json
    {
      "cart_count": 1
    }
    ```
    *Catatan: `cart_count` merepresentasikan jumlah jenis (item unik) produk di dalam keranjang, bukan total kuantitas dari semua produk.*

#### GET /api/carts/{local_id}
Mengambil daftar item yang ada di dalam keranjang seorang pengunjung.

-   **Method**: `GET`
-   **Parameter URL**:
    -   `local_id` (string, wajib): ID unik pengunjung.
-   **Deskripsi**: Panggil endpoint ini untuk melihat semua item yang saat ini ada di keranjang belanja. `id` di level atas pada setiap item adalah `cart_item_id` yang digunakan untuk operasi PATCH atau DELETE.
-   **Contoh `curl` (Simulasi)**:
    ```bash
    curl -L "https://elfa-dev.webkus.com/api/carts/1773180573477_829959"
    ```
-   **Respons Sukses (Raw)**:
    ```json
    {
      "carts": [
        {
          "id": "4qiaxe7iq",
          "local_id": "1773180573477_829959",
          "product": {
            "id": "e7i9ybiq",
            "website_id": "e7i966iq",
            "name": "Tes 1",
            "photo": "https://img.webkus.com/eciadmpiq/e6iqxaniq.webp",
            "more_photos": [],
            "description": "untuk Tes order",
            "price": 500,
            "discount": 0,
            "position": 1,
            "unique_stock": false,
            "available_stock": 1,
            "sold_count": 2,
            "stock_guide": "Hanya untuk tes",
            "category": "tes-order",
            "created_at": "2025-12-24T09:16:22.086Z",
            "updated_at": "2026-03-09T13:49:02.923Z"
          },
          "product_id": "e7i9ybiq",
          "quantity": 1,
          "message": "",
          "created_at": "2026-03-10T22:10:18.561Z"
        }
      ]
    }
    ```

#### PATCH /api/carts/{local_id}/{cart_item_id}
Mengubah catatan pada sebuah item di keranjang. 

-   **Method**: `PATCH`
-   **Parameter URL**:
    -   `local_id` (string, wajib): ID unik pengunjung.
    -   `cart_item_id` (string, wajib): ID unik dari item di keranjang.
-   **Headers**: `Content-Type: application/json`
-   **Payload (Request Body)**:
    ```json
    {
      "message": "Ini adalah catatan baru untuk item ini."
    }
    ```
-   **Contoh `curl`**:
    ```bash
    curl -L -X PATCH "https://elfa-dev.webkus.com/api/carts/1773180573477_829959/4qiaxe7iq" \
    -H "Content-Type: application/json" \
    -d '{"message": "Catatan baru."}'
    ```

#### DELETE /api/carts/{local_id}/{cart_item_id}
Mengurangi jumlah (quantity) item dari keranjang. Jika quantity sudah mencapai 1, maka panggilan ini akan menghapus item tersebut dari keranjang.

-   **Method**: `DELETE`
-   **Parameter URL**:
    -   `local_id` (string, wajib): ID unik pengunjung.
    -   `cart_item_id` (string, wajib): ID unik dari item di keranjang.
-   **Deskripsi**: Setiap kali endpoint ini dipanggil, `quantity` dari `cart_item_id` tersebut akan berkurang 1.
-   **Contoh `curl`**:
    ```bash
    curl -L -X DELETE "https://elfa-dev.webkus.com/api/carts/1773180573477_829959/4qiaxe7iq"
    ```
-   **Respons Sukses (Raw)**:
    ```json
    {
      "cart": {
        "id": "4qiaxe7iq",
        "local_id": "1773180573477_829959",
        "product_id": "e7i9ybiq",
        "quantity": 1,
        "message": "",
        "created_at": "2026-03-10T22:10:18.561Z"
      }
    }
    ```
    *Catatan: Respons ini selalu mengembalikan data keranjang sebelum dihapus atau informasi tentang pengurangan quantity. Jika list `carts` dicek kembali setelah dihapus sampai 0, list akan kosong.*


### 3. Pesanan & Checkout

Proses terakhir dalam alur transaksi.

#### POST /api/checkout/{local_id}
Membuat pesanan baru dari semua item yang ada di keranjang seorang pengunjung.

-   **Method**: `POST`
-   **Parameter URL**:
    -   `local_id` (string, wajib): ID unik pengunjung.
-   **Headers**: `Content-Type: application/json`
-   **Payload (Request Body)**:
    ```json
    {
      "name": "Nama Pelanggan",
      "email": "email@pelanggan.com",
      "phone": "081234567890"
    }
    ```
-   **Contoh `curl` (Simulasi)**:
    ```bash
    curl -L -X POST "https://elfa-dev.webkus.com/api/checkout/1773180573477_829959" \
    -H "Content-Type: application/json" \
    -d '{"name": "Budi Tester", "email": "budi.tester@example.com", "phone": "081234567891"}'
    ```
-   **Respons Sukses (Raw)**:
    ```json
    {
      "order": {
        "id": "4qiax4ciqnuppel",
        "user_id": "eciadmpiq",
        "website_id": "e7i966iq",
        "product_id": "e7i9ybiq",
        "status": "pending",
        "description": "Tes 1",
        "name": "Budi Tester",
        "email": "budi.tester@example.com",
        "phone": "081234567891",
        "message": "",
        "price": 500,
        "qr_string": "00020101021226610016ID.CO.SHOPEE.WWW01189360091800216005230208216005230303UME51440014ID.CO.QRIS.WWW0215ID10243228429300303UME5204792953033605406814.005802ID5907Pakasir6012KAB. KEBUMEN6105543926222051810808137542205048363043210",
        "fee": 314,
        "total_payment": 814,
        "va_provider": "BRI",
        "va_number": "",
        "va_fee": 0,
        "va_total_payment": 0,
        "expires_at": "2026-03-10T23:11:44.59979989Z",
        "received": 0,
        "paid_at": null,
        "created_at": "2026-03-10T22:11:44.896Z",
        "items": [
          {
            "product_id": "e7i9ybiq",
            "product_name": "Tes 1",
            "photo": "https://img.webkus.com/eciadmpiq/e6iqxaniq.webp",
            "price": 500,
            "discount": 0,
            "message": "",
            "quantity": 1
          }
        ]
      }
    }
    ```

#### GET /api/orders/{order_id}
Mengambil detail sebuah pesanan, baik yang masih `pending` maupun yang sudah `completed`.

-   **Method**: `GET`
-   **Parameter URL**:
    -   `order_id` (string, wajib): ID pesanan yang didapat setelah checkout.
-   **Deskripsi**: Gunakan endpoint ini untuk mengecek status pesanan dan mendapatkan detail pengiriman jika sudah lunas.
-   **Contoh 1: Panggilan untuk Pesanan `pending`**
    -   **`curl`**: `curl -L "https://elfa-dev.webkus.com/api/orders/4qiax4ciqnuppel"
    -   **Respons (Raw)**:
        ```json
        {
          "cart_count": 0,
          "order": {
            "id": "4qiax4ciqnuppel",
            "status": "pending",
            "name": "Budi Tester",
            "email": "budi.tester@example.com",
            "phone": "081234567891",
            "price": 500,
            "fee": 314,
            "total_payment": 814,
            "expires_at": "2026-03-10T23:11:44.6Z",
            "items": [
              {
                "product_id": "e7i9ybiq",
                "product_name": "Tes 1",
                "photo": "https://img.webkus.com/eciadmpiq/e6iqxaniq.webp",
                "price": 500,
                "discount": 0,
                "message": "",
                "quantity": 1
              }
            ],
            "receipt": ""
          }
        }
        ```
-   **Contoh 2: Panggilan untuk Pesanan `completed`**
    -   **`curl`**: `curl -L "https://elfa-dev.webkus.com/api/orders/4qimytiq2zogx4"
    -   **Respons (Raw)**:
        ```json
        {
          "cart_count": 0,
          "order": {
            "id": "4qimytiq2zogx4",
            "status": "completed",
            "name": "elfadigitaladmin",
            "email": "elfadigitaladmin@telegram.org",
            "phone": "5825795221",
            "price": 500,
            "fee": 314,
            "total_payment": 814,
            "items": [
              {
                "product_id": "e7i9ybiq",
                "product_name": "Tes 1",
                "photo": "https://img.webkus.com/eciadmpiq/e6iqxaniq.webp",
                "price": 500,
                "discount": 0,
                "message": "",
                "quantity": 1,
                "file_value": "Email : tesorder@tes.xyz\nPassword : masuk123"
              }
            ],
            "receipt": "\n**Tes 1, 1 pcs**\n\n```\nPetunjuk & Ketentuan:\nHanya untuk tes
```\n\n```\nEmail : tesorder@tes.xyz\nPassword : masuk123\n```\n"
          }
        }
        ```
-   **Perbedaan Kunci**: Perhatikan bahwa pada pesanan `completed`, `items` berisi field `file_value` dan `order` berisi field `receipt`. Keduanya adalah data pengiriman produk digital yang tidak ada pada pesanan `pending`.
