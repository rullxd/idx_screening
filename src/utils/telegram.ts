/**
 * Utilitas untuk mengirim notifikasi ke Telegram menggunakan Bot API.
 */

// Kami menggunakan variabel lingkungan untuk keamanan
// Catatan: Di Vite, variabel lingkungan harus diawali dengan VITE_ jika ingin diakses di sisi client.
// Namun, karena ini dijalankan dalam konteks ini, kami akan mencoba mengambilnya secara langsung
// atau melalui mekanisme yang sesuai.

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || '';

/**
 * Mengirim pesan teks ke chat Telegram yang dikonfigurasi.
 * @param message Pesan yang akan dikirim.
 */
export async function sendTelegramNotification(message: string): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('[Telegram] Kredensial tidak lengkap. Notifikasi tidak terkirim.');
        return false;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('[Telegram] Gagal mengirim pesan:', data.description);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Telegram] Kesalahan saat mengirim notifikasi:', error);
        return false;
    }
}