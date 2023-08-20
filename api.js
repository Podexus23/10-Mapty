const GEOKEY = '1b2f84f69a5947a58999c69dc41a31f6';
const WEATHERKEY = `0eWyM0dvtpBYRfGrjAZ1hxeEuxM0I4KK`;

const reverseGeoAPI = async function ([lat, lon]) {
  console.log('Searching:');
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOKEY}`,
      { method: 'GET' }
    );
    const data = await response.json();
    const { housenumber, street } = data.features[0].properties;

    return `${street} ${housenumber ?? ''}`;
  } catch (err) {
    throw new Error(err);
  }
};

const weatherAPI = async function (coords) {
  const [lat, lon] = coords;
  const locRes = await fetch(
    `http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${WEATHERKEY}&q=${lat}%2C%20${lon}`
  );
  const locData = await locRes.json();
  const weatherRes = await fetch(
    `http://dataservice.accuweather.com/forecasts/v1/daily/1day/${locData.Key}?apikey=${WEATHERKEY}&metric=true`
  );

  const weatherData = await weatherRes.json();
  console.log(weatherData);
  const temps = weatherData.DailyForecasts[0].Temperature;
  console.log();
  return `${temps.Minimum.Value}&#8451; - ${temps.Maximum.Value}&#8451;`;
};

export { reverseGeoAPI, weatherAPI };
