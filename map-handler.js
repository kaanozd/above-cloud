class MapHandler {
    constructor(weatherApp) {
        this.weatherApp = weatherApp;
        this.map = null;
        this.marker = null;
        this.init();
    }

    init() {
        console.log('Initializing map...');
        // DOM'un tamamen yüklendiğinden emin ol
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeMap();
                this.bindMapEvents();
            });
        } else {
            this.initializeMap();
            this.bindMapEvents();
        }
    }

    initializeMap() {
        try {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                console.error('Map container not found!');
                return;
            }

            console.log('Map container found, initializing Leaflet...');

            // Dünya sınırları
            const southWest = L.latLng(-85, -180); // Güney batı köşe
            const northEast = L.latLng(85, 180); // Kuzey doğu köşe
            const bounds = L.latLngBounds(southWest, northEast);

            // Initialize the map with bounds
            this.map = L.map('map', {
                minZoom: 3,
                maxZoom: 12,
                maxBounds: bounds, // Sınırları belirle
                maxBoundsViscosity: 1.0 // Sınırlara yapışkanlık (1.0 = tam yapışkan)
            }).setView([39.9334, 32.8597], 6);

            // Tile layer'ı da sınırlarla sınırla
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 12,
                minZoom: 1,
                bounds: bounds // Tile layer için de sınır
            }).addTo(this.map);

            // Add scale control
            L.control.scale({ imperial: false }).addTo(this.map);

            console.log('Map initialized successfully with bounds!');

        } catch (error) {
            console.error('Error initializing map:', error);
            this.showMapError();
        }
    }

    bindMapEvents() {
        if (!this.map) {
            console.error('Cannot bind events - map not initialized');
            return;
        }

        // Map click event
        this.map.on('click', (e) => {
            console.log('Map clicked at:', e.latlng);
            this.handleMapClick(e.latlng);
        });

        // Locate Me button - element var mı kontrol et
        const locateBtn = document.getElementById('locate-me');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                console.log('Locate Me clicked');
                this.locateUser();
            });
        }

        // Reset Map button - element var mı kontrol et
        const resetBtn = document.getElementById('reset-map');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('Reset Map clicked');
                this.resetMapView();
            });
        }

        console.log('Map events bound successfully');
    }

    // Handle map click
    async handleMapClick(latlng) {
        const { lat, lng } = latlng;
        console.log('Handling map click for coordinates:', lat, lng);

        try {
            this.showMapLoading(latlng);

            // Get location name
            let locationName;
            try {
                locationName = await this.weatherApp.locationHandler.getLocationName(lat, lng);
                console.log('Location name resolved:', locationName);
            } catch (error) {
                console.warn('Primary geocoding failed, using coordinates:', error);
                locationName = {
                    name: `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
                    formatted_name: `Location at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
                    country: '',
                    admin1: ''
                };
            }

            // Fetch weather data
            await this.weatherApp.fetchAndDisplayWeather(lat, lng, locationName);

            // Update marker
            this.updateMarker(latlng, locationName);

        } catch (error) {
            console.error('Map click error:', error);
            this.showMapError(latlng, 'Unable to get weather data for this location');
        }
    }

    // Update marker
    updateMarker(latlng, locationInfo) {
        // Remove existing marker
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }

        // Create custom icon
        const customIcon = L.divIcon({
            className: 'weather-marker',
            html: '📍',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        this.marker = L.marker(latlng, { icon: customIcon }).addTo(this.map);

        // Create popup content
        const displayName = locationInfo.formatted_name ||
            locationInfo.name ||
            `Location (${latlng.lat.toFixed(4)}°, ${latlng.lng.toFixed(4)}°)`;

        const popupContent = `
            <div class="weather-popup">
                <div class="popup-title">${displayName}</div>
                <div class="popup-coords">${latlng.lat.toFixed(4)}°, ${latlng.lng.toFixed(4)}°</div>
                <div class="popup-click">Weather data loaded →</div>
            </div>
        `;

        this.marker.bindPopup(popupContent).openPopup();
    }

    // Show loading on map
    showMapLoading(latlng) {
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }

        const loadingIcon = L.divIcon({
            className: 'loading-marker',
            html: '<div style="font-size: 20px;">⏳</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        this.marker = L.marker(latlng, { icon: loadingIcon }).addTo(this.map);
        this.marker.bindPopup('Loading weather data...').openPopup();
    }

    // Show error on map
    showMapError(latlng = null, message = 'Map initialization failed') {
        console.error('Showing map error:', message);

        if (latlng && this.marker) {
            this.map.removeLayer(this.marker);
            const errorIcon = L.divIcon({
                className: 'error-marker',
                html: '❌',
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            });
            this.marker = L.marker(latlng, { icon: errorIcon }).addTo(this.map);
            this.marker.bindPopup(message).openPopup();
        }
    }

    // Locate user
    async locateUser() {
        try {
            console.log('Attempting to locate user...');
            const coords = await this.weatherApp.locationHandler.getCurrentLocation();
            const latlng = L.latLng(coords.lat, coords.lon);

            console.log('User location found:', latlng);
            this.map.setView(latlng, 12);

            // Get location name
            let locationName;
            try {
                locationName = await this.weatherApp.locationHandler.getLocationName(coords.lat, coords.lon);
            } catch (error) {
                console.warn('Geocoding failed for user location, using coordinates');
                locationName = {
                    name: 'Your Location',
                    formatted_name: 'Your Current Location',
                    country: '',
                    admin1: ''
                };
            }

            await this.weatherApp.fetchAndDisplayWeather(coords.lat, coords.lon, locationName);
            this.updateMarker(latlng, locationName);

        } catch (error) {
            console.error('Location error:', error);
            alert('Unable to get your location: ' + error.message);
        }
    }

    // Reset map view
    resetMapView() {
        this.map.setView([39.9334, 32.8597], 6);
        if (this.marker) {
            this.map.removeLayer(this.marker);
            this.marker = null;
        }
    }

    // Fly to location
    flyToLocation(lat, lon, locationName) {
        if (!this.map) {
            console.error('Map not available for flyTo');
            return;
        }

        const latlng = L.latLng(lat, lon);
        this.map.flyTo(latlng, 10, {
            duration: 1.5
        });

        setTimeout(() => {
            // Ensure locationName has the right structure
            const locationInfo = typeof locationName === 'string' ? { name: locationName, formatted_name: locationName } :
                locationName;

            this.updateMarker(latlng, locationInfo);
        }, 1600);
    }

    // Update popup with weather data - DÜZELTİLMİŞ
    updatePopupWithWeather(weatherData) {
        if (!this.marker) return;

        const current = weatherData.current;

        // DÜZELTİLMİŞ: Optional chaining syntax hatası düzeltildi
        const locationName = (weatherData.locationName && weatherData.locationName.formatted_name) ||
            (weatherData.locationName && weatherData.locationName.name) ||
            'Selected Location';

        const popupContent = `
            <div class="weather-popup">
                <div class="popup-title">${locationName}</div>
                <div class="popup-temp">${Math.round(current.temperature_2m)}°C</div>
                <div class="popup-desc">${this.getWeatherDescription(current.weather_code)}</div>
                <div class="popup-details">
                    💧 ${current.relative_humidity_2m}% • 💨 ${current.wind_speed_10m} km/h
                </div>
            </div>
        `;

        this.marker.bindPopup(popupContent).openPopup();
    }

    // DÜZELTİLMİŞ: getWeatherDescription fonksiyonu
    getWeatherDescription(code) {
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
            80: "Light showers",
            81: "Moderate showers",
            82: "Violent showers",
            95: "Thunderstorm",
            96: "Thunderstorm with hail",
            99: "Heavy thunderstorm with hail"
        };
        return weatherCodes[code] || `Weather code: ${code}`;
    }
}