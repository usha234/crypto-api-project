const axios = require('axios');
const Crypto = require('./models/Crypto'); 

async function fetchCryptoData() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,matic-network,ethereum',
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_change: true,
      },
    });

    if (!response.data) {
      throw new Error('No data returned from CoinGecko API');
    }

    const cryptoEntries = Object.entries(response.data).map(([coin, values]) => ({
      updateOne: {
        filter: { coin },
        update: {
          $set: {
            price: values.usd,
            marketCap: values.usd_market_cap,
            change24h: values.usd_24h_change,
            fetchedAt: new Date(), 
          },
        },
        upsert: true, 
      },
    }));


    await Crypto.bulkWrite(cryptoEntries);
    console.log('Crypto data successfully fetched and stored/updated.');

    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error.message);
    throw error; 
  }
}

module.exports = { fetchCryptoData };


