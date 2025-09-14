
import { createContext } from 'react';
import { User, Course, Teacher, Student, Session, Group, Class, AppContextType as AppContextTypeDefinition } from '../types';

export interface AppContextType extends AppContextTypeDefinition {}

export const AppContext = createContext<AppContextType | null>(null);
