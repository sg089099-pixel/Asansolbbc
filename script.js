// Google Apps Script Endpoint
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwYX2CKpZ9BHaWXMtpfw6fTVINr4L1oTG7x4m9Uk9YqEG2Zy0HyhVfgcNPS5-r3CT5keg/exec';

// DOM Elements
const dateTimeEl = document.getElementById('dateTime');
const currentTempEl = document.getElementById('current-temp');
const highTempEl = document.getElementById('high-temp');
const lowTempEl = document.getElementById('low-temp');
const humidityEl = document.getElementById('humidity');
const pressureEl = document.getElementById('pressure');
const uvIndexEl = document.getElementById('uv-index');
const aqiEl = document.getElementById('aqi');
const coLevelEl = document.getElementById('co-level');
const pm25El = document.getElementById('pm25');
const pm10El = document.getElementById('pm10');
const windSpeedEl = document.getElementById('wind-speed');
const windDirectionEl = document.getElementById('wind-direction');
const windAngleEl = document.getElementById('wind-angle');
const windGustEl = document.getElementById('wind-gust');
const compassWindSpeedEl = document.getElementById('compass-wind-speed');
const needleEl = document.getElementById('needle');
const thermometerEl = document.getElementById('thermometer-mercury');
const currentRainfallEl = document.getElementById('current-rainfall');
const rainIntensityLabelEl = document.getElementById('rain-intensity-label');
const rainCardEl = document.getElementById('rain-card');

// Temperature Chart
let temperatureChart;

// Date and Time Display
function displayDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    dateTimeEl.textContent = now.toLocaleDateString('en-IN', options);
}

// Calculate AQI based on PM2.5, PM10 and CO levels
function calculateAQI(pm25, pm10, co) {
    // AQI calculation based on Indian AQI standards
    // Breakpoints for PM2.5 (µg/m³)
    const pm25Breakpoints = [0, 30, 60, 90, 120, 250];
    const pm25AQI = [0, 50, 100, 200, 300, 400, 500];
    
    // Breakpoints for PM10 (µg/m³)
    const pm10Breakpoints = [0, 50, 100, 250, 350, 430];
    const pm10AQI = [0, 50, 100, 200, 300, 400, 500];
    
    // Breakpoints for CO (ppm)
    const coBreakpoints = [0, 1, 2, 10, 17, 34];
    const coAQI = [0, 50, 100, 200, 300, 400, 500];
    
    // Calculate sub-indices
    const pm25SubIndex = calculateSubIndex(pm25, pm25Breakpoints, pm25AQI);
    const pm10SubIndex = calculateSubIndex(pm10, pm10Breakpoints, pm10AQI);
    const coSubIndex = calculateSubIndex(co, coBreakpoints, coAQI);
    
    // AQI is the maximum of the sub-indices
    return Math.max(pm25SubIndex, pm10SubIndex, coSubIndex);
}

function calculateSubIndex(value, breakpoints, aqiValues) {
    if (value <= breakpoints[0]) return 0;
    
    for (let i = 0; i < breakpoints.length; i++) {
        if (value <= breakpoints[i]) {
            const bpLow = breakpoints[i-1];
            const bpHigh = breakpoints[i];
            const aqiLow = aqiValues[i-1];
            const aqiHigh = aqiValues[i];
            
            return Math.round(((aqiHigh - aqiLow) / (bpHigh - bpLow)) * (value - bpLow) + aqiLow);
        }
    }
    
    return aqiValues[aqiValues.length - 1]; // Return max AQI if value exceeds highest breakpoint
}

// Fetch Data from Google Apps Script
async function fetchWeatherData() {
    try {
        const response = await fetch(APP_SCRIPT_URL);
        const result = await response.json();
       
        if (result.status === 'success' && result.data.length > 0) {
            // Assuming first row is current data
            const currentData = result.data[0];
           
            // Map data to variables (adjust indices based on your sheet structure)
            const weatherData = {
                temperature: parseFloat(currentData[0]) || 0,       // Column K
                humidity: parseFloat(currentData[1]) || 0,          // Column L
                highTemp: parseFloat(currentData[2]) || 0,          // Column M
                lowTemp: parseFloat(currentData[3]) || 0,           // Column N
                pressure: parseFloat(currentData[4]) || 0,          // Column O
                uvIndex: parseFloat(currentData[5]) || 0,           // Column P
                pm25: parseFloat(currentData[6]) || 0,              // Column Q (PM2.5)
                pm10: parseFloat(currentData[7]) || 0,              // Column R (PM10)
                coLevel: parseFloat(currentData[8]) || 0,           // Column S (CO)
                windSpeed: parseFloat(currentData[9]) || 0,         // Column T
                windDirection: currentData[10] || 'N',              // Column U
                rainfall: parseFloat(currentData[11]) || 0          // Column V
            };
            
            // Calculate AQI
            weatherData.aqi = calculateAQI(weatherData.pm25, weatherData.pm10, weatherData.coLevel);
           
            updateWeatherDisplay(weatherData);
           
            // Update chart with last 24 data points
            const chartData = result.data.slice(0, 24).map(row => parseFloat(row[0]) || 0);
            updateTemperatureChart(chartData);
           
            // Update last updated time
            const lastUpdated = new Date(result.lastUpdated);
            console.log('Data last updated:', lastUpdated.toLocaleString());
        } else {
            throw new Error(result.message || 'No data available');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        // Fallback to sample data
        updateWeatherDisplay(getSampleData());
    }
}

// Update all weather displays
function updateWeatherDisplay(data) {
    // Temperature
    currentTempEl.textContent = `${data.temperature.toFixed(1)}°C`;
    highTempEl.textContent = `${data.highTemp.toFixed(1)}°C`;
    lowTempEl.textContent = `${data.lowTemp.toFixed(1)}°C`;
   
    // Update thermometer
    updateThermometer(data.temperature);
   
    // Other metrics
    humidityEl.textContent = `${data.humidity.toFixed(0)}%`;
    pressureEl.textContent = `${data.pressure.toFixed(0)} hPa`;
    uvIndexEl.textContent = data.uvIndex.toFixed(0);
    aqiEl.textContent = data.aqi.toFixed(0);
    coLevelEl.textContent = `${data.coLevel.toFixed(1)} ppm`;
    pm25El.textContent = `${data.pm25.toFixed(1)} µg/m³`;
    pm10El.textContent = `${data.pm10.toFixed(1)} µg/m³`;
   
    // Wind data
    const windSpeedKmh = (data.windSpeed * 3.6).toFixed(1); // Convert m/s to km/h
    windSpeedEl.textContent = `${windSpeedKmh} km/h`;
    compassWindSpeedEl.textContent = windSpeedKmh;
   
    // Wind direction (convert to degrees if needed)
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    let windDegrees = 0;
   
    // If windDirection is a compass point (N, NE, etc.)
    if (isNaN(data.windDirection)) {
        const index = directions.indexOf(data.windDirection.toUpperCase());
        windDegrees = index * 22.5;
    } else {
        windDegrees = parseFloat(data.windDirection);
    }
   
    const index = Math.round(windDegrees / 22.5) % 16;
    const compassDir = directions[index];
   
    windDirectionEl.textContent = `${compassDir} ${Math.round(windDegrees)}°`;
    windAngleEl.textContent = `${Math.round(windDegrees)}°`;
    needleEl.style.transform = `translate(-50%, -100%) rotate(${windDegrees}deg)`;
   
    // Rainfall
                    //updateRainDisplay(data.rainfall);
    
    // Update AQI color based on value
    updateAQIColor(data.aqi);
}

// Update AQI display color based on value
function updateAQIColor(aqi) {
    const aqiValue = parseFloat(aqi);
    let color = '#4caf50'; // Good (Green)
    
    if (aqiValue > 50 && aqiValue <= 100) {
        color = '#ffeb3b'; // Satisfactory (Yellow)
    } else if (aqiValue > 100 && aqiValue <= 200) {
        color = '#ff9800'; // Moderate (Orange)
    } else if (aqiValue > 200 && aqiValue <= 300) {
        color = '#f44336'; // Poor (Red)
    } else if (aqiValue > 300 && aqiValue <= 400) {
        color = '#9c27b0'; // Very Poor (Purple)
    } else if (aqiValue > 400) {
        color = '#795548'; // Severe (Brown)
    }
    
    aqiEl.style.color = color;
    aqiEl.style.textShadow = `0 0 8px ${color}`;
}

// Update thermometer visualization
function updateThermometer(temp) {
    // Scale temperature to thermometer height (0-50°C range)
    const height = Math.min(100, Math.max(0, (temp / 50) * 100));
    thermometerEl.style.height = `${height}%`;
    
    // Change color based on temperature
    if (temp < 10) {
        thermometerEl.style.background = '#42a5f5'; // Cold blue
    } else if (temp < 25) {
        thermometerEl.style.background = '#4caf50'; // Pleasant green
    } else if (temp < 35) {
        thermometerEl.style.background = '#ff9800'; // Warm orange
    } else {
        thermometerEl.style.background = '#f44336'; // Hot red
    }
}

// Update rain display with animation
function updateRainDisplay(rainfallMM) {
    currentRainfallEl.textContent = `${rainfallMM.toFixed(1)} mm`;
    
    // Clear previous intensity classes
    rainCardEl.classList.remove(
        'rain-intensity-light', 
        'rain-intensity-medium', 
        'rain-intensity-heavy'
    );
    
    // Update based on intensity
    if (rainfallMM === 0) {
        rainIntensityLabelEl.textContent = "No Rain";
        rainIntensityLabelEl.style.color = "#888";
    } else if (rainfallMM < 2.5) {
        rainCardEl.classList.add('rain-intensity-light');
        rainIntensityLabelEl.textContent = "Light Rain";
    } else if (rainfallMM < 7.5) {
        rainCardEl.classList.add('rain-intensity-medium');
        rainIntensityLabelEl.textContent = "Moderate Rain";
    } else {
        rainCardEl.classList.add('rain-intensity-heavy');
        rainIntensityLabelEl.textContent = "Heavy Rain";
    }
}

// Initialize temperature chart
function initTemperatureChart() {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    
    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(24).fill().map((_, i) => `${i}:00`),
            datasets: [{
                label: 'Temperature (°C)',
                data: Array(24).fill(null),
                borderColor: '#ffcc00',
                backgroundColor: 'rgba(255, 204, 0, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#ffcc00',
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 10
                        },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 6
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.4
                }
            }
        }
    });
}

// Update temperature chart with historical data
function updateTemperatureChart(temperatureData) {
    if (!temperatureChart) return;
    
    // Update chart data
    temperatureChart.data.datasets[0].data = temperatureData;
    
    // Update labels with time information
    const now = new Date();
    temperatureChart.data.labels = temperatureData.map((_, i) => {
        const d = new Date(now);
        d.setHours(now.getHours() - (temperatureData.length - 1 - i));
        return d.getHours() + ':00';
    });
    
    temperatureChart.update();
}

// Sample data for fallback
function getSampleData() {
    const now = new Date();
    const hour = now.getHours();
    
    // Simulate some realistic variations
    return {
        temperature: 25 + 10 * Math.sin(hour * Math.PI / 12),
        humidity: 50 + 30 * Math.sin(hour * Math.PI / 12),
        highTemp: 32,
        lowTemp: 18,
        pressure: 1012 + (Math.random() * 4 - 2),
        uvIndex: Math.min(10, Math.max(1, Math.round(3 + 5 * Math.sin(hour * Math.PI / 12)))),
        aqi: Math.min(300, Math.max(20, Math.round(50 + 100 * Math.sin(hour * Math.PI / 12)))),
        coLevel: 0.5 + (Math.random() * 2),
        windSpeed: 2 + (Math.random() * 5),
        windDirection: Math.round(Math.random() * 360),
        rainfall: hour > 6 && hour < 18 ? Math.random() * 5 : 0 // More likely to rain during day
    };
}

// Sun Position Calculator
async function fetchSunTimes() {
    try {
        const response = await fetch('https://api.sunrise-sunset.org/json?lat=23.6889&lng=86.9661&formatted=0');
        const data = await response.json();
        
        if (data.status === "OK") {
            const sunriseUTC = new Date(data.results.sunrise);
            const sunsetUTC = new Date(data.results.sunset);
            
            // Convert to IST (UTC+5:30)
            const sunrise = new Date(sunriseUTC.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const sunset = new Date(sunsetUTC.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            
            // Format times
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
            document.getElementById('sunrise-time').textContent = sunrise.toLocaleTimeString('en-IN', timeOptions);
            document.getElementById('sunset-time').textContent = sunset.toLocaleTimeString('en-IN', timeOptions);
            
            updateSunPosition(sunrise, sunset);
            setInterval(() => updateSunPosition(sunrise, sunset), 60000);
        }
    } catch (error) {
        console.error("Error fetching sun data:", error);
        document.getElementById('sunrise-time').textContent = "06:00 AM";
        document.getElementById('sunset-time').textContent = "06:00 PM";
    }
}

function updateSunPosition(sunrise, sunset) {
    const now = new Date();
    const nowTime = now.getTime();
    const sunriseTime = sunrise.getTime();
    const sunsetTime = sunset.getTime();
    
    if (nowTime < sunriseTime || nowTime > sunsetTime) {
        document.getElementById('sun').style.opacity = '0';
        return;
    }
    
    document.getElementById('sun').style.opacity = '1';
    
    const totalDaylight = sunsetTime - sunriseTime;
    const elapsedTime = nowTime - sunriseTime;
    let progress = elapsedTime / totalDaylight;
    progress = Math.max(0, Math.min(progress, 1));
    
    const radius = 40;
    const centerX = 50;
    const centerY = 50;
    const angle = progress * Math.PI;
    const sunX = centerX + radius * Math.cos(angle);
    const sunY = centerY - radius * Math.sin(angle);
    
    const sun = document.getElementById('sun');
    sun.style.left = `calc(${sunX}% - 12.5px)`;
    sun.style.top = `calc(${sunY}% - 12.5px)`;
    
    if (progress < 0.25 || progress > 0.75) {
        sun.style.background = '#ff9900';
        sun.style.boxShadow = '0 0 30px #ff9900';
    } else {
        sun.style.background = '#ffcc00';
        sun.style.boxShadow = '0 0 40px #ffcc00';
    }
}

// Moon Phase Calculator
function calculateMoonPhase(date) {
    const referenceDate = new Date('2000-01-06T18:14:00Z');
    const lunarCycle = 29.53058867 * 24 * 60 * 60 * 1000;
    const diff = date - referenceDate;
    const phase = (diff % lunarCycle) / lunarCycle;
    const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

    const phases = [
        { icon: '🌑', name: 'New Moon', min: 0.00, max: 0.02 },
        { icon: '🌒', name: 'Waxing Crescent (Early)', min: 0.02, max: 0.07 },
        { icon: '🌒', name: 'Waxing Crescent (Mid)', min: 0.07, max: 0.125 },
        { icon: '🌒', name: 'Waxing Crescent (Late)', min: 0.125, max: 0.175 },
        { icon: '🌓', name: 'First Quarter', min: 0.175, max: 0.25 },
        { icon: '🌔', name: 'Waxing Gibbous (Early)', min: 0.25, max: 0.325 },
        { icon: '🌔', name: 'Waxing Gibbous (Mid)', min: 0.325, max: 0.375 },
        { icon: '🌔', name: 'Waxing Gibbous (Late)', min: 0.375, max: 0.425 },
        { icon: '🌕', name: 'Full Moon', min: 0.425, max: 0.52 },
        { icon: '🌖', name: 'Waning Gibbous (Early)', min: 0.52, max: 0.575 },
        { icon: '🌖', name: 'Waning Gibbous (Mid)', min: 0.575, max: 0.625 },
        { icon: '🌖', name: 'Waning Gibbous (Late)', min: 0.625, max: 0.675 },
        { icon: '🌗', name: 'Last Quarter', min: 0.675, max: 0.75 },
        { icon: '🌘', name: 'Waning Crescent (Early)', min: 0.75, max: 0.825 },
        { icon: '🌘', name: 'Waning Crescent (Mid)', min: 0.825, max: 0.875 },
        { icon: '🌘', name: 'Waning Crescent (Late)', min: 0.875, max: 0.925 },
        { icon: '🌑', name: 'New Moon', min: 0.925, max: 1.00 }
    ];

    const currentPhase = phases.find(p => phase >= p.min && phase < p.max) || { icon: '🌑', name: 'New Moon' };
    return {
        icon: currentPhase.icon,
        name: currentPhase.name,
        illumination: (illumination * 100).toFixed(1)
    };
}

function updateMoonPhase() {
    const date = new Date();
    const moonData = calculateMoonPhase(date);
    document.getElementById('moon-phase-icon').textContent = moonData.icon;
    document.getElementById('moon-phase-details').textContent = moonData.name;
    document.getElementById('moon-illumination').textContent = `${moonData.illumination}% illuminated`;
}

// Initialize everything
function init() {
    // Start time display
    displayDateTime();
    setInterval(displayDateTime, 1000);
    
    // Initialize celestial data
    fetchSunTimes();
    updateMoonPhase();
    setInterval(updateMoonPhase, 3600000); // Update moon phase hourly
    
    // Initialize temperature chart
    initTemperatureChart();
    
    // Fetch initial weather data
    fetchWeatherData();
    setInterval(fetchWeatherData, 300000); // Update every 5 minutes
}

// Start the application
window.onload = init;
