require('dotenv').config(); // Charge le .env
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bonjour API CafThé !');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});