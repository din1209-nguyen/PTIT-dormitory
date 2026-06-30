import mongoose from 'mongoose';
import { ImportBatch } from './models/importBatch.model.js';
import { ImportRowError } from './models/importRowError.model.js';

mongoose.connect('mongodb://localhost:27017/final_cnpm').then(async () => {
  await ImportBatch.deleteMany({});
  await ImportRowError.deleteMany({});
  console.log('Cleared all import history');
  process.exit();
}).catch(console.error);
