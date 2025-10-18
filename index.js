import express from 'express';
const app = express();
const PORT = 3000;



app.get('/', (req, res) => {
    res.json({ message: 'Bienvenido al servidor de Postback'});
});

import notFound from "./src/middlewares/not-found.js";
app.use(notFound);

app.listen(PORT, () => console.log('http://localhost:+{PORT}'));
