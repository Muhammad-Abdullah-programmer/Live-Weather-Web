class WeatherDashboard {
    constructor() {
        // API Configuration (Replace with your own API keys)
        this.config = {
            openWeather: {
                apiKey: 'f5f6bc56b421e9a44bd3c721e8488bf7', // Get from https://openweathermap.org/api
                baseUrl: 'https://api.openweathermap.org/data/2.5'
            },
            newsApi: {
                apiKey: '9f4e815d0f114145834c4bb2d8e9f6f4', // Get from https://newsapi.org
                baseUrl: 'https://newsapi.org/v2'
            },
            googlePlaces: {
                apiKey: 'YOUR_GOOGLE_PLACES_API_KEY', // Get from https://developers.google.com/maps/documentation/places/web-service
                baseUrl: 'https://maps.googleapis.com/maps/api/place'
            }
        };

        // State Management
        this.state = {
            currentLocation: null,
            currentWeather: null,
            forecast: [],
            airQuality: null,
            news: [],
            places: [],
            unit: 'metric', // 'metric' or 'imperial'
            map: null,
            mapLayer: 'streets',
            aqiChart: null
        };

        // DOM Elements
        this.elements = {
            loading: document.getElementById('loading'),
            citySearch: document.getElementById('citySearch'),
            searchResults: document.getElementById('searchResults'),
            getLocation: document.getElementById('getLocation'),
            unitC: document.getElementById('unitC'),
            unitF: document.getElementById('unitF'),
            refreshBtn: document.getElementById('refreshBtn'),
            currentLocation: document.getElementById('currentLocation'),
            lastUpdate: document.getElementById('lastUpdate'),
            currentDate: document.getElementById('currentDate'),
            currentTemp: document.getElementById('currentTemp'),
            currentCondition: document.getElementById('currentCondition'),
            feelsLike: document.getElementById('feelsLike'),
            humidity: document.getElementById('humidity'),
            windSpeed: document.getElementById('windSpeed'),
            uvIndex: document.getElementById('uvIndex'),
            forecastContainer: document.getElementById('forecastContainer'),
            aqiValue: document.getElementById('aqiValue'),
            aqiStatus: document.getElementById('aqiStatus'),
            aqiMessage: document.getElementById('aqiMessage'),
            aqiGauge: document.getElementById('aqiGauge'),
            aqiCenter: document.getElementById('aqiCenter'),
            map: document.getElementById('map'),
            mapLat: document.getElementById('mapLat'),
            mapLon: document.getElementById('mapLon'),
            mapToggle: document.getElementById('mapToggle'),
            newsCategory: document.getElementById('newsCategory'),
            newsContainer: document.getElementById('newsContainer'),
            placesType: document.getElementById('placesType'),
            placesContainer: document.getElementById('placesContainer')
        };

        // Initialize
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMap();
        this.loadFromStorage();
        this.getUserLocation();
    }

    setupEventListeners() {
        // Search functionality
        this.elements.citySearch.addEventListener('input', this.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));

        // Location button
        this.elements.getLocation.addEventListener('click', () => {
            this.getUserLocation();
        });

        // Unit toggle
        this.elements.unitC.addEventListener('click', () => this.changeUnit('metric'));
        this.elements.unitF.addEventListener('click', () => this.changeUnit('imperial'));

        // Refresh button
        this.elements.refreshBtn.addEventListener('click', () => {
            if (this.state.currentLocation) {
                this.fetchAllData(this.state.currentLocation.lat, this.state.currentLocation.lon);
            }
        });

        // News category change
        this.elements.newsCategory.addEventListener('change', () => {
            if (this.state.currentLocation) {
                this.fetchNews(this.state.currentLocation.city);
            }
        });

        // Places type change
        this.elements.placesType.addEventListener('change', () => {
            if (this.state.currentLocation) {
                this.fetchPlaces(this.state.currentLocation.lat, this.state.currentLocation.lon);
            }
        });

        // Map layer toggle
        this.elements.mapToggle.addEventListener('click', () => {
            this.toggleMapLayer();
        });
    }

    setupMap() {
        // Initialize map with default coordinates
        this.state.map = L.map('map').setView([0, 0], 10);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.state.map);
        
        // Add marker
        this.state.marker = L.marker([0, 0]).addTo(this.state.map);
    }

    updateMap(lat, lon, city) {
        if (!this.state.map) return;
        
        this.state.map.setView([lat, lon], 12);
        this.state.marker.setLatLng([lat, lon]);
        
        // Update marker popup
        this.state.marker.bindPopup(`<b>${city}</b><br>Lat: ${lat.toFixed(4)}<br>Lon: ${lon.toFixed(4)}`).openPopup();
        
        // Update coordinates display
        this.elements.mapLat.textContent = lat.toFixed(4);
        this.elements.mapLon.textContent = lon.toFixed(4);
    }

    toggleMapLayer() {
        if (this.state.mapLayer === 'streets') {
            this.state.mapLayer = 'satellite';
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri'
            }).addTo(this.state.map);
        } else {
            this.state.mapLayer = 'streets';
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.state.map);
        }
    }

    getUserLocation() {
        this.showLoading(true);
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.reverseGeocode(latitude, longitude);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    this.showError('Unable to get your location. Using default location.');
                    // Default to New York
                    this.fetchAllData(40.7128, -74.0060, 'New York');
                }
            );
        } else {
            this.showError('Geolocation is not supported by your browser.');
            this.fetchAllData(40.7128, -74.0060, 'New York');
        }
    }

    async reverseGeocode(lat, lon) {
        try {
            // Using OpenWeather's reverse geocoding
            const response = await fetch(
                `${this.config.openWeather.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=demo&units=${this.state.unit}`
            );
            
            if (!response.ok) throw new Error('Reverse geocoding failed');
            
            const data = await response.json();
            const city = data.name;
            
            this.state.currentLocation = {
                lat,
                lon,
                city,
                country: data.sys?.country || ''
            };
            
            this.fetchAllData(lat, lon, city);
            
        } catch (error) {
            console.error('Reverse geocode error:', error);
            this.fetchAllData(lat, lon, 'Unknown Location');
        }
    }

    async fetchAllData(lat, lon, city) {
        try {
            this.showLoading(true);
            
            // Fetch all data in parallel
            await Promise.all([
                this.fetchWeather(lat, lon),
                this.fetchForecast(lat, lon),
                this.fetchAirQuality(lat, lon),
                this.fetchNews(city),
                this.fetchPlaces(lat, lon)
            ]);
            
            // Update UI
            this.updateLocationDisplay(city);
            this.updateLastUpdate();
            this.updateMap(lat, lon, city);
            
            // Save to localStorage
            this.saveToStorage();
            
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showError('Failed to fetch data. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async fetchWeather(lat, lon) {
        try {
            // Note: Using demo key for example - replace with your own
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${this.state.unit}&appid=demo`
            );
            
            if (!response.ok) throw new Error('Weather fetch failed');
            
            const data = await response.json();
            this.state.currentWeather = data;
            this.updateCurrentWeather(data);
            
        } catch (error) {
            console.error('Weather fetch error:', error);
            // Fallback to mock data for demo
            this.useMockWeatherData();
        }
    }

    async fetchForecast(lat, lon) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${this.state.unit}&appid=demo`
            );
            
            if (!response.ok) throw new Error('Forecast fetch failed');
            
            const data = await response.json();
            this.state.forecast = data.list;
            this.updateForecast(data.list);
            
        } catch (error) {
            console.error('Forecast fetch error:', error);
            this.useMockForecastData();
        }
    }

    async fetchAirQuality(lat, lon) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=demo`
            );
            
            if (!response.ok) throw new Error('Air quality fetch failed');
            
            const data = await response.json();
            this.state.airQuality = data.list[0];
            this.updateAirQuality(data.list[0]);
            
        } catch (error) {
            console.error('Air quality fetch error:', error);
            this.useMockAirQualityData();
        }
    }

    async fetchNews(city) {
        try {
            const category = this.elements.newsCategory.value;
            // Note: NewsAPI requires a server-side implementation due to CORS
            // This is a mock implementation
            this.useMockNewsData(city, category);
            
        } catch (error) {
            console.error('News fetch error:', error);
            this.useMockNewsData(city, 'general');
        }
    }

    async fetchPlaces(lat, lon) {
        try {
            const type = this.elements.placesType.value;
            // Note: Google Places API requires server-side implementation
            // This is a mock implementation
            this.useMockPlacesData(lat, lon, type);
            
        } catch (error) {
            console.error('Places fetch error:', error);
            this.useMockPlacesData(lat, lon, 'restaurant');
        }
    }

    updateCurrentWeather(data) {
        const temp = Math.round(data.main.temp);
        const feelsLike = Math.round(data.main.feels_like);
        const condition = data.weather[0].description;
        const icon = data.weather[0].icon;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed;
        const windUnit = this.state.unit === 'metric' ? 'km/h' : 'mph';
        
        this.elements.currentTemp.textContent = `${temp}°`;
        this.elements.currentCondition.textContent = this.capitalize(condition);
        this.elements.feelsLike.textContent = `${feelsLike}°`;
        this.elements.humidity.textContent = `${humidity}%`;
        this.elements.windSpeed.textContent = `${windSpeed} ${windUnit}`;
        
        // Update date
        const now = new Date();
        this.elements.currentDate.textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Update weather icon
        this.updateWeatherIcon(icon);
    }

    updateForecast(forecastList) {
        // Filter to get one forecast per day
        const dailyForecast = [];
        const seenDays = new Set();
        
        for (const item of forecastList) {
            const date = new Date(item.dt * 1000);
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            if (!seenDays.has(day) && dailyForecast.length < 5) {
                seenDays.add(day);
                dailyForecast.push({
                    day,
                    temp: Math.round(item.main.temp),
                    icon: item.weather[0].icon,
                    condition: item.weather[0].main
                });
            }
        }
        
        // Update DOM
        this.elements.forecastContainer.innerHTML = dailyForecast.map(item => `
            <div class="forecast-card text-center p-4 bg-gray-50 rounded-xl">
                <div class="font-semibold text-gray-700">${item.day}</div>
                <div class="my-3">
                    <img src="https://openweathermap.org/img/wn/${item.icon}@2x.png" 
                         alt="${item.condition}" 
                         class="w-12 h-12 mx-auto weather-icon">
                </div>
                <div class="text-2xl font-bold text-gray-800">${item.temp}°</div>
                <div class="text-sm text-gray-600 mt-1">${item.condition}</div>
            </div>
        `).join('');
    }

    updateAirQuality(data) {
        const aqi = data.main.aqi;
        const components = data.components;
        
        // AQI scale: 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
        const aqiLabels = {
            1: { label: 'Good', color: '#10b981', class: 'aqi-good' },
            2: { label: 'Fair', color: '#f59e0b', class: 'aqi-moderate' },
            3: { label: 'Moderate', color: '#f97316', class: 'aqi-unhealthy-sensitive' },
            4: { label: 'Poor', color: '#ef4444', class: 'aqi-unhealthy' },
            5: { label: 'Very Poor', color: '#8b5cf6', class: 'aqi-very-unhealthy' }
        };
        
        const aqiInfo = aqiLabels[aqi] || { label: 'Unknown', color: '#6b7280', class: 'aqi-hazardous' };
        
        // Update text
        this.elements.aqiValue.textContent = aqi;
        this.elements.aqiStatus.textContent = aqiInfo.label;
        this.elements.aqiStatus.className = `px-3 py-1 rounded-full text-sm font-medium ${aqiInfo.class}`;
        this.elements.aqiMessage.textContent = this.getAQIMessage(aqi);
        
        // Update gauge
        this.updateAQIGauge(aqi, aqiInfo.color);
    }

    updateAQIGauge(aqi, color) {
        const ctx = this.elements.aqiGauge.getContext('2d');
        
        // Destroy existing chart if exists
        if (this.state.aqiChart) {
            this.state.aqiChart.destroy();
        }
        
        this.state.aqiChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [aqi * 20, 100 - (aqi * 20)],
                    backgroundColor: [color, '#f3f4f6'],
                    borderWidth: 0,
                    borderRadius: 10
                }]
            },
            options: {
                cutout: '75%',
                rotation: -90,
                circumference: 180,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
        
        // Update center text
        this.elements.aqiCenter.textContent = aqi;
    }

    updateNews(news) {
        this.elements.newsContainer.innerHTML = news.map(article => `
            <div class="news-card p-4 border border-gray-200 rounded-lg">
                <div class="flex items-start gap-3">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-800 line-clamp-2">${article.title}</h4>
                        <p class="text-sm text-gray-600 mt-1 line-clamp-2">${article.description || ''}</p>
                        <div class="flex justify-between items-center mt-3">
                            <span class="text-xs text-gray-500">${article.source}</span>
                            <span class="text-xs text-gray-500">${article.publishedAt}</span>
                        </div>
                    </div>
                    ${article.image ? `
                        <img src="${article.image}" 
                             alt="${article.title}" 
                             class="w-20 h-20 object-cover rounded-lg">
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    updatePlaces(places) {
        this.elements.placesContainer.innerHTML = places.map(place => `
            <div class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <i class="${place.icon} text-blue-600"></i>
                </div>
                <div class="flex-1">
                    <div class="font-medium text-gray-800">${place.name}</div>
                    <div class="text-sm text-gray-600">${place.address}</div>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">${place.rating} ★</span>
                        <span class="text-xs text-gray-500">${place.distance}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateLocationDisplay(city) {
        this.elements.currentLocation.innerHTML = `
            <i class="fas fa-map-marker-alt text-red-500"></i>
            <span class="ml-2">${city}</span>
        `;
    }

    updateLastUpdate() {
        const now = new Date();
        this.elements.lastUpdate.textContent = `Last updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    updateWeatherIcon(iconCode) {
        // You can implement custom icon logic here
        // For now, we'll use OpenWeather's icons
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        // Could update a specific icon element if needed
    }

    async handleSearch(query) {
        if (query.length < 2) {
            this.elements.searchResults.classList.add('hidden');
            return;
        }
        
        try {
            // Mock search results
            const mockCities = [
                { name: 'New York', country: 'US', lat: 40.7128, lon: -74.0060 },
                { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
                { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
                { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
                { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 }
            ];
            
            const results = mockCities.filter(city => 
                city.name.toLowerCase().includes(query.toLowerCase())
            );
            
            this.displaySearchResults(results);
            
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    displaySearchResults(results) {
        if (results.length === 0) {
            this.elements.searchResults.innerHTML = `
                <div class="p-4 text-gray-500 text-center">No cities found</div>
            `;
        } else {
            this.elements.searchResults.innerHTML = results.map(city => `
                <div class="search-result-item p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                     data-lat="${city.lat}" 
                     data-lon="${city.lon}"
                     data-city="${city.name}">
                    <div class="font-medium">${city.name}</div>
                    <div class="text-sm text-gray-500">${city.country}</div>
                </div>
            `).join('');
            
            // Add click listeners
            this.elements.searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const lat = parseFloat(item.dataset.lat);
                    const lon = parseFloat(item.dataset.lon);
                    const city = item.dataset.city;
                    
                    this.fetchAllData(lat, lon, city);
                    this.elements.searchResults.classList.add('hidden');
                    this.elements.citySearch.value = city;
                });
            });
        }
        
        this.elements.searchResults.classList.remove('hidden');
    }

    changeUnit(unit) {
        if (this.state.unit === unit) return;
        
        this.state.unit = unit;
        
        // Update toggle buttons
        this.elements.unitC.classList.toggle('active', unit === 'metric');
        this.elements.unitF.classList.toggle('active', unit === 'imperial');
        
        // Refresh data with new units
        if (this.state.currentLocation) {
            this.fetchAllData(
                this.state.currentLocation.lat,
                this.state.currentLocation.lon,
                this.state.currentLocation.city
            );
        }
    }

    // Utility Methods
    capitalize(str) {
        return str.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    getAQIMessage(aqi) {
        const messages = {
            1: 'Air quality is satisfactory.',
            2: 'Air quality is acceptable.',
            3: 'Members of sensitive groups may experience health effects.',
            4: 'Everyone may begin to experience health effects.',
            5: 'Health warnings of emergency conditions.'
        };
        return messages[aqi] || 'Air quality data not available.';
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // Data persistence
    saveToStorage() {
        const data = {
            location: this.state.currentLocation,
            unit: this.state.unit,
            timestamp: Date.now()
        };
        localStorage.setItem('weatherDashboard', JSON.stringify(data));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('weatherDashboard');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.state.unit = data.unit || 'metric';
                
                // Update unit toggle
                this.elements.unitC.classList.toggle('active', this.state.unit === 'metric');
                this.elements.unitF.classList.toggle('active', this.state.unit === 'imperial');
                
            } catch (error) {
                console.error('Failed to load saved data:', error);
            }
        }
    }

    // Mock data for demonstration
    useMockWeatherData() {
        const mockData = {
            main: {
                temp: 22,
                feels_like: 21,
                humidity: 65
            },
            weather: [{
                description: 'Partly cloudy',
                icon: '02d'
            }],
            wind: {
                speed: 12
            },
            sys: {
                country: 'US'
            },
            name: 'Demo City'
        };
        
        this.state.currentWeather = mockData;
        this.updateCurrentWeather(mockData);
    }

    useMockForecastData() {
        const mockForecast = [
            { dt: Date.now()/1000 + 86400, main: { temp: 23 }, weather: [{ main: 'Clear', icon: '01d' }] },
            { dt: Date.now()/1000 + 172800, main: { temp: 21 }, weather: [{ main: 'Clouds', icon: '03d' }] },
            { dt: Date.now()/1000 + 259200, main: { temp: 19 }, weather: [{ main: 'Rain', icon: '10d' }] },
            { dt: Date.now()/1000 + 345600, main: { temp: 20 }, weather: [{ main: 'Clouds', icon: '04d' }] },
            { dt: Date.now()/1000 + 432000, main: { temp: 22 }, weather: [{ main: 'Clear', icon: '01d' }] }
        ];
        
        this.state.forecast = mockForecast;
        this.updateForecast(mockForecast);
    }

    useMockAirQualityData() {
        const mockAQI = {
            main: { aqi: 2 },
            components: {
                co: 250.3,
                no: 0.1,
                no2: 12.4,
                o3: 68.7,
                so2: 2.1,
                pm2_5: 15.2,
                pm10: 25.1,
                nh3: 0.5
            }
        };
        
        this.state.airQuality = mockAQI;
        this.updateAirQuality(mockAQI);
    }

    useMockNewsData(city, category) {
        const mockNews = [
            {
                title: `Local weather in ${city} expected to improve this weekend`,
                description: `Residents can look forward to clearer skies and warmer temperatures as the weather pattern shifts.`,
                source: 'Local News',
                publishedAt: '2 hours ago',
                image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop'
            },
            {
                title: 'New climate initiative announced for urban areas',
                description: 'Mayor announces new sustainability measures to combat climate change effects.',
                source: 'City Times',
                publishedAt: '5 hours ago',
                image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w-400&h=200&fit=crop'
            },
            {
                title: 'How to prepare your home for changing seasons',
                description: 'Experts share tips on maintaining your property through different weather conditions.',
                source: 'Home & Garden',
                publishedAt: '1 day ago',
                image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=400&h=200&fit=crop'
            }
        ];
        
        this.state.news = mockNews;
        this.updateNews(mockNews);
    }

    useMockPlacesData(lat, lon, type) {
        const placeIcons = {
            restaurant: 'fas fa-utensils',
            park: 'fas fa-tree',
            museum: 'fas fa-landmark',
            cafe: 'fas fa-coffee',
            shopping_mall: 'fas fa-shopping-bag'
        };
        
        const placeNames = {
            restaurant: ['Green Leaf Bistro', 'The Rustic Spoon', 'Ocean View Grill'],
            park: ['Central Park', 'Riverside Gardens', 'Sunset Meadows'],
            museum: ['City Museum of Art', 'History Center', 'Science Museum'],
            cafe: ['Morning Brew Cafe', 'Bookworm Corner', 'Urban Grind'],
            shopping_mall: ['Downtown Plaza', 'Metro Center', 'The Gallery Mall']
        };
        
        const mockPlaces = placeNames[type].slice(0, 3).map(name => ({
            name,
            address: '123 Main St',
            rating: (Math.random() * 2 + 3).toFixed(1),
            distance: `${(Math.random() * 3 + 0.5).toFixed(1)} km`,
            icon: placeIcons[type]
        }));
        
        this.state.places = mockPlaces;
        this.updatePlaces(mockPlaces);
    }
}

// Initialize the app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WeatherDashboard();
});

// Hide search results when clicking outside
document.addEventListener('click', (e) => {
    const searchResults = document.getElementById('searchResults');
    const citySearch = document.getElementById('citySearch');
    
    if (searchResults && !searchResults.contains(e.target) && e.target !== citySearch) {
        searchResults.classList.add('hidden');
    }
});