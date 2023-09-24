'use strict';

import uniqWith from 'lodash.uniqwith';
import icons from 'url:../img/icons.svg';

// VARIABLES
const searchInput = document.querySelector('.search-input');
const suggestions = document.querySelector('.autocomplete');
const currLocationWeatherBtn = document.querySelector('.btn-gps');
const loader = document.querySelector('.loader-container');
const weatherContainer = document.querySelector('.weather');
const sectionWeather = document.querySelector('#section-weather');
const currentWeatherContainer = document.querySelector('.weather__current');
const weatherByDays = document.querySelector('.weather__days');
const weatherDetailed = document.querySelector('.weather__detailed');
const canvas = document.getElementById('chart');

const weatherCodes = {
  0: ['Clear sky', `${icons}#icon-day`],
  1: ['Mainly clear', `${icons}#icon-day`],
  2: ['Partly cloudy', `${icons}#icon-cloudy-day-1`],
  3: ['Overcast', `${icons}#icon-cloudy`],
  45: ['Fog', `${icons}#icon-cloudy`],
  48: 'Depositing rime fog',
  51: 'Drizzle: Light intensity',
  53: 'Drizzle: Moderate intensity',
  55: 'Drizzle: Dense intensity',
  56: 'Freezing Drizzle: Light intensity',
  57: 'Freezing Drizzle: Dense intensity',
  61: ['Rain: Slight intensity', `${icons}#icon-rainy-3`],
  63: ['Rain: Moderate intensity', `${icons}#icon-rainy-4`],
  65: ['Raing: Heavy intensity', `${icons}#icon-rainy-5`],
  66: 'Freezing Rain: Light intensity',
  67: 'Freezing Rain: Heavy intensity',
  71: 'Snow fall: Slight intensity',
  73: 'Snow fall: Moderate Intensity',
  75: 'Snow fall: Heavy intensity',
  77: 'Snow grains',
  80: ['Rain showers: Slight', `${icons}#icon-rainy-3`],
  81: ['Rain showers: Moderate', `${icons}#icon-rainy-4`],
  82: ['Rain showers: Violent', `${icons}#icon-rainy-5`],
  85: 'Snow showers: Slight',
  86: 'Snow showers: Heavy',
  95: ['Thunderstorm: Slight', `${icons}#icon-thunder`],
  96: ['Thunderstorm with slight hail', `${icons}#icon-thunder`],
  99: ['Thunderstorm with heavy hail', `${icons}#icon-rainy-5`],
};

// FUNCTIONS
class Weather {
  day = [];

  constructor(data, city, country) {
    this.selected_day = 0;
    this.selected_hour = new Intl.DateTimeFormat('en-UK', {
      hour: 'numeric',
    }).format();
    this.city = city;
    this.country = country;
    this.coords = [data.latitude, data.longitude];
    this.current = {
      temperature: data.current_weather.temperature,
      windspeed: data.current_weather.windspeed,
      winddirection: data.current_weather.winddirection,
      humidity:
        data.hourly.relativehumidity_2m[
          new Intl.DateTimeFormat('en-UK', { hour: '2-digit' }).format(
            new Date(data.current_weather.time)
          )
        ],
      precipitation:
        data.hourly.precipitation[
          new Intl.DateTimeFormat('en-UK', { hour: '2-digit' }).format(
            new Date(data.current_weather.time)
          )
        ],
      weatherStatus: weatherCodes[data.current_weather.weathercode],
    };
    for (let i = 0; i < 7; i++) {
      this.day.push({
        maxTemp: data.daily.temperature_2m_max[i],
        minTemp: data.daily.temperature_2m_min[i],
        precipitationSum: data.daily.precipitation_sum[i],
        sunrise: new Intl.DateTimeFormat('en-UK', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(data.daily.sunrise[i])),
        sunset: new Intl.DateTimeFormat('en-UK', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(data.daily.sunset[i])),
        time: new Intl.DateTimeFormat('en-UK', {
          day: '2-digit',
          month: '2-digit',
        }).format(new Date(data.daily.time[i])),
        weatherStatus: weatherCodes[data.daily.weathercode[i]],
        hourly_precipitationProb: data.hourly.precipitation_probability.slice(
          24 * i,
          24 * i + 24
        ),
        hourly_precipitation: data.hourly.precipitation.slice(
          24 * i,
          24 * i + 24
        ),
        hourly_temperature: data.hourly.temperature_2m.slice(
          24 * i,
          24 * i + 24
        ),
        hourly_humidity: data.hourly.relativehumidity_2m.slice(
          24 * i,
          24 * i + 24
        ),
        hourly_visibility: data.hourly.visibility
          .slice(24 * i, 24 * i + 24)
          .map(vis => vis / 1000),
        hourly_windspeed: data.hourly.windspeed_10m.slice(24 * i, 24 * i + 24),
        hourly_winddirection: data.hourly.winddirection_10m.slice(
          24 * i,
          24 * i + 24
        ),
        hourly_time: data.hourly.time.slice(24 * i, 24 * i + 24),
        hourly_pressure: data.hourly.surface_pressure.slice(
          24 * i,
          24 * i + 24
        ),
        hourly_weatherStatus: data.hourly.weathercode
          .slice(24 * i, 24 * i + 24)
          .map(code => weatherCodes[code]),
      });
    }
    this._renderWeather();

    // Clear and render chart
    this.chart = new Chart('myChart', {});
    this.chart.destroy();
    this.chart = this._renderChart(
      this.day[0].hourly_time,
      this.day[0].hourly_temperature,
      this.day[0].hourly_precipitationProb
    );
    document
      .querySelector('.weather__days')
      .addEventListener('click', this._renderDay.bind(this));

    // Get data from chart
    document.getElementById('myChart').onclick = evt => {
      const res = this.chart.getElementsAtEventForMode(
        evt,
        'nearest',
        { intersect: false },
        true
      );

      // If didn't click on a bar, `res` will be an empty array
      if (res.length === 0) {
        return;
      }
      // Alerts "You clicked on A" if you click the "A" chart
      this.selected_hour = res[0]._index;
      this._renderDetailedWeather();
    };

    this._renderDetailedWeather();
  }

  _renderDay(e) {
    const activeDay = e.target.closest('.weather__days-info');
    if (!activeDay) return;

    document
      .querySelectorAll('.weather__days-info')
      .forEach(el => el.classList.remove('weather__days--active'));
    activeDay.classList.add('weather__days--active');
    this.selected_day = activeDay.dataset.day;
    this.selected_hour = 12;
    this.chart.destroy();
    this.chart = this._renderChart(
      this.day[activeDay.dataset.day].hourly_time,
      this.day[activeDay.dataset.day].hourly_temperature,
      this.day[activeDay.dataset.day].hourly_precipitationProb
    );
    this._renderDetailedWeather();
  }
  _renderWeather() {
    weatherContainer.innerHTML = '';
    const html = `
    
    <div class='weather__current'>
    <h2 class="heading--2 heading--grid">
    Current weather in ${this.city}, ${this.country}
  </h2>
  <div class="weather__data">
    <div class="weather__data-title">Temperature</div>
    <div class="weather__data-info temperature">
    ${this.current.temperature} °C <svg class="icon icon-cloudy"><use href=${
      this.current.weatherStatus[1]
    }></svg>
  </div>
    
  </div>
  <div class="weather__data">
    <div class="weather__data-title">Precipitations</div>
    <div class="weather__data-info">${this.current.precipitation}mm</div>
  </div>
  <div class="weather__data">
    <div class="weather__data-title">Humidity</div>
    <div class="weather__data-info">${this.current.humidity}%</div>
  </div>
  <div class="weather__data">
    <div class="weather__data-title">Wind speed</div>
    <div class="weather__data-info" style="display:flex;gap:1rem;">
      ${
        this.current.windspeed
      } km/h <span style="color:white;fontweight:700;font-size:2rem;transform:rotate(${
      this.current.winddirection
    }deg)">&uarr;</span>
    </div>
  </div>
  </div>
  
     <h2 class="heading--2">Weather by Days</h2>
        <div class="weather__days">
        ${this.day
          .map(
            (day, i) =>
              `<div class="weather__days-info ${
                this.selected_day === i ? 'weather__days--active' : ''
              }" data-day="${i}">
          <div class="weather__days-date">${day.time}</div>
          <div class="weather__days-temp--max">${day.maxTemp}°</div>
          <div class="weather__days-temp--min">${day.minTemp}°</div>
          <svg class="icon icon-cloudy"><use href=${day.weatherStatus[1]}></svg>
        </div>`
          )
          .join('')}
        </div>
        `;

    weatherContainer.insertAdjacentHTML('afterbegin', html);

    // setTimeout(
    //   this._renderChart(
    //     this.day[5].hourly_time,
    //     this.day[5].hourly_temperature
    //   ),
    //   10000
    // );
    setTimeout(
      () => sectionWeather.scrollIntoView({ behavior: 'smooth' }),
      100
    );
  }

  _renderDetailedWeather() {
    weatherDetailed.innerHTML = '';
    const html = `
    <div class="weather__data-title weather__detailed-time">
          ${this.city}, ${this.country}, ${new Intl.DateTimeFormat('en-UK', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(
      new Date(this.day[this.selected_day].hourly_time[this.selected_hour])
    )}
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Temperature</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].hourly_temperature[this.selected_hour]
          } °C <svg class="icon icon-cloudy"><use href=${
      this.day[this.selected_day].hourly_weatherStatus[this.selected_hour][1]
    }></svg></div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Description</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].hourly_weatherStatus[
              this.selected_hour
            ][0]
          }</div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Precipitation probability</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].hourly_precipitationProb[
              this.selected_hour
            ]
          } %</div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Precipitations</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].hourly_precipitation[this.selected_hour]
          } mm</div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Humidity</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].hourly_humidity[this.selected_hour]
          } %</div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Visibility</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].hourly_visibility[this.selected_hour]
          } km</div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Wind speed</div>
          <div class="weather__data-info" style="display: flex; gap: 1rem">
            ${
              this.day[this.selected_day].hourly_windspeed[this.selected_hour]
            } km/h
            <span
              style="
                color: white;
                fontweight: 700;
                font-size: 2rem;
                transform: rotate(${
                  this.day[this.selected_day].hourly_winddirection[
                    this.selected_hour
                  ]
                }deg);
              "
              >&uarr;</span
            >
          </div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Surface pressure</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].hourly_pressure[this.selected_hour]
          } hPa</div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Sunrise</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].sunrise
          }</div>
        </div>

        <div class="weather__data bordered">
          <div class="weather__data-title">Sunset</div>
          <div class="weather__data-info">${
            this.day[this.selected_day].sunset
          }</div>
        </div>
    `;

    weatherDetailed.insertAdjacentHTML('afterbegin', html);
  }

  _renderChart(xVal, yVal, yVal2) {
    return new Chart('myChart', {
      type: 'line',
      data: {
        labels: xVal.map(time =>
          new Intl.DateTimeFormat('en-UK', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(time))
        ),
        datasets: [
          {
            label: 'Temperature',
            pointBorderColor: 'rgba(0, 0, 0, 0)',
            pointBackgroundColor: 'rgba(0, 0, 0, 0)',
            pointHoverBackgroundColor: 'rgb(54, 162, 235)',
            pointHoverBorderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgb(33, 37, 41)',
            borderColor: 'white',
            data: yVal,
            fill: false,
          },
          {
            type: 'bar',
            label: 'Precipitations',
            pointBorderColor: 'rgba(0, 0, 0, 0)',
            pointBackgroundColor: 'rgba(0, 0, 0, 0)',
            pointHoverBackgroundColor: 'rgb(54, 162, 235)',
            pointHoverBorderColor: 'rgb(54, 162, 235)',
            backgroundColor: '#7CB9E8',
            borderColor: '#7CB9E8',
            data: yVal2,
            fill: false,
          },
        ],
      },
      options: {
        tooltips: {
          mode: 'index',
          intersect: false,
        },
        hover: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          xAxes: [
            {
              ticks: {
                maxTicksLimit: 8,
                callback: (time, index, values) => {
                  const date = new Date(time);
                  if (date.getHours() == 0)
                    return `${new Intl.DateTimeFormat('en-UK', {
                      day: '2-digit',
                      month: 'short',
                    }).format(new Date(date))}`;
                  else
                    return `${new Intl.DateTimeFormat('en-UK', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(xVal[index]))}`;
                },
              },
            },
          ],
        },
      },
    });
  }
}

const getJSON = async function (url, errorMsg = 'Something went wrong') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${errorMsg} (${response.status})`);

  return response.json();
};

const getPosition = function () {
  return new Promise(function (resolve, reject) {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
};

const getSuggestions = async function (text) {
  try {
    const data = await getJSON(
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${text}&apiKey=adb96bbfc19e4580bc00436f2ee9890f`
    );
    return data;
  } catch (err) {
    alert('Something went wrong. Try again.');
  }
};

const autocomplete = async function (text) {
  try {
    suggestions.innerHTML = '';
    const data = await getSuggestions(text);
    const unList = data.features.map(obj => {
      return [
        obj.properties.city,
        obj.properties.country,
        obj.geometry.coordinates,
      ];
    });

    // Deleting duplicates
    // const list = Array.from(new Set(unList.map(JSON.stringify)), JSON.parse);
    const list = uniqWith(
      unList,
      (arrVal, othVal) => arrVal[0] === othVal[0] && arrVal[1] === othVal[1]
    );
    loader.style.display = 'none';

    // Creating suggestion elements
    list.forEach(group => {
      if (group[0]) {
        const html = `<li class="suggestion" data-lat="${
          group[2][1]
        }" data-lng="${group[2][0]}" data-city="${group[0]}" data-country="${
          group[1]
        }">${group[0]}, ${group[1]} <span>[${group[2][1].toFixed(
          4
        )}, ${group[2][0].toFixed(4)}]</span></li>`;
        suggestions.insertAdjacentHTML('afterbegin', html);
      }
    });
  } catch (err) {
    list.insertAdjacentHTML('afterbegin', '<li>No city was found</li>');
  }
};
let timer;

// Autocompletion event handler
searchInput.addEventListener('keyup', function (e) {
  // e.preventDefault();

  clearTimeout(timer);
  timer = setTimeout(() => {
    if (searchInput.value.length >= 3) {
      loader.style.display = 'flex';
      autocomplete(searchInput.value);
    } else {
      suggestions.innerHTML = '';
    }
  }, 250);
});

// Log the weather data

let weather;
const getWeatherData = async function (e) {
  try {
    const el = e.target.closest('.suggestion');
    if (!el.classList.contains('suggestion')) return;

    suggestions.innerHTML = '';
    searchInput.value = '';

    const data = await getJSON(
      `https://api.open-meteo.com/v1/forecast?latitude=${el.dataset.lat}&longitude=${el.dataset.lng}&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,precipitation,weathercode,surface_pressure,visibility,windspeed_10m,winddirection_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,rain_sum,precipitation_hours,winddirection_10m_dominant&current_weather=true&timezone=auto`
    );

    if (weather) weather.chart.destroy();
    weather = new Weather(data, el.dataset.city, el.dataset.country);

    if (sectionWeather.classList.contains('hidden'))
      sectionWeather.classList.remove('hidden');
    // renderWeather(data, el.dataset.city, el.dataset.country);
  } catch (err) {
    console.error(err);
  }
};

suggestions.addEventListener('click', getWeatherData);

const getCurrentWeather = async function (e) {
  try {
    e.preventDefault();
    const pos = await getPosition();
    const { latitude: lat, longitude: lng } = pos.coords;

    suggestions.innerHTML = '';
    searchInput.value = '';

    const requests = await Promise.all([
      getJSON(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,precipitation,weathercode,surface_pressure,visibility,windspeed_10m,winddirection_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,rain_sum,precipitation_hours,winddirection_10m_dominant&current_weather=true&timezone=auto`
      ),
      getJSON(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=adb96bbfc19e4580bc00436f2ee9890f`
      ),
    ]);
    const weatherData = requests[0];
    const [city, country] = [
      requests[1].results[0].city,
      requests[1].results[0].country,
    ];
    if (sectionWeather.classList.contains('hidden'))
      sectionWeather.classList.remove('hidden');
    if (weather) weather.chart.destroy();
    weather = new Weather(weatherData, city, country);
  } catch (err) {
    console.error(err.message);
  }
};

currLocationWeatherBtn.addEventListener('click', getCurrentWeather);
