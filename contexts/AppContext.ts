
import { createContext, useContext } from 'react';
import { User, Course, Teacher, Student, Session, Group, Class, AppContextType as AppContextTypeDefinition } from '../types';

export interface AppContextType extends AppContextTypeDefinition {}

export const AppContext = createContext<AppContextType | null>(null);

// Export a custom hook to use the AppContext
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
