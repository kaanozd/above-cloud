class LocationHandler {
    constructor() {
        this.geocodingCache = new Map();
        this.reverseGeocodingCache = new Map();
    }

    // Enhanced geocoding: Returns multiple results for autocomplete
    async searchLocations(locationName) {
        const cacheKey = `search_${locationName.toLowerCase()}`;

        // Check cache first
        if (this.geocodingCache.has(cacheKey)) {
            return this.geocodingCache.get(cacheKey);
        }

        try {
            // Using Open-Meteo's geocoding API - get 5 results for autocomplete
            const response = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=5&language=en&format=json`
            );

            if (!response.ok) {
                throw new Error('Geocoding service unavailable');
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                return []; // Return empty array for autocomplete
            }

            const locations = data.results.map(location => ({
                lat: location.latitude,
                lon: location.longitude,
                name: location.name,
                country: location.country,
                country_code: location.country_code,
                admin1: location.admin1, // State/region
                admin2: location.admin2, // District
                population: location.population
            }));

            // Cache the results
            this.geocodingCache.set(cacheKey, locations);

            return locations;

        } catch (error) {
            console.error('Geocoding error:', error);
            return []; // Return empty array for autocomplete
        }
    }

    // Get coordinates for a specific location (for actual search)
    async getCoordinates(locationName) {
        try {
            const locations = await this.searchLocations(locationName);
            if (locations.length === 0) {
                throw new Error('Location not found. Please try another city name.');
            }
            return locations[0]; // Return first result for actual search
        } catch (error) {
            throw new Error(`Error finding location: ${error.message}`);
        }
    }

    // Improved current location detection with better error handling
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser. Please enter a city name manually.'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 300000
            };

            console.log('Requesting location access...');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('Location obtained successfully:', position.coords);
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    console.error('Geolocation error:', error);

                    let errorMessage;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access denied. Please allow location permissions in your browser settings or enter a city name manually.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable. This might be due to network issues or GPS not working. Please try entering a city name manually.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Please check your connection and try again, or enter a city name manually.';
                            break;
                        default:
                            errorMessage = 'Unable to get your location. Please enter a city name manually.';
                    }
                    reject(new Error(errorMessage));
                },
                options
            );
        });
    }

    // IMPROVED: Better reverse geocoding using Nominatim (OpenStreetMap)
    async getLocationName(lat, lon) {
        const cacheKey = `reverse_${lat.toFixed(4)}_${lon.toFixed(4)}`;

        // Check cache first
        if (this.reverseGeocodingCache.has(cacheKey)) {
            return this.reverseGeocodingCache.get(cacheKey);
        }

        try {
            console.log('Getting location name for:', lat, lon);

            // Using Nominatim (OpenStreetMap) for better reverse geocoding
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en`
            );

            if (!response.ok) {
                throw new Error('Reverse geocoding service unavailable');
            }

            const data = await response.json();
            console.log('Nominatim reverse geocoding response:', data);

            if (data && data.address) {
                const address = data.address;

                // Determine the best location name
                let locationName = this.extractBestLocationName(address);
                let admin1 = address.state || address.region || '';
                let country = address.country || '';

                // If we couldn't get a good name, use coordinates
                if (!locationName || locationName === 'Unknown') {
                    locationName = `Location (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`;
                }

                const result = {
                    name: locationName,
                    country: country,
                    admin1: admin1,
                    formatted_name: this.formatLocationDisplay(address, locationName, admin1, country),
                    full_address: data.display_name || ''
                };

                console.log('Formatted location result:', result);

                // Cache the result
                this.reverseGeocodingCache.set(cacheKey, result);
                return result;
            }

            // Fallback: Return coordinates if no location found
            console.log('No location found in results, using coordinates');
            const fallbackResult = {
                name: `Location (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
                country: '',
                admin1: '',
                formatted_name: `Location at ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
            };

            this.reverseGeocodingCache.set(cacheKey, fallbackResult);
            return fallbackResult;

        } catch (error) {
            console.error('Reverse geocoding error:', error);
            // Fallback: Return coordinates-based name
            const fallbackResult = {
                name: `Location (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
                country: '',
                admin1: '',
                formatted_name: `Location at ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
            };

            this.reverseGeocodingCache.set(cacheKey, fallbackResult);
            return fallbackResult;
        }
    }

    // Extract the best possible location name from address details
    extractBestLocationName(address) {
        // Priority order for location names
        if (address.city) return address.city;
        if (address.town) return address.town;
        if (address.village) return address.village;
        if (address.municipality) return address.municipality;
        if (address.county) return address.county;
        if (address.state_district) return address.state_district;
        if (address.region) return address.region;
        if (address.state) return address.state;
        if (address.neighbourhood) return address.neighbourhood;
        if (address.suburb) return address.suburb;

        return 'Unknown';
    }

    // Format location for nice display
    formatLocationDisplay(address, locationName, admin1, country) {
        const parts = [];

        // Add the main location name
        parts.push(locationName);

        // Add district if available and different from location name
        if (address.suburb && address.suburb !== locationName) {
            parts.push(address.suburb);
        }

        // Add admin1 (state/region) if available
        if (admin1 && admin1 !== locationName) {
            parts.push(admin1);
        }

        // Add country if available
        if (country) {
            parts.push(country);
        }

        // If we only have coordinates, return a nicer format
        if (parts.length === 1 && parts[0].startsWith('Location (')) {
            return parts[0];
        }

        return parts.join(', ');
    }

    // Alternative method: Try IP-based location as fallback
    async getLocationByIP() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('IP location service failed');

            const data = await response.json();
            return {
                lat: data.latitude,
                lon: data.longitude,
                name: data.city,
                country: data.country_name,
                admin1: data.region,
                formatted_name: `${data.city}, ${data.region}, ${data.country_name}`
            };
        } catch (error) {
            throw new Error('Could not determine your location by IP. Please enter a city name manually.');
        }
    }
}