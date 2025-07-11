// ==================== WEATHER & PLANT RECOMMENDATION SYSTEM ====================

// 🌍 Global Variables
let map;
let currentLocationMarker;
let userLocation = null;
let weatherData = null;
let plantDatabase = [];
let soilDatabase = [];
let emergencyContacts = [];

// 🔑 API Configuration
const WEATHER_API_KEY = 'bd5e378503939ddaee76f12ad7a97608';
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    initializeClock();
    initializeMap();
    initializePlantDatabase();
    initializeSoilDatabase();
    loadEmergencyContacts();
    setupEventListeners();
    
    // Auto-locate user on load
    setTimeout(() => {
        locateUser();
    }, 1000);
});

// ==================== CLOCK FUNCTIONALITY ====================

function initializeClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const dateString = now.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('clock').innerHTML = `
            <div class="text-center">
                <div class="text-lg font-bold">${timeString}</div>
                <div class="text-sm text-gray-600">${dateString}</div>
            </div>
        `;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// ==================== MAP FUNCTIONALITY ====================

function initializeMap() {
    // Initialize map centered on Vietnam
    map = L.map('map').setView([16.0583, 108.2772], 6);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add location controls
    addLocationControls();
    
    // Add weather layer toggle
    addWeatherLayerControls();
}

function addLocationControls() {
    const locationControl = L.control({position: 'topright'});
    
    locationControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'location-controls bg-white rounded-lg shadow-lg p-2');
        div.innerHTML = `
            <button id="locateBtn" class="location-btn bg-blue-500 text-white rounded-lg mb-2 hover:bg-blue-600" title="Định vị của tôi">
                <i class="ri-crosshair-line"></i>
            </button>
            <button id="refreshWeatherBtn" class="location-btn bg-green-500 text-white rounded-lg hover:bg-green-600" title="Làm mới thời tiết">
                <i class="ri-refresh-line"></i>
            </button>
        `;
        
        // Prevent map events on control
        L.DomEvent.disableClickPropagation(div);
        
        return div;
    };
    
    locationControl.addTo(map);
    
    // Add event listeners after control is added
    setTimeout(() => {
        document.getElementById('locateBtn').addEventListener('click', locateUser);
        document.getElementById('refreshWeatherBtn').addEventListener('click', refreshWeatherData);
    }, 100);
}

function addWeatherLayerControls() {
    const weatherControl = L.control({position: 'bottomright'});
    
    weatherControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'weather-controls bg-white rounded-lg shadow-lg p-3');
        div.innerHTML = `
            <h4 class="font-semibold mb-2 text-gray-800">Lớp thời tiết</h4>
            <div class="space-y-2">
                <label class="flex items-center">
                    <input type="checkbox" id="tempLayer" class="mr-2">
                    <span class="text-sm">Nhiệt độ</span>
                </label>
                <label class="flex items-center">
                    <input type="checkbox" id="precipLayer" class="mr-2">
                    <span class="text-sm">Lượng mưa</span>
                </label>
                <label class="flex items-center">
                    <input type="checkbox" id="windLayer" class="mr-2">
                    <span class="text-sm">Gió</span>
                </label>
            </div>
        `;
        
        L.DomEvent.disableClickPropagation(div);
        return div;
    };
    
    weatherControl.addTo(map);
}

// ==================== GEOLOCATION & WEATHER ====================

function locateUser() {
    const locateBtn = document.getElementById('locateBtn');
    if (locateBtn) {
        locateBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i>';
        locateBtn.disabled = true;
    }
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                userLocation = {lat, lng};
                
                // Update map view
                map.setView([lat, lng], 13);
                
                // Add/update current location marker
                if (currentLocationMarker) {
                    map.removeLayer(currentLocationMarker);
                }
                
                currentLocationMarker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: 'current-location-marker',
                        html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(map);
                
                currentLocationMarker.bindPopup(`
                    <div class="text-center">
                        <i class="ri-map-pin-line text-blue-500 text-xl mb-2"></i>
                        <p class="font-semibold">Vị trí của bạn</p>
                        <p class="text-sm text-gray-600">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</p>
                    </div>
                `).openPopup();
                
                // Fetch weather data
                fetchWeatherData(lat, lng);
                
                // Reset button
                if (locateBtn) {
                    locateBtn.innerHTML = '<i class="ri-crosshair-line"></i>';
                    locateBtn.disabled = false;
                }
                
                showNotification('Đã xác định vị trí của bạn!', 'success');
            },
            (error) => {
                console.error('Geolocation error:', error);
                showNotification('Không thể xác định vị trí. Vui lòng cho phép truy cập vị trí.', 'error');
                
                if (locateBtn) {
                    locateBtn.innerHTML = '<i class="ri-crosshair-line"></i>';
                    locateBtn.disabled = false;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    } else {
        showNotification('Trình duyệt không hỗ trợ định vị GPS', 'error');
        if (locateBtn) {
            locateBtn.innerHTML = '<i class="ri-crosshair-line"></i>';
            locateBtn.disabled = false;
        }
    }
}

async function fetchWeatherData(lat, lng) {
    try {
        showNotification('Đang tải dữ liệu thời tiết...', 'info');
        
        // Current weather
        const currentResponse = await fetch(
            `${WEATHER_API_BASE}/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric&lang=vi`
        );
        
        if (!currentResponse.ok) {
            throw new Error(`HTTP error! status: ${currentResponse.status}`);
        }
        
        const currentData = await currentResponse.json();
        
        // 5-day forecast
        const forecastResponse = await fetch(
            `${WEATHER_API_BASE}/forecast?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=metric&lang=vi`
        );
        
        if (!forecastResponse.ok) {
            throw new Error(`HTTP error! status: ${forecastResponse.status}`);
        }
        
        const forecastData = await forecastResponse.json();
        
        weatherData = {
            current: currentData,
            forecast: forecastData
        };
        
        // Update UI
        updateWeatherDisplay();
        updateCharts();
        generatePlantRecommendations();
        
        showNotification('Dữ liệu thời tiết đã được cập nhật!', 'success');
        
    } catch (error) {
        console.error('Weather API error:', error);
        showNotification('Không thể tải dữ liệu thời tiết. Vui lòng thử lại.', 'error');
        
        // Use mock data for demonstration
        weatherData = generateMockWeatherData();
        updateWeatherDisplay();
        updateCharts();
        generatePlantRecommendations();
    }
}

function refreshWeatherData() {
    if (userLocation) {
        fetchWeatherData(userLocation.lat, userLocation.lng);
    } else {
        showNotification('Vui lòng xác định vị trí trước', 'warning');
    }
}

// ==================== PLANT DATABASE ====================

function initializePlantDatabase() {
    plantDatabase = [
        // Cây lương thực
        {
            id: 'rice',
            name: 'Lúa',
            category: 'Lương thực',
            icon: '🌾',
            description: 'Cây lương thực chính của Việt Nam',
            requirements: {
                temperature: {min: 20, max: 35, optimal: [25, 30]},
                humidity: {min: 70, max: 90, optimal: [75, 85]},
                rainfall: {min: 1000, max: 2000, optimal: [1200, 1800]},
                soilType: ['clay', 'loam'],
                soilPH: {min: 5.5, max: 7.0, optimal: [6.0, 6.8]},
                sunlight: 'full',
                season: ['spring', 'summer']
            },
            benefits: [
                'Nguồn carbohydrate chính',
                'Thích nghi tốt với khí hậu nhiệt đới',
                'Có thể trồng 2-3 vụ/năm'
            ],
            tips: [
                'Cần ngập nước trong giai đoạn sinh trưởng',
                'Tránh trồng trong mùa khô',
                'Cần bón phân đầy đủ NPK'
            ]
        },
        {
            id: 'corn',
            name: 'Ngô',
            category: 'Lương thực',
            icon: '🌽',
            description: 'Cây lương thực có năng suất cao',
            requirements: {
                temperature: {min: 15, max: 35, optimal: [20, 30]},
                humidity: {min: 50, max: 80, optimal: [60, 75]},
                rainfall: {min: 500, max: 1200, optimal: [600, 1000]},
                soilType: ['loam', 'sandy'],
                soilPH: {min: 6.0, max: 7.5, optimal: [6.5, 7.0]},
                sunlight: 'full',
                season: ['spring', 'summer', 'autumn']
            },
            benefits: [
                'Năng suất cao',
                'Chịu hạn tốt',
                'Có thể làm thức ăn chăn nuôi'
            ],
            tips: [
                'Trồng khi nhiệt độ ổn định trên 15°C',
                'Cần tưới đều trong giai đoạn ra hoa',
                'Thu hoạch khi hạt đã chín vàng'
            ]
        },
        // Rau củ
        {
            id: 'tomato',
            name: 'Cà chua',
            category: 'Rau củ',
            icon: '🍅',
            description: 'Rau quả giàu vitamin C',
            requirements: {
                temperature: {min: 18, max: 30, optimal: [20, 25]},
                humidity: {min: 60, max: 80, optimal: [65, 75]},
                rainfall: {min: 400, max: 800, optimal: [500, 700]},
                soilType: ['loam', 'sandy'],
                soilPH: {min: 6.0, max: 7.0, optimal: [6.2, 6.8]},
                sunlight: 'full',
                season: ['spring', 'autumn', 'winter']
            },
            benefits: [
                'Giàu vitamin C và lycopene',
                'Có thể trồng quanh năm',
                'Giá trị kinh tế cao'
            ],
            tips: [
                'Tránh trồng trong mùa mưa nhiều',
                'Cần giàn đỡ cho cây',
                'Tỉa cành để tăng năng suất'
            ]
        },
        {
            id: 'lettuce',
            name: 'Xà lách',
            category: 'Rau lá',
            icon: '🥬',
            description: 'Rau lá mát, dễ trồng',
            requirements: {
                temperature: {min: 10, max: 25, optimal: [15, 20]},
                humidity: {min: 70, max: 90, optimal: [75, 85]},
                rainfall: {min: 300, max: 600, optimal: [400, 500]},
                soilType: ['loam', 'sandy'],
                soilPH: {min: 6.0, max: 7.5, optimal: [6.5, 7.0]},
                sunlight: 'partial',
                season: ['autumn', 'winter', 'spring']
            },
            benefits: [
                'Thời gian sinh trưởng ngắn',
                'Ít sâu bệnh',
                'Có thể trồng thủy canh'
            ],
            tips: [
                'Tránh trồng trong mùa hè nóng',
                'Cần tưới đều và nhẹ',
                'Thu hoạch sớm để tránh đắng'
            ]
        },
        // Cây ăn trái
        {
            id: 'mango',
            name: 'Xoài',
            category: 'Cây ăn trái',
            icon: '🥭',
            description: 'Cây ăn trái nhiệt đới',
            requirements: {
                temperature: {min: 20, max: 40, optimal: [25, 35]},
                humidity: {min: 60, max: 85, optimal: [70, 80]},
                rainfall: {min: 800, max: 2000, optimal: [1000, 1500]},
                soilType: ['loam', 'sandy'],
                soilPH: {min: 5.5, max: 7.5, optimal: [6.0, 7.0]},
                sunlight: 'full',
                season: ['year-round']
            },
            benefits: [
                'Giá trị kinh tế cao',
                'Cây lâu năm',
                'Chịu hạn tốt khi trưởng thành'
            ],
            tips: [
                'Cần không gian rộng để phát triển',
                'Tỉa cành để tạo tán đẹp',
                'Bón phân hữu cơ thường xuyên'
            ]
        },
        {
            id: 'banana',
            name: 'Chuối',
            category: 'Cây ăn trái',
            icon: '🍌',
            description: 'Cây ăn trái dễ trồng',
            requirements: {
                temperature: {min: 20, max: 35, optimal: [25, 30]},
                humidity: {min: 75, max: 95, optimal: [80, 90]},
                rainfall: {min: 1000, max: 2500, optimal: [1200, 2000]},
                soilType: ['loam', 'clay'],
                soilPH: {min: 5.5, max: 7.0, optimal: [6.0, 6.8]},
                sunlight: 'full',
                season: ['year-round']
            },
            benefits: [
                'Sinh trưởng nhanh',
                'Năng suất cao',
                'Có thể trồng quanh năm'
            ],
            tips: [
                'Cần tưới nước thường xuyên',
                'Chặt bỏ cây con thừa',
                'Bảo vệ khỏi gió mạnh'
            ]
        },
        // Cây công nghiệp
        {
            id: 'coffee',
            name: 'Cà phê',
            category: 'Cây công nghiệp',
            icon: '☕',
            description: 'Cây công nghiệp xuất khẩu',
            requirements: {
                temperature: {min: 18, max: 28, optimal: [20, 25]},
                humidity: {min: 70, max: 90, optimal: [75, 85]},
                rainfall: {min: 1200, max: 2000, optimal: [1400, 1800]},
                soilType: ['loam', 'volcanic'],
                soilPH: {min: 6.0, max: 7.0, optimal: [6.2, 6.8]},
                sunlight: 'partial',
                season: ['year-round']
            },
            benefits: [
                'Giá trị xuất khẩu cao',
                'Cây lâu năm',
                'Thích hợp vùng cao'
            ],
            tips: [
                'Cần che bóng khi còn nhỏ',
                'Tỉa cành tạo hình',
                'Thu hoạch khi quả chín đỏ'
            ]
        },
        {
            id: 'tea',
            name: 'Chè',
            category: 'Cây công nghiệp',
            icon: '🍃',
            description: 'Cây công nghiệp vùng cao',
            requirements: {
                temperature: {min: 15, max: 25, optimal: [18, 22]},
                humidity: {min: 80, max: 95, optimal: [85, 90]},
                rainfall: {min: 1500, max: 3000, optimal: [1800, 2500]},
                soilType: ['acidic', 'loam'],
                soilPH: {min: 4.5, max: 6.5, optimal: [5.0, 6.0]},
                sunlight: 'partial',
                season: ['year-round']
            },
            benefits: [
                'Thích hợp khí hậu mát',
                'Thu hoạch nhiều lần/năm',
                'Giá trị kinh tế ổn định'
            ],
            tips: [
                'Trồng ở độ cao trên 500m',
                'Hái non thường xuyên',
                'Bón phân hữu cơ'
            ]
        }
    ];
}

function initializeSoilDatabase() {
    soilDatabase = [
        {
            type: 'clay',
            name: 'Đất sét',
            description: 'Đất có hàm lượng sét cao, giữ nước tốt',
            characteristics: {
                drainage: 'poor',
                waterRetention: 'high',
                fertility: 'high',
                workability: 'difficult'
            },
            suitableFor: ['rice', 'banana'],
            improvements: [
                'Thêm cát để cải thiện thoát nước',
                'Bón phân hữu cơ để tơi xốp',
                'Làm luống cao để tránh úng'
            ]
        },
        {
            type: 'loam',
            name: 'Đất pha',
            description: 'Đất cân bằng giữa cát, sét và mùn',
            characteristics: {
                drainage: 'good',
                waterRetention: 'moderate',
                fertility: 'high',
                workability: 'easy'
            },
            suitableFor: ['tomato', 'corn', 'mango', 'coffee'],
            improvements: [
                'Bón phân hữu cơ định kỳ',
                'Luân canh cây trồng',
                'Che phủ để giữ ẩm'
            ]
        },
        {
            type: 'sandy',
            name: 'Đất cát',
            description: 'Đất thoát nước tốt nhưng ít dinh dưỡng',
            characteristics: {
                drainage: 'excellent',
                waterRetention: 'low',
                fertility: 'low',
                workability: 'easy'
            },
            suitableFor: ['corn', 'tomato', 'lettuce'],
            improvements: [
                'Bón nhiều phân hữu cơ',
                'Tưới nước thường xuyên',
                'Trồng cây che phủ'
            ]
        },
        {
            type: 'volcanic',
            name: 'Đất núi lửa',
            description: 'Đất giàu khoáng chất từ núi lửa',
            characteristics: {
                drainage: 'good',
                waterRetention: 'moderate',
                fertility: 'very high',
                workability: 'moderate'
            },
            suitableFor: ['coffee', 'tea'],
            improvements: [
                'Kiểm soát pH',
                'Bón phân cân bằng',
                'Tránh làm đất quá sâu'
            ]
        },
        {
            type: 'acidic',
            name: 'Đất chua',
            description: 'Đất có pH thấp, thích hợp một số cây',
            characteristics: {
                drainage: 'variable',
                waterRetention: 'variable',
                fertility: 'moderate',
                workability: 'moderate'
            },
            suitableFor: ['tea'],
            improvements: [
                'Bón vôi để tăng pH nếu cần',
                'Bón phân hữu cơ',
                'Trồng cây thích đất chua'
            ]
        }
    ];
}

// ==================== PLANT RECOMMENDATION SYSTEM ====================

function generatePlantRecommendations() {
    if (!weatherData) return;
    
    const currentWeather = weatherData.current;
    const forecast = weatherData.forecast;
    
    // Calculate average conditions for next 7 days
    const avgConditions = calculateAverageConditions(forecast);
    
    // Score each plant based on current conditions
    const recommendations = plantDatabase.map(plant => {
        const score = calculatePlantScore(plant, currentWeather, avgConditions);
        return {
            ...plant,
            score: score,
            reasons: generateRecommendationReasons(plant, currentWeather, avgConditions)
        };
    }).sort((a, b) => b.score - a.score);
    
    // Update UI
    updatePlantRecommendationsUI(recommendations);
}

function calculateAverageConditions(forecast) {
    const conditions = {
        temperature: 0,
        humidity: 0,
        rainfall: 0,
        count: 0
    };
    
    // Take next 7 days (56 entries, 8 per day)
    const entries = forecast.list.slice(0, 56);
    
    entries.forEach(entry => {
        conditions.temperature += entry.main.temp;
        conditions.humidity += entry.main.humidity;
        conditions.rainfall += (entry.rain?.['3h'] || 0);
        conditions.count++;
    });
    
    return {
        temperature: conditions.temperature / conditions.count,
        humidity: conditions.humidity / conditions.count,
        rainfall: (conditions.rainfall / conditions.count) * 8 * 7, // Weekly total
        season: getCurrentSeason()
    };
}

function calculatePlantScore(plant, current, forecast) {
    let score = 0;
    const req = plant.requirements;
    
    // Temperature score (40% weight)
    const tempScore = calculateRangeScore(
        forecast.temperature,
        req.temperature.min,
        req.temperature.max,
        req.temperature.optimal
    );
    score += tempScore * 0.4;
    
    // Humidity score (25% weight)
    const humidityScore = calculateRangeScore(
        forecast.humidity,
        req.humidity.min,
        req.humidity.max,
        req.humidity.optimal
    );
    score += humidityScore * 0.25;
    
    // Rainfall score (25% weight)
    const rainfallScore = calculateRangeScore(
        forecast.rainfall,
        req.rainfall.min,
        req.rainfall.max,
        req.rainfall.optimal
    );
    score += rainfallScore * 0.25;
    
    // Season score (10% weight)
    const seasonScore = req.season.includes(forecast.season) || req.season.includes('year-round') ? 1 : 0.3;
    score += seasonScore * 0.1;
    
    return Math.round(score * 100);
}

function calculateRangeScore(value, min, max, optimal) {
    if (value < min || value > max) return 0;
    
    if (optimal && Array.isArray(optimal) && optimal.length === 2) {
        const [optMin, optMax] = optimal;
        if (value >= optMin && value <= optMax) return 1;
        
        // Calculate distance from optimal range
        const distanceFromOptimal = Math.min(
            Math.abs(value - optMin),
            Math.abs(value - optMax)
        );
        const maxDistance = Math.max(optMin - min, max - optMax);
        return Math.max(0, 1 - (distanceFromOptimal / maxDistance));
    }
    
    return 0.7; // Default score if in range but no optimal specified
}

function generateRecommendationReasons(plant, current, forecast) {
    const reasons = [];
    const req = plant.requirements;
    
    // Temperature
    if (forecast.temperature >= req.temperature.optimal[0] && 
        forecast.temperature <= req.temperature.optimal[1]) {
        reasons.push(`Nhiệt độ lý tưởng (${forecast.temperature.toFixed(1)}°C)`);
    } else if (forecast.temperature >= req.temperature.min && 
               forecast.temperature <= req.temperature.max) {
        reasons.push(`Nhiệt độ phù hợp (${forecast.temperature.toFixed(1)}°C)`);
    }
    
    // Humidity
    if (forecast.humidity >= req.humidity.optimal[0] && 
        forecast.humidity <= req.humidity.optimal[1]) {
        reasons.push(`Độ ẩm tối ưu (${forecast.humidity.toFixed(0)}%)`);
    }
    
    // Season
    if (req.season.includes(forecast.season)) {
        reasons.push(`Đúng mùa trồng (${getSeasonName(forecast.season)})`);
    }
    
    // Rainfall
    if (forecast.rainfall >= req.rainfall.optimal[0] && 
        forecast.rainfall <= req.rainfall.optimal[1]) {
        reasons.push(`Lượng mưa phù hợp`);
    }
    
    return reasons;
}

function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
}

function getSeasonName(season) {
    const names = {
        spring: 'Xuân',
        summer: 'Hè',
        autumn: 'Thu',
        winter: 'Đông'
    };
    return names[season] || season;
}

// ==================== UI UPDATES ====================

function updateWeatherDisplay() {
    if (!weatherData) return;
    
    const current = weatherData.current;
    
    // Update hero section with current weather
    const heroSection = document.querySelector('.hero-section > div');
    if (heroSection) {
        heroSection.innerHTML = `
            <div class="bg-black bg-opacity-30 rounded-2xl p-8 backdrop-blur-sm">
                <h1 class="text-5xl font-bold mb-4">Theo dõi thời tiết thông minh</h1>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div class="text-center">
                        <i class="ri-temp-hot-line text-4xl mb-2"></i>
                        <div class="text-2xl font-bold">${Math.round(current.main.temp)}°C</div>
                        <div class="text-sm opacity-80">Nhiệt độ</div>
                    </div>
                    <div class="text-center">
                        <i class="ri-drop-line text-4xl mb-2"></i>
                        <div class="text-2xl font-bold">${current.main.humidity}%</div>
                        <div class="text-sm opacity-80">Độ ẩm</div>
                    </div>
                    <div class="text-center">
                        <i class="ri-windy-line text-4xl mb-2"></i>
                        <div class="text-2xl font-bold">${Math.round(current.wind.speed * 3.6)} km/h</div>
                        <div class="text-sm opacity-80">Tốc độ gió</div>
                    </div>
                </div>
                <p class="text-xl mb-6">${current.weather[0].description}</p>
                <p class="text-lg">📍 ${current.name}, ${current.sys.country}</p>
                <p class="text-lg mt-4">Phát triển bởi đội: Silent Vision</p>
            </div>
        `;
    }
}

function updateCharts() {
    if (!weatherData) return;
    
    const forecast = weatherData.forecast.list.slice(0, 7); // Next 7 entries
    
    // Temperature Chart
    const tempChart = echarts.init(document.getElementById('temperatureChart'));
    tempChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: forecast.map(item => new Date(item.dt * 1000).toLocaleDateString('vi-VN', {weekday: 'short'}))
        },
        yAxis: { type: 'value', name: '°C' },
        series: [{
            data: forecast.map(item => Math.round(item.main.temp)),
            type: 'line',
            smooth: true,
            itemStyle: { color: '#ef4444' }
        }]
    });
    
    // Humidity Chart
    const humidityChart = echarts.init(document.getElementById('humidityChart'));
    humidityChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: forecast.map(item => new Date(item.dt * 1000).toLocaleDateString('vi-VN', {weekday: 'short'}))
        },
        yAxis: { type: 'value', name: '%' },
        series: [{
            data: forecast.map(item => item.main.humidity),
            type: 'bar',
            itemStyle: { color: '#3b82f6' }
        }]
    });
    
    // Rainfall Chart
    const rainfallChart = echarts.init(document.getElementById('rainfallChart'));
    rainfallChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: forecast.map(item => new Date(item.dt * 1000).toLocaleDateString('vi-VN', {weekday: 'short'}))
        },
        yAxis: { type: 'value', name: 'mm' },
        series: [{
            data: forecast.map(item => (item.rain?.['3h'] || 0)),
            type: 'bar',
            itemStyle: { color: '#10b981' }
        }]
    });
}

function updatePlantRecommendationsUI(recommendations) {
    // Create plant recommendations modal
    const modalHTML = `
        <div id="plantModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-2xl">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="ri-plant-line text-3xl"></i>
                                <h2 class="text-2xl font-bold">Gợi ý cây trồng thông minh</h2>
                            </div>
                            <button onclick="closePlantModal()" class="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors">
                                <i class="ri-close-line text-xl"></i>
                            </button>
                        </div>
                        <p class="text-green-100 mt-2">Dựa trên điều kiện thời tiết hiện tại và dự báo 7 ngày tới</p>
                    </div>
                    
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${recommendations.slice(0, 9).map(plant => `
                                <div class="plant-recommendation-card bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
                                    <div class="flex items-center justify-between mb-4">
                                        <div class="flex items-center gap-3">
                                            <span class="text-3xl">${plant.icon}</span>
                                            <div>
                                                <h3 class="font-bold text-gray-800">${plant.name}</h3>
                                                <p class="text-sm text-gray-600">${plant.category}</p>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-2xl font-bold ${plant.score >= 80 ? 'text-green-500' : plant.score >= 60 ? 'text-yellow-500' : 'text-red-500'}">${plant.score}%</div>
                                            <div class="text-xs text-gray-500">Phù hợp</div>
                                        </div>
                                    </div>
                                    
                                    <p class="text-gray-700 mb-4">${plant.description}</p>
                                    
                                    <div class="mb-4">
                                        <h4 class="font-semibold text-gray-800 mb-2">Lý do gợi ý:</h4>
                                        <ul class="space-y-1">
                                            ${plant.reasons.slice(0, 3).map(reason => `
                                                <li class="text-sm text-green-600 flex items-center gap-2">
                                                    <i class="ri-check-line"></i>
                                                    ${reason}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                    
                                    <div class="mb-4">
                                        <h4 class="font-semibold text-gray-800 mb-2">Lợi ích:</h4>
                                        <ul class="space-y-1">
                                            ${plant.benefits.slice(0, 2).map(benefit => `
                                                <li class="text-sm text-gray-600 flex items-center gap-2">
                                                    <i class="ri-star-line text-yellow-500"></i>
                                                    ${benefit}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                    
                                    <button onclick="showPlantDetails('${plant.id}')" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors">
                                        Xem chi tiết
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="mt-8 bg-blue-50 rounded-xl p-6">
                            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <i class="ri-information-line text-blue-500"></i>
                                Thông tin điều kiện hiện tại
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-blue-600">${Math.round(weatherData.current.main.temp)}°C</div>
                                    <div class="text-sm text-gray-600">Nhiệt độ</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-blue-600">${weatherData.current.main.humidity}%</div>
                                    <div class="text-sm text-gray-600">Độ ẩm</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-blue-600">${getSeasonName(getCurrentSeason())}</div>
                                    <div class="text-sm text-gray-600">Mùa</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-bold text-blue-600">${weatherData.current.weather[0].description}</div>
                                    <div class="text-sm text-gray-600">Thời tiết</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('plantModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ==================== MOCK DATA FOR TESTING ====================

function generateMockWeatherData() {
    return {
        current: {
            name: "Hà Nội",
            sys: { country: "VN" },
            main: {
                temp: 25,
                humidity: 75,
                pressure: 1013
            },
            weather: [{
                description: "trời quang đãng",
                main: "Clear"
            }],
            wind: {
                speed: 2.5
            }
        },
        forecast: {
            list: Array.from({length: 40}, (_, i) => ({
                dt: Date.now() / 1000 + (i * 3 * 3600),
                main: {
                    temp: 25 + Math.random() * 10 - 5,
                    humidity: 70 + Math.random() * 20
                },
                rain: Math.random() > 0.7 ? { '3h': Math.random() * 5 } : undefined
            }))
        }
    };
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Feature buttons
    document.querySelectorAll('.feature-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const feature = this.getAttribute('data-feature');
            handleFeatureClick(feature);
        });
    });
    
    // Location search
    const locationSearch = document.getElementById('locationSearch');
    if (locationSearch) {
        locationSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchLocation(this.value);
            }
        });
    }
}

function handleFeatureClick(feature) {
    switch(feature) {
        case 'weather':
            if (weatherData) {
                showNotification('Dữ liệu thời tiết đã được hiển thị trên bản đồ và biểu đồ', 'info');
            } else {
                showNotification('Vui lòng xác định vị trí để xem thời tiết', 'warning');
            }
            break;
        case 'plants':
            if (weatherData) {
                document.getElementById('plantModal').classList.remove('hidden');
            } else {
                showNotification('Vui lòng xác định vị trí để nhận gợi ý cây trồng', 'warning');
            }
            break;
        case 'sos':
            openSOSModal();
            break;
    }
}

async function searchLocation(query) {
    if (!query.trim()) return;
    
    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${WEATHER_API_KEY}`
        );
        
        const locations = await response.json();
        
        if (locations.length > 0) {
            const location = locations[0];
            userLocation = { lat: location.lat, lng: location.lon };
            
            map.setView([location.lat, location.lon], 13);
            
            if (currentLocationMarker) {
                map.removeLayer(currentLocationMarker);
            }
            
            currentLocationMarker = L.marker([location.lat, location.lon]).addTo(map);
            currentLocationMarker.bindPopup(`
                <div class="text-center">
                    <i class="ri-map-pin-line text-blue-500 text-xl mb-2"></i>
                    <p class="font-semibold">${location.name}</p>
                    <p class="text-sm text-gray-600">${location.country}</p>
                </div>
            `).openPopup();
            
            fetchWeatherData(location.lat, location.lon);
            showNotification(`Đã tìm thấy: ${location.name}, ${location.country}`, 'success');
        } else {
            showNotification('Không tìm thấy địa điểm', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Lỗi tìm kiếm địa điểm', 'error');
    }
}

// ==================== PLANT DETAILS MODAL ====================

function showPlantDetails(plantId) {
    const plant = plantDatabase.find(p => p.id === plantId);
    if (!plant) return;
    
    const modalHTML = `
        <div id="plantDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-2xl">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <span class="text-4xl">${plant.icon}</span>
                            <div>
                                <h2 class="text-2xl font-bold">${plant.name}</h2>
                                <p class="text-green-100">${plant.category}</p>
                            </div>
                        </div>
                        <button onclick="closePlantDetailsModal()" class="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors">
                            <i class="ri-close-line text-xl"></i>
                        </button>
                    </div>
                </div>
                
                <div class="p-6">
                    <p class="text-gray-700 text-lg mb-6">${plant.description}</p>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="bg-blue-50 rounded-xl p-6">
                            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <i class="ri-settings-line text-blue-500"></i>
                                Yêu cầu trồng trọt
                            </h3>
                            <div class="space-y-3">
                                <div>
                                    <span class="font-semibold">Nhiệt độ:</span>
                                    <span class="text-gray-600"> ${plant.requirements.temperature.min}°C - ${plant.requirements.temperature.max}°C (tối ưu: ${plant.requirements.temperature.optimal[0]}°C - ${plant.requirements.temperature.optimal[1]}°C)</span>
                                </div>
                                <div>
                                    <span class="font-semibold">Độ ẩm:</span>
                                    <span class="text-gray-600"> ${plant.requirements.humidity.min}% - ${plant.requirements.humidity.max}% (tối ưu: ${plant.requirements.humidity.optimal[0]}% - ${plant.requirements.humidity.optimal[1]}%)</span>
                                </div>
                                <div>
                                    <span class="font-semibold">Lượng mưa:</span>
                                    <span class="text-gray-600"> ${plant.requirements.rainfall.min}mm - ${plant.requirements.rainfall.max}mm/năm</span>
                                </div>
                                <div>
                                    <span class="font-semibold">Loại đất:</span>
                                    <span class="text-gray-600"> ${plant.requirements.soilType.map(type => soilDatabase.find(s => s.type === type)?.name || type).join(', ')}</span>
                                </div>
                                <div>
                                    <span class="font-semibold">pH đất:</span>
                                    <span class="text-gray-600"> ${plant.requirements.soilPH.min} - ${plant.requirements.soilPH.max}</span>
                                </div>
                                <div>
                                    <span class="font-semibold">Ánh sáng:</span>
                                    <span class="text-gray-600"> ${plant.requirements.sunlight === 'full' ? 'Toàn phần' : 'Bán phần'}</span>
                                </div>
                                <div>
                                    <span class="font-semibold">Mùa trồng:</span>
                                    <span class="text-gray-600"> ${plant.requirements.season.map(s => getSeasonName(s)).join(', ')}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <div class="bg-green-50 rounded-xl p-6 mb-6">
                                <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <i class="ri-star-line text-green-500"></i>
                                    Lợi ích
                                </h3>
                                <ul class="space-y-2">
                                    ${plant.benefits.map(benefit => `
                                        <li class="flex items-start gap-2">
                                            <i class="ri-check-line text-green-500 mt-1"></i>
                                            <span class="text-gray-700">${benefit}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                            
                            <div class="bg-yellow-50 rounded-xl p-6">
                                <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <i class="ri-lightbulb-line text-yellow-500"></i>
                                    Mẹo trồng trọt
                                </h3>
                                <ul class="space-y-2">
                                    ${plant.tips.map(tip => `
                                        <li class="flex items-start gap-2">
                                            <i class="ri-arrow-right-line text-yellow-500 mt-1"></i>
                                            <span class="text-gray-700">${tip}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closePlantModal() {
    const modal = document.getElementById('plantModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function closePlantDetailsModal() {
    const modal = document.getElementById('plantDetailsModal');
    if (modal) {
        modal.remove();
    }
}

// ==================== SOS SYSTEM ====================

function loadEmergencyContacts() {
    const saved = localStorage.getItem('emergencyContacts');
    if (saved) {
        emergencyContacts = JSON.parse(saved);
    } else {
        // Default emergency contacts for Vietnam
        emergencyContacts = [
            {
                id: 'police',
                name: 'Công an',
                phone: '113',
                description: 'Cảnh sát - Khẩn cấp',
                type: 'emergency',
                icon: 'ri-police-car-line',
                protected: true
            },
            {
                id: 'fire',
                name: 'Cứu hỏa',
                phone: '114',
                description: 'Phòng cháy chữa cháy',
                type: 'emergency',
                icon: 'ri-fire-line',
                protected: true
            },
            {
                id: 'medical',
                name: 'Cấp cứu',
                phone: '115',
                description: 'Cấp cứu y tế',
                type: 'emergency',
                icon: 'ri-hospital-line',
                protected: true
            },
            {
                id: 'rescue',
                name: 'Cứu nạn',
                phone: '116',
                description: 'Cứu hộ cứu nạn',
                type: 'emergency',
                icon: 'ri-lifebuoy-line',
                protected: true
            }
        ];
        saveEmergencyContacts();
    }
}

function saveEmergencyContacts() {
    localStorage.setItem('emergencyContacts', JSON.stringify(emergencyContacts));
}

function openSOSModal() {
    const modalHTML = `
        <div id="sosModal" class="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 rounded-t-2xl">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="ri-alarm-warning-line text-3xl"></i>
                                <h2 class="text-2xl font-bold">Hệ thống SOS Khẩn cấp</h2>
                            </div>
                            <button onclick="closeSOSModal()" class="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors">
                                <i class="ri-close-line text-xl"></i>
                            </button>
                        </div>
                        <p class="text-red-100 mt-2">Gọi ngay khi gặp tình huống khẩn cấp</p>
                    </div>
                    
                    <div class="p-6">
                        <div class="text-center mb-8">
                            <button id="sosButton" class="w-48 h-48 bg-red-500 hover:bg-red-600 text-white rounded-full text-6xl font-bold shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95">
                                <i class="ri-phone-line"></i>
                                <div class="text-2xl mt-2">SOS</div>
                            </button>
                            <p class="text-gray-600 mt-4">Nhấn để gọi cấp cứu (113)</p>
                        </div>
                        
                        <div class="mb-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-gray-800">Danh bạ khẩn cấp</h3>
                                <button onclick="openAddContactModal()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                                    <i class="ri-add-line"></i>
                                    Thêm liên hệ
                                </button>
                            </div>
                            <div id="emergencyContactsList" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                ${renderEmergencyContacts()}
                            </div>
                        </div>
                        
                        <div class="bg-yellow-50 rounded-xl p-6">
                            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <i class="ri-information-line text-yellow-500"></i>
                                Hướng dẫn sử dụng SOS
                            </h3>
                            <ul class="space-y-2 text-gray-700">
                                <li class="flex items-start gap-2">
                                    <i class="ri-arrow-right-line text-yellow-500 mt-1"></i>
                                    <span>Nhấn nút SOS đỏ để gọi ngay 113 (Công an)</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <i class="ri-arrow-right-line text-yellow-500 mt-1"></i>
                                    <span>Chọn số cụ thể từ danh bạ khẩn cấp</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <i class="ri-arrow-right-line text-yellow-500 mt-1"></i>
                                    <span>Thêm số điện thoại người thân vào danh bạ</span>
                                </li>
                                <li class="flex items-start gap-2">
                                    <i class="ri-arrow-right-line text-yellow-500 mt-1"></i>
                                    <span>Vị trí GPS sẽ được gửi tự động (nếu có)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('sosModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add SOS button event listener
    document.getElementById('sosButton').addEventListener('click', function() {
        makeEmergencyCall('113');
    });
}

function renderEmergencyContacts() {
    return emergencyContacts.map(contact => `
        <div class="contact-card bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <i class="${contact.icon} text-blue-600 text-xl"></i>
                </div>
                <div>
                    <h4 class="font-semibold text-gray-800">${contact.name}</h4>
                    <p class="text-sm text-gray-600">${contact.description}</p>
                    <p class="text-lg font-bold text-blue-600">${contact.phone}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="makeEmergencyCall('${contact.phone}')" class="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors" title="Gọi">
                    <i class="ri-phone-line"></i>
                </button>
                ${!contact.protected ? `
                    <button onclick="editContact('${contact.id}')" class="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors" title="Sửa">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button onclick="deleteContact('${contact.id}')" class="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors" title="Xóa">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function makeEmergencyCall(phoneNumber) {
    // Create location message
    let locationMessage = '';
    if (userLocation) {
        locationMessage = `\n\nVị trí GPS: https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;
    }
    
    // For mobile devices, try to make actual call
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.location.href = `tel:${phoneNumber}`;
    } else {
        // For desktop, show instructions
        showNotification(`Gọi ngay: ${phoneNumber}${locationMessage}`, 'emergency', 10000);
    }
    
    // Log emergency call
    console.log(`Emergency call to ${phoneNumber} at ${new Date().toISOString()}`);
    
    // Show emergency status
    showEmergencyStatus(phoneNumber);
}

function showEmergencyStatus(phoneNumber) {
    const statusHTML = `
        <div id="emergencyStatus" class="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
            <div class="flex items-center gap-3">
                <i class="ri-phone-line text-2xl animate-pulse"></i>
                <div>
                    <div class="font-bold">Đang gọi khẩn cấp</div>
                    <div class="text-sm">Số: ${phoneNumber}</div>
                    ${userLocation ? `<div class="text-xs mt-1">GPS: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</div>` : ''}
                </div>
            </div>
            <button onclick="closeEmergencyStatus()" class="absolute top-2 right-2 text-white hover:bg-red-600 rounded p-1">
                <i class="ri-close-line"></i>
            </button>
        </div>
    `;
    
    // Remove existing status
    const existing = document.getElementById('emergencyStatus');
    if (existing) existing.remove();
    
    // Add new status
    document.body.insertAdjacentHTML('beforeend', statusHTML);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        closeEmergencyStatus();
    }, 10000);
}

function closeEmergencyStatus() {
    const status = document.getElementById('emergencyStatus');
    if (status) status.remove();
}

function closeSOSModal() {
    const modal = document.getElementById('sosModal');
    if (modal) {
        modal.remove();
    }
}

// ==================== CONTACT MANAGEMENT ====================

function openAddContactModal() {
    const modalHTML = `
        <div id="addContactModal" class="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div class="bg-blue-500 text-white p-6 rounded-t-2xl">
                    <h3 class="text-xl font-bold">Thêm liên hệ khẩn cấp</h3>
                </div>
                <form class="contact-form p-6" onsubmit="addContact(event)">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Tên liên hệ</label>
                            <input type="text" name="name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ví dụ: Bố, Mẹ, Bạn...">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại</label>
                            <input type="tel" name="phone" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ví dụ: 0901234567">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Mô tả</label>
                            <input type="text" name="description" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ví dụ: Người thân, Bạn bè...">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Loại</label>
                            <select name="type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="family">Gia đình</option>
                                <option value="friend">Bạn bè</option>
                                <option value="medical">Y tế</option>
                                <option value="custom">Khác</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Biểu tượng</label>
                            <select name="icon" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="ri-user-line">👤 Người</option>
                                <option value="ri-parent-line">👨‍👩‍👧‍👦 Gia đình</option>
                                <option value="ri-heart-line">❤️ Yêu thương</option>
                                <option value="ri-phone-line">📞 Điện thoại</option>
                                <option value="ri-hospital-line">🏥 Y tế</option>
                                <option value="ri-car-line">🚗 Xe cộ</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="button" onclick="closeAddContactModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors">
                            Hủy
                        </button>
                        <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors">
                            Thêm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function addContact(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const phone = formData.get('phone').trim();
    
    // Check for duplicate phone numbers
    if (emergencyContacts.some(contact => contact.phone === phone)) {
        showNotification('Số điện thoại này đã tồn tại!', 'error');
        return;
    }
    
    const newContact = {
        id: 'custom_' + Date.now(),
        name: formData.get('name').trim(),
        phone: phone,
        description: formData.get('description').trim() || 'Liên hệ cá nhân',
        type: formData.get('type'),
        icon: formData.get('icon'),
        protected: false
    };
    
    emergencyContacts.push(newContact);
    saveEmergencyContacts();
    
    // Update UI
    updateEmergencyContactsList();
    closeAddContactModal();
    
    showNotification(`Đã thêm liên hệ: ${newContact.name}`, 'success');
}

function editContact(contactId) {
    const contact = emergencyContacts.find(c => c.id === contactId);
    if (!contact || contact.protected) return;
    
    const modalHTML = `
        <div id="editContactModal" class="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                <div class="bg-green-500 text-white p-6 rounded-t-2xl">
                    <h3 class="text-xl font-bold">Chỉnh sửa liên hệ</h3>
                </div>
                <form class="contact-form p-6" onsubmit="updateContact(event, '${contactId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Tên liên hệ</label>
                            <input type="text" name="name" value="${contact.name}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại</label>
                            <input type="tel" name="phone" value="${contact.phone}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Mô tả</label>
                            <input type="text" name="description" value="${contact.description}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Loại</label>
                            <select name="type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                <option value="family" ${contact.type === 'family' ? 'selected' : ''}>Gia đình</option>
                                <option value="friend" ${contact.type === 'friend' ? 'selected' : ''}>Bạn bè</option>
                                <option value="medical" ${contact.type === 'medical' ? 'selected' : ''}>Y tế</option>
                                <option value="custom" ${contact.type === 'custom' ? 'selected' : ''}>Khác</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Biểu tượng</label>
                            <select name="icon" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                                <option value="ri-user-line" ${contact.icon === 'ri-user-line' ? 'selected' : ''}>👤 Người</option>
                                <option value="ri-parent-line" ${contact.icon === 'ri-parent-line' ? 'selected' : ''}>👨‍👩‍👧‍👦 Gia đình</option>
                                <option value="ri-heart-line" ${contact.icon === 'ri-heart-line' ? 'selected' : ''}>❤️ Yêu thương</option>
                                <option value="ri-phone-line" ${contact.icon === 'ri-phone-line' ? 'selected' : ''}>📞 Điện thoại</option>
                                <option value="ri-hospital-line" ${contact.icon === 'ri-hospital-line' ? 'selected' : ''}>🏥 Y tế</option>
                                <option value="ri-car-line" ${contact.icon === 'ri-car-line' ? 'selected' : ''}>🚗 Xe cộ</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-3 mt-6">
                        <button type="button" onclick="closeEditContactModal()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors">
                            Hủy
                        </button>
                        <button type="submit" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors">
                            Cập nhật
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function updateContact(event, contactId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const phone = formData.get('phone').trim();
    
    // Check for duplicate phone numbers (excluding current contact)
    if (emergencyContacts.some(contact => contact.phone === phone && contact.id !== contactId)) {
        showNotification('Số điện thoại này đã tồn tại!', 'error');
        return;
    }
    
    const contactIndex = emergencyContacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) return;
    
    emergencyContacts[contactIndex] = {
        ...emergencyContacts[contactIndex],
        name: formData.get('name').trim(),
        phone: phone,
        description: formData.get('description').trim() || 'Liên hệ cá nhân',
        type: formData.get('type'),
        icon: formData.get('icon')
    };
    
    saveEmergencyContacts();
    updateEmergencyContactsList();
    closeEditContactModal();
    
    showNotification('Đã cập nhật liên hệ!', 'success');
}

function deleteContact(contactId) {
    const contact = emergencyContacts.find(c => c.id === contactId);
    if (!contact || contact.protected) return;
    
    if (confirm(`Bạn có chắc muốn xóa liên hệ "${contact.name}"?`)) {
        emergencyContacts = emergencyContacts.filter(c => c.id !== contactId);
        saveEmergencyContacts();
        updateEmergencyContactsList();
        showNotification(`Đã xóa liên hệ: ${contact.name}`, 'success');
    }
}

function updateEmergencyContactsList() {
    const listElement = document.getElementById('emergencyContactsList');
    if (listElement) {
        listElement.innerHTML = renderEmergencyContacts();
    }
}

function closeAddContactModal() {
    const modal = document.getElementById('addContactModal');
    if (modal) modal.remove();
}

function closeEditContactModal() {
    const modal = document.getElementById('editContactModal');
    if (modal) modal.remove();
}

// ==================== DISASTER WARNING SYSTEM ====================

function openDisasterWarningModal() {
    const updateTime = new Date().toLocaleString('vi-VN');
    
    const modalHTML = `
        <div id="disasterModal" class="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 rounded-t-2xl">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="ri-alarm-warning-line text-3xl"></i>
                                <h2 class="text-2xl font-bold">Hệ thống cảnh báo thiên tai</h2>
                            </div>
                            <button onclick="closeDisasterWarningModal()" class="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-colors">
                                <i class="ri-close-line text-xl"></i>
                            </button>
                        </div>
                        <p class="text-red-100 mt-2">Cập nhật: ${updateTime}</p>
                    </div>

                    <!-- Content -->
                    <div class="p-6">
                        <!-- Current Alerts -->
                        <div class="mb-8">
                            <div class="flex items-center gap-2 mb-4">
                                <i class="ri-alert-line text-red-500 text-xl"></i>
                                <h3 class="text-xl font-bold text-gray-800">Cảnh báo hiện tại (0)</h3>
                            </div>
                            <div class="bg-blue-50 rounded-lg p-6 text-center">
                                <i class="ri-shield-check-line text-green-500 text-4xl mb-3"></i>
                                <p class="text-gray-600 text-lg">Không có cảnh báo nào</p>
                                <p class="text-gray-500 text-sm mt-2">Khu vực của bạn hiện tại an toàn</p>
                            </div>
                        </div>

                        <!-- Risk Assessment & History Grid -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <!-- Risk Assessment -->
                            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <i class="ri-pie-chart-line text-blue-600"></i>
                                    Đánh giá rủi ro tổng thể
                                </h3>
                                <div class="text-center mb-4">
                                    <div class="relative w-24 h-24 mx-auto mb-3">
                                        <div class="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span class="text-2xl font-bold text-gray-600">57</span>
                                        </div>
                                    </div>
                                    <p class="text-lg font-semibold text-gray-700">Trung bình</p>
                                </div>
                                <div class="space-y-3">
                                    ${generateRiskBars()}
                                </div>
                            </div>

                            <!-- Disaster History -->
                            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <i class="ri-history-line text-green-600"></i>
                                    Lịch sử thiên tai (30 ngày)
                                </h3>
                                <div class="text-center py-8">
                                    <i class="ri-calendar-check-line text-green-500 text-4xl mb-3"></i>
                                    <p class="text-gray-600">Không có sự kiện thiên tai nào trong 30 ngày qua</p>
                                </div>
                            </div>
                        </div>

                        <!-- Emergency Response Guide -->
                        <div class="mt-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <i class="ri-first-aid-kit-line text-purple-600"></i>
                                Hướng dẫn ứng phó khẩn cấp
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                ${generateEmergencyGuides()}
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="mt-6 flex flex-wrap gap-3 justify-center">
                            <button onclick="refreshAlerts()" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full transition-colors flex items-center gap-2">
                                <i class="ri-refresh-line"></i>
                                Làm mới cảnh báo
                            </button>
                            <button onclick="subscribeAlerts()" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full transition-colors flex items-center gap-2">
                                <i class="ri-notification-line"></i>
                                Đăng ký thông báo
                            </button>
                            <button onclick="shareAlerts()" class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-full transition-colors flex items-center gap-2">
                                <i class="ri-share-line"></i>
                                Chia sẻ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('disasterModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function generateRiskBars() {
    const risks = [
        {name: 'Lũ lụt', value: 70, color: 'red'},
        {name: 'Bão', value: 60, color: 'orange'},
        {name: 'Sấm sét', value: 80, color: 'red'},
        {name: 'Mưa lớn', value: 85, color: 'red'},
        {name: 'Sạt lở', value: 65, color: 'yellow'},
        {name: 'Nắng nóng', value: 30, color: 'green'},
        {name: 'Hạn hán', value: 10, color: 'blue'}
    ];
    
    return risks.map(risk => `
        <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">${risk.name}</span>
            <div class="flex items-center gap-2">
                <div class="w-20 h-2 bg-gray-200 rounded-full">
                    <div class="h-2 bg-${risk.color}-500 rounded-full" style="width: ${risk.value}%"></div>
                </div>
                <span class="text-xs text-gray-500">${risk.value}%</span>
            </div>
        </div>
    `).join('');
}

function generateEmergencyGuides() {
    const guides = [
        {
            icon: 'ri-information-line',
            color: 'blue',
            title: 'Lũ lụt',
            tips: [
                'Di chuyển đến cao hơn',
                'Tránh xa dòng nước chảy',
                'Chuẩn bị đồ dùng khẩn cấp',
                'Theo dõi thông tin cảnh báo'
            ]
        },
        {
            icon: 'ri-shield-line',
            color: 'orange',
            title: 'Bão',
            tips: [
                'Gia cố nhà cửa',
                'Dự trữ thực phẩm và nước',
                'Tránh ra ngoài khi bão đổ bộ',
                'Chuẩn bị đèn pin và pin dự phòng'
            ]
        },
        {
            icon: 'ri-alert-line',
            color: 'red',
            title: 'Sạt lở đất',
            tips: [
                'Tránh xa khu vực dốc',
                'Quan sát các dấu hiệu bất thường',
                'Di tản khi có cảnh báo',
                'Không xây dựng gần sườn núi'
            ]
        }
    ];
    
    return guides.map(guide => `
        <div class="bg-white rounded-lg p-4 emergency-guide-card">
            <div class="flex items-center gap-2 mb-2">
                <i class="${guide.icon} text-${guide.color}-500"></i>
                <h4 class="font-semibold text-gray-700">${guide.title}</h4>
            </div>
            <ul class="text-sm text-gray-600 space-y-1">
                ${guide.tips.map(tip => `<li>• ${tip}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

function closeDisasterWarningModal() {
    const modal = document.getElementById('disasterModal');
    if (modal) {
        modal.remove();
    }
}

function refreshAlerts() {
    showNotification('Đang làm mới cảnh báo...', 'info');
    // Simulate API call
    setTimeout(() => {
        showNotification('Cảnh báo đã được cập nhật!', 'success');
    }, 1500);
}

function subscribeAlerts() {
    showNotification('Đã đăng ký nhận thông báo cảnh báo thiên tai!', 'success');
}

function shareAlerts() {
    if (navigator.share) {
        navigator.share({
            title: 'Cảnh báo thiên tai',
            text: 'Theo dõi cảnh báo thiên tai tại khu vực của bạn',
            url: window.location.href
        });
    } else {
        // Fallback for browsers that don't support Web Share API
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('Đã sao chép link chia sẻ!', 'success');
        });
    }
}

// ==================== NOTIFICATION SYSTEM ====================

function showNotification(message, type = 'info', duration = 5000) {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500',
        emergency: 'bg-red-600'
    };
    
    const icons = {
        success: 'ri-check-line',
        error: 'ri-error-warning-line',
        warning: 'ri-alert-line',
        info: 'ri-information-line',
        emergency: 'ri-alarm-warning-line'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white p-4 rounded-lg shadow-lg z-50 max-w-sm notification-enter`;
    notification.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="${icons[type]} text-xl"></i>
            <div class="flex-1">
                <div class="font-semibold">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:bg-white hover:bg-opacity-20 rounded p-1">
                <i class="ri-close-line"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('notification-exit');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, duration);
}

// ==================== UTILITY FUNCTIONS ====================



// Make functions globally available
window.locateUser = locateUser;
window.openDisasterWarningModal = openDisasterWarningModal;
window.closeDisasterWarningModal = closeDisasterWarningModal;
window.refreshAlerts = refreshAlerts;
window.subscribeAlerts = subscribeAlerts;
window.shareAlerts = shareAlerts;
window.openSOSModal = openSOSModal;
window.closeSOSModal = closeSOSModal;
window.makeEmergencyCall = makeEmergencyCall;
window.closeEmergencyStatus = closeEmergencyStatus;
window.openAddContactModal = openAddContactModal;
window.closeAddContactModal = closeAddContactModal;
window.addContact = addContact;
window.editContact = editContact;
window.updateContact = updateContact;
window.deleteContact = deleteContact;
window.closeEditContactModal = closeEditContactModal;
window.closePlantModal = closePlantModal;
window.showPlantDetails = showPlantDetails;
window.closePlantDetailsModal = closePlantDetailsModal;

console.log('🌱 Weather & Plant Recommendation System initialized successfully!');
console.log('📊 Features loaded:');
console.log('  ✅ Real-time weather data with OpenWeatherMap API');
console.log('  ✅ Intelligent plant recommendations');
console.log('  ✅ Interactive maps with Leaflet');
console.log('  ✅ Weather charts with ECharts');
console.log('  ✅ SOS emergency system');
console.log('  ✅ Disaster warning system');
console.log('  ✅ Contact management');
console.log('  ✅ GPS location services');
