class UIComponents {
    static showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('weather-display').style.display = 'none';
    }

    static hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    static showError(message) {
        const errorDiv = document.getElementById('location-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Hide error after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    static hideError() {
        document.getElementById('location-error').style.display = 'none';
    }

    static showWeatherDisplay() {
        document.getElementById('weather-display').style.display = 'block';
    }

    // Show autocomplete results
    static showAutocompleteResults(locations) {
        const resultsContainer = document.getElementById('autocomplete-results');

        if (locations.length === 0) {
            resultsContainer.style.display = 'none';
            return;
        }

        let resultsHTML = '';
        locations.forEach(location => {
            const displayName = this.formatLocationName(location);
            resultsHTML += `
                <div class="autocomplete-item" data-lat="${location.lat}" data-lon="${location.lon}">
                    <div class="city-name">${location.name}</div>
                    <div class="location-details">
                        ${displayName}
                        <span class="country">${location.country}</span>
                    </div>
                </div>
            `;
        });

        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.style.display = 'block';
    }

    // Hide autocomplete results
    static hideAutocompleteResults() {
        const resultsContainer = document.getElementById('autocomplete-results');
        resultsContainer.style.display = 'none';
    }

    // Format location name for display
    static formatLocationName(location) {
        let details = [];
        if (location.admin1) details.push(location.admin1);
        if (location.admin2) details.push(location.admin2);
        return details.join(', ');
    }

    // Display current weather with better location handling
    static displayCurrentWeather(data, locationName) {
        const current = data.current;
        const locationElement = document.getElementById('current-location');
        const weatherElement = document.getElementById('current-weather-data');

        // Format location name properly
        const displayName = locationName.formatted_name ||
            (locationName.admin1 ?
                `${locationName.name}, ${locationName.admin1}` :
                `${locationName.name}, ${locationName.country}`) ||
            'Selected Location';

        locationElement.textContent = displayName;

        weatherElement.innerHTML = `
            <div class="weather-card">
                <div class="temp">${Math.round(current.temperature_2m)}°C</div>
                <div class="weather-desc">${this.getWeatherDescription(current.weather_code)}</div>
                <div class="weather-details">
                    <div class="detail">
                        <div class="label">Feels like</div>
                        <div class="value">${Math.round(current.apparent_temperature)}°C</div>
                    </div>
                    <div class="detail">
                        <div class="label">Humidity</div>
                        <div class="value">${current.relative_humidity_2m}%</div>
                    </div>
                    <div class="detail">
                        <div class="label">Wind</div>
                        <div class="value">${current.wind_speed_10m} km/h</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Display forecast
    static displayForecast(data) {
        const forecastContainer = document.getElementById('forecast');
        const daily = data.daily;

        let forecastHTML = '<h3>7-Day Forecast</h3><div class="forecast-days">';

        for (let i = 0; i < daily.time.length; i++) {
            const date = new Date(daily.time[i]);
            const dayName = date.toLocaleDateString('en', { weekday: 'short' });
            const weatherDesc = this.getWeatherDescription(daily.weather_code[i]);

            forecastHTML += `
                <div class="forecast-day">
                    <div class="day">${dayName}</div>
                    <div class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</div>
                    <div class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</div>
                    <div class="weather-desc">${weatherDesc}</div>
                </div>
            `;
        }

        forecastHTML += '</div>';
        forecastContainer.innerHTML = forecastHTML;
    }

    // Convert weather codes to English descriptions
    static getWeatherDescription(code) {
        const weatherCodes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            80: "Light rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail"
        };
        return weatherCodes[code] || `Weather code: ${code}`;
    }
}