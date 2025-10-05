class GeminiAI {
    constructor() {
        // Netlify frontend, Railway backend
        this.backendUrl = 'https://above-cloud-production.up.railway.app/api';
        this.conversationHistory = [];
    }

    async getWeatherAdvice(weatherData, userQuestion) {
        if (!weatherData || !weatherData.current) {
            return "Hava durumu verisi bulunamadı. Lütfen önce bir konum seçin.";
        }

        try {
            console.log('Sending request to:', `${this.backendUrl}/chat`); // Debug

            const response = await fetch(`${this.backendUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    weatherData,
                    userQuestion
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                // OPTIONAL CHAINING YERİNE NORMAL KONTROL
                const errorMessage = errorData && errorData.error ?
                    errorData.error :
                    `Backend error: ${response.status}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (data.success) {
                // Konuşma geçmişine ekle
                this.addToHistory(userQuestion, data.answer);
                return data.answer;
            } else {
                throw new Error(data.error || 'AI yanıt veremedi');
            }

        } catch (error) {
            console.error('AI error:', error);

            // Kullanıcı dostu hata mesajları
            if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                return "🌐 Backend bağlantı hatası. Lütfen daha sonra tekrar deneyin.";
            } else if (error.message.includes('API key')) {
                return "🔑 API key hatası. Lütfen daha sonra tekrar deneyin.";
            } else {
                return `❌ Hata: ${error.message}`;
            }
        }
    }

    getWeatherDescription(code) {
        const weatherCodes = {
            0: "açık gökyüzü",
            1: "çoğunlukla açık",
            2: "parçalı bulutlu",
            3: "kapalı",
            45: "sisli",
            48: "kırağılı sis",
            51: "hafif çisenti",
            53: "orta çisenti",
            55: "yoğun çisenti",
            61: "hafif yağmur",
            63: "orta yağmur",
            65: "şiddetli yağmur",
            80: "hafif sağanak",
            81: "orta sağanak",
            82: "şiddetli sağanak",
            95: "gök gürültülü fırtına",
            96: "hafif dolu",
            99: "şiddetli dolu"
        };
        return weatherCodes[code] || "bilinmeyen hava durumu";
    }

    addToHistory(question, answer) {
        this.conversationHistory.push({
            question,
            answer,
            timestamp: new Date().toLocaleTimeString('tr-TR')
        });

        // Son 5 mesajı tut
        if (this.conversationHistory.length > 5) {
            this.conversationHistory.shift();
        }
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    getHistory() {
        return [...this.conversationHistory];
    }
}