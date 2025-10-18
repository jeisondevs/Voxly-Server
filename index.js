import express from 'express';
import notFound from './src/middlewares/not-found.js';
import postbackRouter from './src/routes/postbackcpx.js';

const app = express();
const PORT = process.env.PORT || 5991;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta raíz de comprobación
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido al servidor de Postback' });
});

// Montar router de CPX en un prefijo claro
app.use('/cpx', postbackRouter);

// Middleware 404
app.use(notFound);

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));