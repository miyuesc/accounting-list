import { connectToDatabase } from './utils/db';

export default async () => {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error('Failed to initialize server:', error);
  }
}; 