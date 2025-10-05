class WeatherApp {
    constructor() {
        this.locationHandler = new LocationHandler();
        this.weatherService = new WeatherService();
        this.geminiAI = new GeminiAI();
        this.mapHandler = null;
        this.currentLocations = [];
        this.currentWeatherData = null; // AI için hava durumu verisini sakla
        this.init();
    }

    init() {
        console.log('WeatherApp initializing...');

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeApp();
            });
        } else {
            this.initializeApp();
        }
    }

    initializeApp() {
        console.log('Initializing app components...');

        try {
            this.mapHandler = new MapHandler(this);
            console.log('MapHandler initialized');

            this.bindEvents();
            this.checkGeolocationSupport();

            console.log('WeatherApp initialized successfully!');
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    // Check if geolocation is supported and update UI accordingly
    checkGeolocationSupport() {
        if (!navigator.geolocation) {
            const currentLocationBtn = document.getElementById('use-current-location');
            currentLocationBtn.disabled = true;
            currentLocationBtn.innerHTML = '📍 Location Not Supported';
            currentLocationBtn.title = 'Geolocation is not supported by your browser';
        }
    }

    bindEvents() {
        const locationInput = document.getElementById('location-input');
        const searchBtn = document.getElementById('search-btn');
        const currentLocationBtn = document.getElementById('use-current-location');

        // Search button click
        searchBtn.addEventListener('click', () => {
            this.handleLocationSearch();
        });

        // Enter key in input
        locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLocationSearch();
            }
        });

        // Input typing for autocomplete (when user types)
        locationInput.addEventListener('input', (e) => {
            this.handleAutocompleteSearch(e.target.value);
        });

        // Current location button with improved feedback
        currentLocationBtn.addEventListener('click', () => {
            this.handleCurrentLocation();
        });

        // Click anywhere else to hide autocomplete
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                UIComponents.hideAutocompleteResults();
            }
        });

        // Autocomplete item click
        document.getElementById('autocomplete-results').addEventListener('click', (e) => {
            const item = e.target.closest('.autocomplete-item');
            if (item) {
                this.handleAutocompleteSelect(item);
            }
        });

        // Chat events
        this.bindChatEvents();
    }

    bindChatEvents() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');
        const toggleButton = document.getElementById('toggle-chat');

        // Send message on button click
        sendButton.addEventListener('click', () => {
            this.handleSendMessage();
        });

        // Send message on Enter key
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSendMessage();
            }
        });

        // Toggle chat visibility
        toggleButton.addEventListener('click', () => {
            this.toggleChat();
        });
    }

    // Handle autocomplete search when user types
    async handleAutocompleteSearch(searchTerm) {
        if (searchTerm.length < 2) {
            UIComponents.hideAutocompleteResults();
            return;
        }

        try {
            // Get location suggestions from API
            const locations = await this.locationHandler.searchLocations(searchTerm);
            this.currentLocations = locations;

            // Show autocomplete results
            UIComponents.showAutocompleteResults(locations);
        } catch (error) {
            // Silently handle autocomplete errors (don't show to user)
            console.log('Autocomplete error:', error);
            UIComponents.hideAutocompleteResults();
        }
    }

    // Handle when user selects an autocomplete item
    handleAutocompleteSelect(item) {
        const lat = parseFloat(item.dataset.lat);
        const lon = parseFloat(item.dataset.lon);

        // Get the selected location name and set it to input
        const locationName = item.querySelector('.city-name').textContent;
        document.getElementById('location-input').value = locationName;

        // Hide autocomplete results
        UIComponents.hideAutocompleteResults();

        // Fly to location on map
        this.mapHandler.flyToLocation(lat, lon, { name: locationName });

        // Fetch weather for selected location
        this.fetchAndDisplayWeather(lat, lon, { name: locationName });
    }

    // Handle location search (when user clicks search button or presses enter)
    async handleLocationSearch() {
        const locationInput = document.getElementById('location-input');
        const locationName = locationInput.value.trim();

        if (!locationName) {
            UIComponents.showError('Please enter a location');
            return;
        }

        await this.loadWeatherForLocation(locationName);
    }

    // Improved current location handling with fallback
    async handleCurrentLocation() {
        const currentLocationBtn = document.getElementById('use-current-location');
        const originalText = currentLocationBtn.innerHTML;

        try {
            UIComponents.showLoading();
            UIComponents.hideError();

            // Update button to show loading state
            currentLocationBtn.innerHTML = '📍 Detecting Location...';
            currentLocationBtn.disabled = true;

            console.log('Attempting to get current location...');

            // Try to get precise location first
            const coords = await this.locationHandler.getCurrentLocation();
            console.log('Location obtained:', coords);

            const locationName = await this.locationHandler.getLocationName(coords.lat, coords.lon);
            console.log('Location name resolved:', locationName);

            await this.fetchAndDisplayWeather(coords.lat, coords.lon, locationName);

        } catch (error) {
            console.error('Current location error:', error);
            UIComponents.hideLoading();
            UIComponents.showError(error.message);

            // Offer IP-based location as fallback
            if (confirm('Unable to get precise location. Would you like to try approximate location based on your IP address?')) {
                await this.handleIPLocation();
            }
        } finally {
            // Reset button state
            currentLocationBtn.innerHTML = originalText;
            currentLocationBtn.disabled = false;
        }
    }

    // Fallback method using IP-based location
    async handleIPLocation() {
        try {
            UIComponents.showLoading();
            UIComponents.hideError();

            const locationData = await this.locationHandler.getLocationByIP();
            await this.fetchAndDisplayWeather(locationData.lat, locationData.lon, locationData);

        } catch (error) {
            UIComponents.hideLoading();
            UIComponents.showError(error.message);
        }
    }

    // Load weather for a specific location with better error handling
    async loadWeatherForLocation(locationName) {
        try {
            UIComponents.showLoading();
            UIComponents.hideError();

            const coordinates = await this.locationHandler.getCoordinates(locationName);

            // Get proper location name for display
            let locationInfo;
            try {
                locationInfo = await this.locationHandler.getLocationName(coordinates.lat, coordinates.lon);
            } catch (error) {
                locationInfo = {
                    name: locationName,
                    formatted_name: locationName,
                    country: '',
                    admin1: ''
                };
            }

            await this.fetchAndDisplayWeather(coordinates.lat, coordinates.lon, locationInfo);

        } catch (error) {
            UIComponents.hideLoading();
            UIComponents.showError(error.message);
        }
    }

    // Fetch and display weather data
    async fetchAndDisplayWeather(lat, lon, locationName) {
        try {
            const weatherData = await this.weatherService.getComprehensiveWeather(lat, lon);

            // Hava durumu verisini sakla (AI için)
            this.currentWeatherData = weatherData;

            UIComponents.hideLoading();
            UIComponents.showWeatherDisplay();
            UIComponents.displayCurrentWeather(weatherData, locationName);
            UIComponents.displayForecast(weatherData);

            // Map popup'ı güncelle
            this.mapHandler.updatePopupWithWeather({
                ...weatherData,
                locationName: locationName
            });

        } catch (error) {
            UIComponents.hideLoading();
            UIComponents.showError(error.message);
        }
    }

    async handleSendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message) return;

        // Hava durumu verisi yoksa uyar
        if (!this.currentWeatherData) {
            this.addMessage('Lütfen önce bir konum seçin veya hava durumu verilerini yükleyin.', 'bot');
            return;
        }

        // Kullanıcı mesajını ekle
        this.addMessage(message, 'user');
        chatInput.value = '';
        chatInput.disabled = true;

        // Loading göster
        this.showChatLoading();

        try {
            console.log('Getting AI advice for:', message);

            // Gemini AI'den gerçek yanıt al
            const aiResponse = await this.geminiAI.getWeatherAdvice(this.currentWeatherData, message);

            console.log('AI Response received:', aiResponse);

            // Yanıtı ekle
            this.addMessage(aiResponse, 'bot');

        } catch (error) {
            console.error('AI error in app:', error);
            this.addMessage('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', 'bot');
        } finally {
            this.hideChatLoading();
            chatInput.disabled = false;
            chatInput.focus();
        }
    }

    addMessage(text, sender) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        messageDiv.innerHTML = `
            <div class="message-content">${text}</div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showChatLoading() {
        const chatMessages = document.getElementById('chat-messages');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message';
        loadingDiv.id = 'chat-loading';

        loadingDiv.innerHTML = `
            <div class="message-content chat-loading">
                <span>Preparing response</span>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideChatLoading() {
        const loadingDiv = document.getElementById('chat-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    toggleChat() {
        const chatContainer = document.getElementById('chat-container');
        const toggleBtn = document.getElementById('toggle-chat');

        if (chatContainer.style.display === 'none') {
            chatContainer.style.display = 'flex';
            toggleBtn.textContent = '−';
        } else {
            chatContainer.style.display = 'none';
            toggleBtn.textContent = '+';
        }
    }
}

// Initialize the app when DOM is loaded
console.log('Loading WeatherApp...');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded, starting app...');
    new WeatherApp();
});