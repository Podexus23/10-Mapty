const GEOKEY = '1b2f84f69a5947a58999c69dc41a31f6';

const geocodeAPI = async function ([lat, lon]) {
  console.log('Searching:');
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOKEY}`,
      { method: 'GET' }
    );
    const data = await response.json();
    console.log(data.features);
    const { address_line2, city, housenumber, street } =
      data.features[0].properties;
    console.log(address_line2, city, housenumber, street);
  } catch (err) {
    throw new Error(err);
  }
};

export { geocodeAPI };
