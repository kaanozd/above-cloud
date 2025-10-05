class WeatherService {
    constructor() {
        this.backendUrl = 'http://localhost:3001/api';
    }

    async getComprehensiveWeather(lat, lon) {
        try {
            const response = await fetch(`${this.backendUrl}/weather?lat=${lat}&lon=${lon}`);

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Hava durumu alınamadı:', error);
            throw new Error('Hava durumu servisine ulaşılamıyor. Backend çalışıyor mu?');
        }
    }

    async getCurrentWeather(lat, lon) {
        return this.getComprehensiveWeather(lat, lon);
    }
}