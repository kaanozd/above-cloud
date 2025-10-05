class GeminiAI {
    constructor() {
        this.backendUrl = 'http://localhost:3001/api';
        this.conversationHistory = [];
    }

    async getWeatherAdvice(weatherData, userQuestion) {
        if (!weatherData || !weatherData.current) {
            return "Hava durumu verisi bulunamadı. Lütfen önce bir konum seçin.";
        }

        try {
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
                // ERROR MESAJINI DEĞİŞTİRMEDEN AYNEN DÖNDÜR
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                return data.answer;
            } else {
                throw new Error(data.error || 'AI yanıt veremedi');
            }

        } catch (error) {
            console.error('AI error:', error);
            // ERROR'U DEĞİŞTİRMEDEN AYNEN DÖNDÜR
            return error.message;
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
        this.conversationHistory.push({ question, answer, timestamp: new Date().toISOString() });
        if (this.conversationHistory.length > 5) this.conversationHistory.shift();
    }
}