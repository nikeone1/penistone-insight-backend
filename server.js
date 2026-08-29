const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let cachedReports = [];
let lastFetch = 0;

async function fetchReports() {
  try {
    console.log('Fetching reports...');
    
    const response = await fetch('https://www.fixmystreet.com/reports/Barnsley?sort=updated-desc', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PenistoneInsightHub/1.0)'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const reports = [];

    $('.item-list__item').each((i, el) => {
      if (i > 30) return;

      const title = $(el).find('h3 a').text().trim();
      const href = $(el).find('h3 a').attr('href') || '';
      const link = href.startsWith('http') ? href : 'https://www.fixmystreet.com' + href;
      const meta = $(el).find('.item-list__item__metadata').text().trim();
      const desc = $(el).find('p').first().text().trim();

      const fullText = (title + ' ' + meta + ' ' + desc).toLowerCase();

      // Focus on Penistone area
      if (
        fullText.includes('penistone') ||
        fullText.includes('thurlstone') ||
        fullText.includes('millhouse green') ||
        fullText.includes('hoylandswaine') ||
        fullText.includes('cubley') ||
        fullText.includes('oxspring') ||
        fullText.includes('springvale')
      ) {
        reports.push({
          id: link,
          title: title || 'Untitled report',
          loc: meta || 'Penistone area',
          area: 'Penistone',
          type: guessType(title + ' ' + desc),
          severity: /pothole|flood|dangerous|blocked/i.test(title) ? 'high' : 'normal',
          time: 'Recent',
          url: link,
          desc: desc,
          ts: Date.now() - (i * 45000)
        });
      }
    });

    cachedReports = reports;
    lastFetch = Date.now();
    console.log(`Loaded ${reports.length} relevant reports`);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

function guessType(text) {
  text = text.toLowerCase();
  if (text.includes('pothole') || text.includes('road surface')) return 'pothole';
  if (text.includes('litter') || text.includes('fly tip') || text.includes('rubbish') || text.includes('waste')) return 'litter';
  if (text.includes('light') || text.includes('lamp')) return 'lighting';
  if (text.includes('noise') || text.includes('asb') || text.includes('anti-social')) return 'asb';
  return 'other';
}

// Fetch on start + every 12 minutes
fetchReports();
setInterval(fetchReports, 12 * 60 * 1000);

app.get('/api/reports', (req, res) => {
  res.json({
    updated: new Date(lastFetch).toISOString(),
    count: cachedReports.length,
    reports: cachedReports
  });
});

app.get('/', (req, res) => {
  res.send('Penistone Insight Hub Backend is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});