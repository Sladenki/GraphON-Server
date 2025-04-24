import { Types } from 'mongoose';

export interface OptionalAuthContext {
  isAuthenticated: boolean;
  userId?: Types.ObjectId;
  user?: any;
} 