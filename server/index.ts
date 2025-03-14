import { connectToDatabase } from './utils/db';

export default async () => {
  try {
    console.log('=> starting server');
    await connectToDatabase();
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
}; 