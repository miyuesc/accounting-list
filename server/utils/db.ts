import mongoose from 'mongoose';
import { useRuntimeConfig } from '#imports';

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) {
    console.log('=> using existing database connection');
    return;
  }

  try {
    const config = useRuntimeConfig();
    const mongodbUri = config.mongodbUri;

    if (!mongodbUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(mongodbUri);
    
    isConnected = true;
    console.log('=> using new database connection');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export function getMongoose() {
  return mongoose;
}