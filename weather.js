// connect to the HTML boxes (by their id)
let themeBtn = document.getElementById("themeBtn");
let cityInput = document.getElementById("cityInput");
let searchBtn = document.getElementById("searchBtn");
let loader = document.getElementById("loader");
let weatherCard = document.getElementById("weatherCard");
let addFavBtn = document.getElementById("addFavBtn");
let errorMsg = document.getElementById("errorMsg");
let forecastList = document.getElementById("forecastList");
let favoritesList = document.getElementById("favoritesList");

// remembers the city that is shown on the card now
let currentCity = "";

// timer used by the debounce
let debounceTimer;

        // Your OpenWeatherMap API key

        let API_KEY = 'f7b3f66aaf5192c95082491740b70a0c';



        // 1. getWeather(city) - Fetch API + async/await

        async function getWeather(city) {
            try {
                // build the url
                let url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;

                // send the request and wait for the reply
                let response = await fetch(url);

                // different messages for different problems
                if (response.status === 404) {
                    throw new Error("City not found");
                }
                if (!response.ok) {
                    throw new Error("Something went wrong (status " + response.status + ")");
                }

                // read the data from the reply
                let data = await response.json();

                // return only the values we need
                return {
                    city: data.name,
                    temp: Math.round(data.main.temp),
                    feelsLike: Math.round(data.main.feels_like),
                    description: data.weather[0].description,
                    humidity: data.main.humidity,
                    windSpeed: data.wind.speed
                };
            } catch (error) {
                // pass the error to whoever called this function
                throw error;
            }
        }



        // get the 5-day forecast of a city

        async function getForecast(city) {
            try {
                let url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`;

                let response = await fetch(url);

                if (!response.ok) {
                    throw new Error("Forecast not available");
                }

                let data = await response.json();

                // the API gives a reading every 3 hours, so we keep only the 12:00 one of each day
                let days = [];
                for (let i = 0; i < data.list.length; i++) {
                    let item = data.list[i];
                    if (item.dt_txt.includes("12:00:00")) {
                        days.push({
                            day: new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday: "short" }),
                            temp: Math.round(item.main.temp),
                            description: item.weather[0].description
                        });
                    }
                }

                return days;
            } catch (error) {
                throw error;
            }
        }



        // show the forecast cards on the page

        function showForecast(days) {
            // clear the old cards first
            forecastList.innerHTML = "";

            for (let i = 0; i < days.length; i++) {
                let card = document.createElement("div");
                card.className = "forecast-card";
                card.innerHTML = `
                    <p><b>${days[i].day}</b></p>
                    <p>${days[i].temp}°C</p>
                    <p>${days[i].description}</p>
                `;
                forecastList.appendChild(card);
            }
        }



        // read the saved favorites (or an empty list if nothing is saved)

        function getFavorites() {
            let saved = localStorage.getItem("favorites");
            if (saved === null) {
                return [];
            } else {
                return JSON.parse(saved);
            }
        }



        // 2. addFavorite(city)

        async function addFavorite(city) {
            let favorites = getFavorites();

            // check duplicates
            if (favorites.includes(city)) {
                errorMsg.textContent = city + " is already in favorites";
                errorMsg.style.display = "block";
                return;
            }

            // add the city and save the list
            favorites.push(city);
            localStorage.setItem("favorites", JSON.stringify(favorites));

            // show the updated list
            loadFavorites();
        }



        // 3. loadFavorites()

        function loadFavorites() {
            let favorites = getFavorites();

            // clear the old list first
            favoritesList.innerHTML = "";

            if (favorites.length === 0) {
                favoritesList.innerHTML = "<p>No favorites yet</p>";
                return;
            }

            // make one row for each city
            for (let i = 0; i < favorites.length; i++) {
                let item = document.createElement("div");
                item.className = "fav-item";

                let name = document.createElement("span");
                name.textContent = favorites[i];
                name.style.cursor = "pointer";

                // clicking the name searches that city
                name.addEventListener("click", function() {
                    cityInput.value = favorites[i];
                    searchWeather(favorites[i]);
                });

                let removeBtn = document.createElement("button");
                removeBtn.textContent = "Remove";

                // clicking Remove deletes that city
                removeBtn.addEventListener("click", function() {
                    removeFavorite(favorites[i]);
                });

                item.appendChild(name);
                item.appendChild(removeBtn);
                favoritesList.appendChild(item);
            }
        }



        // remove a city from favorites

        function removeFavorite(city) {
            let favorites = getFavorites();
            let updated = [];

            // keep every city except the one being removed
            for (let i = 0; i < favorites.length; i++) {
                if (favorites[i] !== city) {
                    updated.push(favorites[i]);
                }
            }

            localStorage.setItem("favorites", JSON.stringify(updated));
            loadFavorites();
        }



        // 4. searchWeather()

        async function searchWeather(city) {
            // clear the old result and error, then show the loader
            errorMsg.style.display = "none";
            weatherCard.style.display = "none";
            addFavBtn.style.display = "none";
            loader.style.display = "block";

            try {
                // get the weather from the API
                let weather = await getWeather(city);

                // remember this city for the Add to Favorites button
                currentCity = weather.city;

                // put the weather inside the card
                weatherCard.innerHTML = `
                    <h2>${weather.city}</h2>
                    <p>Temperature: ${weather.temp}°C</p>
                    <p>Feels like: ${weather.feelsLike}°C</p>
                    <p>${weather.description}</p>
                    <p>Humidity: ${weather.humidity}%</p>
                    <p>Wind speed: ${weather.windSpeed} m/s</p>
                `;

                // show the card and the add button
                weatherCard.style.display = "block";
                addFavBtn.style.display = "block";

                // get and show the 5-day forecast
                let days = await getForecast(city);
                showForecast(days);
            } catch (error) {
                // show the error message
                errorMsg.textContent = error.message;
                errorMsg.style.display = "block";
            } finally {
                // this runs always, so hide the loader at the end
                loader.style.display = "none";
            }
        }



        // 5. debounceSearch() - waits 500ms after the user stops typing

        function debounceSearch() {
            // cancel the previous timer, so only the last typing counts
            clearTimeout(debounceTimer);

            debounceTimer = setTimeout(function() {
                let city = cityInput.value.trim();

                // do nothing if the input is empty
                if (city === "") {
                    return;
                }

                searchWeather(city);
            }, 500);
        }



        // apply the theme: "dark" or "light"

        function applyTheme(theme) {
            if (theme === "dark") {
                document.body.classList.add("dark");
                themeBtn.textContent = "☀️ Light";
            } else {
                document.body.classList.remove("dark");
                themeBtn.textContent = "🌙 Dark";
            }
        }



        // 6. Event Listeners (wire up buttons/inputs)

        document.addEventListener('DOMContentLoaded', function() {

            // when the search button is clicked
            searchBtn.addEventListener("click", function() {
                let city = cityInput.value.trim();

                // do nothing if the input is empty
                if (city === "") {
                    errorMsg.textContent = "Please enter a city name";
                    errorMsg.style.display = "block";
                    return;
                }

                searchWeather(city);
            });

            // when the user types in the input (debounced)
            cityInput.addEventListener("input", debounceSearch);

            // when Add to Favorites is clicked
            addFavBtn.addEventListener("click", function() {
                addFavorite(currentCity);
            });

            // when the theme button is clicked
            themeBtn.addEventListener("click", function() {
                if (document.body.classList.contains("dark")) {
                    applyTheme("light");
                    localStorage.setItem("theme", "light");
                } else {
                    applyTheme("dark");
                    localStorage.setItem("theme", "dark");
                }
            });

            // use the saved theme when the page opens
            let savedTheme = localStorage.getItem("theme");
            if (savedTheme === "dark") {
                applyTheme("dark");
            }

            // show the saved favorites when the page opens
            loadFavorites();

        });



        // Export functions for button onclick (temporary)

        window.searchWeather = searchWeather;

        window.addFavorite = addFavorite;

        console.log('weather.js loaded');