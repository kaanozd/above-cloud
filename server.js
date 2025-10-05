import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules için __dirname equivalent
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ✅ STATIC FILES - KESİN ÇÖZÜM
app.use(express.static(path.join(__dirname, 'public')));

// Hava durumu endpoint'i - 7 GÜNLÜK TAHMİN
app.get('/api/weather', async(req, res) => {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude ve longitude gerekli' });
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Hava durumu API hatası: ${response.status}`);
        }

        const weatherData = await response.json();
        res.json(weatherData);

    } catch (error) {
        console.error('Hava durumu hatası:', error);
        res.status(500).json({ error: 'Hava durumu alınamadı' });
    }
});

// AI endpoint'i - GÜN TESPİTLİ
app.post('/api/chat', async(req, res) => {
            try {
                const { weatherData, userQuestion } = req.body;

                console.log('Chat endpoint called:', { userQuestion });

                if (!weatherData || !userQuestion) {
                    return res.status(400).json({
                        success: false,
                        error: 'Weather data ve soru gerekli'
                    });
                }

                const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

                if (!GEMINI_API_KEY) {
                    console.error('GEMINI_API_KEY bulunamadı');
                    return res.status(500).json({
                        success: false,
                        error: 'API key bulunamadı'
                    });
                }

                const currentWeather = weatherData.current;
                const dailyForecast = weatherData.daily;

                // Gün isimlerini hazırla
                const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                const today = new Date();
                const dailyData = [];

                for (let i = 0; i < dailyForecast.time.length; i++) {
                    const date = new Date(dailyForecast.time[i]);
                    const dayIndex = date.getDay();
                    dailyData.push({
                        dayName: dayNames[dayIndex],
                        date: dailyForecast.time[i],
                        maxTemp: Math.round(dailyForecast.temperature_2m_max[i]),
                        minTemp: Math.round(dailyForecast.temperature_2m_min[i]),
                        weatherCode: dailyForecast.weather_code[i]
                    });
                }

                const prompt = `
HAFTALIK HAVA DURUMU VERİLERİ:

📍 Konum: ${weatherData.locationName?.formatted_name || 'Seçilen konum'}

🌡️ MEVCUT DURUM (${dayNames[today.getDay()]}):
- Sıcaklık: ${Math.round(currentWeather.temperature_2m)}°C
- Hissedilen: ${Math.round(currentWeather.apparent_temperature)}°C
- Nem: ${currentWeather.relative_humidity_2m}%
- Rüzgar: ${currentWeather.wind_speed_10m} km/s
- Hava: ${getWeatherDescription(currentWeather.weather_code)}

📅 7 GÜNLÜK TAHMİN:
${dailyData.map(day => 
`- ${day.dayName}: ${day.maxTemp}°C / ${day.minTemp}°C, ${getWeatherDescription(day.weatherCode)}`
).join('\n')}

🎯 KULLANICI SORUSU: "${userQuestion}"

🌟 TALİMATLAR:
1. Kullanıcının sorduğu günün hava durumunu kullan
2. Sadece yukarıdaki hava verilerini kullan
3. Türkçe yanıt ver
4. Kısa ve öz ol
5. Doğal konuş
6. Biraz daha canlı ve samimi ol
7. Uygun yerlere çok sık olmamak şartıyla emojiler koy
        `.trim();

        console.log('Gemini API çağrısı yapılıyor...');

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        console.log('Gemini response status:', geminiResponse.status);

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API error:', errorText);
            throw new Error(`Gemini API hatası: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        
        if (geminiData.candidates && geminiData.candidates[0]) {
            res.json({
                success: true,
                answer: geminiData.candidates[0].content.parts[0].text
            });
        } else {
            throw new Error('Gemini yanıt vermedi');
        }

    } catch (error) {
        console.error('Chat endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

function getWeatherDescription(code) {
    const weatherCodes = {
        0: "açık",
        1: "az bulutlu",
        2: "parçalı bulutlu",
        3: "kapalı",
        45: "sisli",
        48: "sisli",
        51: "hafif yağmurlu",
        53: "yağmurlu",
        61: "yağmurlu",
        63: "şiddetli yağmurlu",
        80: "sağanak",
        95: "gök gürültülü",
        96: "dolu"
    };
    return weatherCodes[code] || "açık";
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'AboveCloud Backend çalışıyor',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint - Frontend'i serve et
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint bulunamadı' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ AboveCloud Backend PORT ${PORT} adresinde çalışıyor`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
app.use(cors({
    origin: [
        'https://your-netlify-domain.netlify.app',
        'http://localhost:3000'
    ],
    credentials: true
}));