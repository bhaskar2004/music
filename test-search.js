const yts = require('youtube-sr').default;
yts.search('test', { limit: 2, type: 'video' }).then(res => console.log('Found:', res.length)).catch(err => console.error('Error:', err));
