const GEOKEY = '1b2f84f69a5947a58999c69dc41a31f6';

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

export { reverseGeoAPI };
