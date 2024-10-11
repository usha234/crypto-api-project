const express = require('express');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { fetchCryptoData } = require('./cryptoService');
const Crypto = require('./models/Crypto');

const app = express();


mongoose.connect('mongodb://localhost:27017/crypto')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));


function calculateStandardDeviation(prices) {
  const mean = prices.reduce((sum, value) => sum + value, 0) / prices.length;
  const variance = prices.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / prices.length;
  return Math.sqrt(variance);
}


cron.schedule('0 */2 * * *', async () => {
  console.log('Fetching crypto data...');
  
  try {
    const data = await fetchCryptoData();
    
    if (!data || Object.keys(data).length === 0) {
      console.error('No data fetched from API.');
      return;
    }

    const cryptoEntries = Object.entries(data).map(([coin, values]) => ({
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
      }
    }));

    await Crypto.bulkWrite(cryptoEntries);
    console.log('All crypto data fetched and stored/updated.');
  } catch (error) {
    console.error('Error during data fetching or storage:', error);
  }
});


(async () => {
  console.log('Fetching initial crypto data...');
  try {
    const data = await fetchCryptoData();
    
    if (!data || Object.keys(data).length === 0) {
      console.error('No data fetched from API during initial fetch.');
      return;
    }

    const cryptoEntries = Object.entries(data).map(([coin, values]) => ({
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
      }
    }));

    await Crypto.bulkWrite(cryptoEntries);
    console.log('Initial crypto data fetched and stored/updated.');
  } catch (error) {
    console.error('Error during initial data fetching:', error);
  }
})();


app.get('/stats', async (req, res) => {
  const { coin } = req.query;

  if (!coin) {
    return res.status(400).json({ error: 'Coin query parameter is required' });
  }

  try {
    const latestData = await Crypto.findOne({ coin }).sort({ fetchedAt: -1 });

    if (latestData) {
      res.json({
        price: latestData.price,
        marketCap: latestData.marketCap,
        '24hChange': latestData.change24h,
      });
    } else {
      res.status(404).json({ error: 'Coin not found' });
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/deviation', async (req, res) => {
  const { coin } = req.query;

  if (!coin) {
    return res.status(400).json({ error: 'Coin query parameter is required' });
  }

  try {
    const prices = await Crypto.find({ coin }).sort({ fetchedAt: -1 }).limit(100).select('price');

    if (prices.length) {
      const priceArray = prices.map(item => item.price);
      const deviation = calculateStandardDeviation(priceArray);

      res.json({ deviation });
    } else {
      res.status(404).json({ error: 'No data found for the specified coin' });
    }
  } catch (error) {
    console.error('Error fetching deviation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
