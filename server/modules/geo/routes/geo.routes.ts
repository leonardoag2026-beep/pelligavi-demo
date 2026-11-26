import { Router } from 'express';
import geoController from '../controllers/geo.controller.js';

const geoRoutes = Router();

geoRoutes.get('/cep/:cep', geoController.cep);
geoRoutes.get('/ruas', geoController.ruas);
geoRoutes.get('/sugestoes', geoController.sugestoes);
geoRoutes.get('/distancia', geoController.distancia);

export default geoRoutes;
