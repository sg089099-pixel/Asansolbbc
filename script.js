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

// AQI Calculation
function calculateAQI(pm25, pm10, co) {
    const pm25Breakpoints = [0, 30, 60, 90, 120, 250];
    const pm25AQI = [0, 50, 100, 200, 300, 400, 500];
    const pm10Breakpoints = [0, 50, 100, 250, 350, 430];
    const pm10AQI = [0, 50, 100, 200, 300, 400, 500];
    const coBreakpoints = [0, 1, 2, 10, 17, 34];
    const coAQI = [0, 50, 100, 200, 300, 400, 500];

    const pm25SubIndex = calculateSubIndex(pm25, pm25Breakpoints, pm25AQI);
    const pm10SubIndex = calculateSubIndex(pm10, pm10Breakpoints, pm10AQI);
    const coSubIndex = calculateSubIndex(co, coBreakpoints, coAQI);

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
    return aqiValues[aqiValues.length - 1];
}

// Fetch Weather Data
async function fetchWeatherData() {
    try {
        const response = await fetch(APP_SCRIPT_URL);
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            const currentData = result.data[0];
            const weatherData = {
                temperature: parseFloat(currentData[0]) || 0,
                humidity: parseFloat(currentData[1]) || 0,
                highTemp: parseFloat(currentData[2]) || 0,
                lowTemp: parseFloat(currentData[3]) || 0,
                pressure: parseFloat(currentData[4]) || 0,
                uvIndex: parseFloat(currentData[5]) || 0,
                pm25: parseFloat(currentData[6]) || 0,
                pm10: parseFloat(currentData[7]) || 0,
                coLevel: parseFloat(currentData[8]) || 0,
                windSpeed: parseFloat(currentData[9]) || 0,
                windDirection: currentData[10] || 'N',
                rainfall: parseFloat(currentData[11]) || 0
            };
            weatherData.aqi = calculateAQI(weatherData.pm25, weatherData.pm10, weatherData.coLevel);
            updateWeatherDisplay(weatherData);

            const chartData = result.data.slice(0, 24).map(row => parseFloat(row[0]) || 0);
            updateTemperatureChart(chartData);
        } else {
            throw new Error(result.message || 'No data available');
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        updateWeatherDisplay(getSampleData());
    }
}

// Update Weather Display
function updateWeatherDisplay(data) {
    currentTempEl.textContent = `${data.temperature.toFixed(1)}°C`;
    highTempEl.textContent = `${data.highTemp.toFixed(1)}°C`;
    lowTempEl.textContent = `${data.lowTemp.toFixed(1)}°C`;
    humidityEl.textContent = `${data.humidity.toFixed(0)}%`;
    pressureEl.textContent = `${data.pressure.toFixed(0)} hPa`;
    uvIndexEl.textContent = data.uvIndex.toFixed(0);
    aqiEl.textContent = data.aqi.toFixed(0);
    coLevelEl.textContent = `${data.coLevel.toFixed(1)} ppm`;
    pm25El.textContent = `${data.pm25.toFixed(1)} µg/m³`;
    pm10El.textContent = `${data.pm10.toFixed(1)} µg/m³`;

    updateThermometer(data.temperature);
    updateAQIColor(data.aqi);
    updateUVIndexColor(data.uvIndex);

    const windSpeedKmh = (data.windSpeed * 3.6).toFixed(1);
    windSpeedEl.textContent = `${windSpeedKmh} km/h`;
    compassWindSpeedEl.textContent = windSpeedKmh;

    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    let windDegrees = 0;
    if (isNaN(data.windDirection)) {
        const index = directions.indexOf(data.windDirection.toUpperCase());
        windDegrees = index * 22.5;
    } else {
        windDegrees = parseFloat(data.windDirection);
    }
    const index = Math.round(windDegrees / 22.5) % 16;
    windDirectionEl.textContent = `${directions[index]} ${Math.round(windDegrees)}°`;
    windAngleEl.textContent = `${Math.round(windDegrees)}°`;
    needleEl.style.transform = `translate(-50%, -100%) rotate(${windDegrees}deg)`;
}

// AQI Color
function updateAQIColor(aqi) {
    const aqiValue = parseFloat(aqi);
    let color = '#4caf50';
    if (aqiValue > 50 && aqiValue <= 100) color = '#ffeb3b';
    else if (aqiValue > 100 && aqiValue <= 200) color = '#ff9800';
    else if (aqiValue > 200 && aqiValue <= 300) color = '#f44336';
    else if (aqiValue > 300 && aqiValue <= 400) color = '#9c27b0';
    else if (aqiValue > 400) color = '#795548';
    aqiEl.style.color = color;
    aqiEl.style.textShadow = `0 0 8px ${color}`;
}

// UV Index Color
function updateUVIndexColor(uvIndex) {
    const uvValue = parseFloat(uvIndex);
    let color = '#4caf50';
    if (uvValue >= 3 && uvValue < 6) color = '#ffeb3b';
    else if (uvValue >= 6 && uvValue < 8) color = '#ff9800';
    else if (uvValue >= 8 && uvValue < 11) color = '#f44336';
    else if (uvValue >= 11) color = '#9c27b0';

    uvIndexEl.style.color = color;
    uvIndexEl.style.textShadow = `0 0 8px ${color}`;

    const uvCard = document.getElementById('uv-card');
    if (uvCard) {
        uvCard.style.borderColor = color;
        uvCard.style.boxShadow = `0 0 12px ${color}`;
        uvCard.style.transition = 'all 0.3s ease';
    }
}

// Thermometer
function updateThermometer(temp) {
    const height = Math.min(100, Math.max(0, (temp / 50) * 100));
    thermometerEl.style.height = `${height}%`;
    if (temp < 10) thermometerEl.style.background = '#42a5f5';
    else if (temp < 25) thermometerEl.style.background = '#4caf50';
    else if (temp < 35) thermometerEl.style.background = '#ff9800';
    else thermometerEl.style.background = '#f44336';
}

// Sample Data
function getSampleData() {
    const now = new Date();
    const hour = now.getHours();
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
        rainfall: 0
    };
}

// Init
function init() {
    displayDateTime();
    setInterval(displayDateTime, 1000);
    initTemperatureChart();
    fetchWeatherData();
    setInterval(fetchWeatherData, 300000);
}

window.onload = init;
