import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import type { ClassRoom } from '../types';
import { listClassesForUser } from '../services/classService';
import { useAuth } from './AuthContext';

interface ClassContextValue {
  classes: ClassRoom[];
  currentClassId: string;
  currentClass: ClassRoom | null;
  setCurrentClassId: (id: string) => void;
  loadingClasses: boolean;
  classError: string;
  reloadClasses: () => Promise<void>;
}

const ClassContext = createContext<ClassContextValue | null>(null);

export function ClassProvider({ children }: PropsWithChildren) {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [currentClassId, setCurrentClassIdState] = useState(() => localStorage.getItem('currentClassId') || '');
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classError, setClassError] = useState('');

  async function reloadClasses() {
    if (!profile?.isApproved || !profile.isActive) {
      setClasses([]);
      setClassError('');
      return;
    }
    setLoadingClasses(true);
    setClassError('');
    try {
      const next = await listClassesForUser(profile);
      setClasses(next);
      const valid = next.some((item) => item.id === currentClassId);
      if (!valid) {
        const first = next[0]?.id || '';
        setCurrentClassIdState(first);
        if (first) localStorage.setItem('currentClassId', first);
        else localStorage.removeItem('currentClassId');
      }
    } catch (err) {
      console.error('Không thể tải danh sách lớp:', err);
      setClasses([]);
      setClassError(err instanceof Error ? err.message : 'Không thể tải danh sách lớp từ Firebase.');
    } finally {
      setLoadingClasses(false);
    }
  }

  useEffect(() => {
    void reloadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, profile?.role, profile?.isApproved, profile?.isActive, JSON.stringify(profile?.classIds || [])]);

  const setCurrentClassId = (id: string) => {
    setCurrentClassIdState(id);
    if (id) localStorage.setItem('currentClassId', id);
    else localStorage.removeItem('currentClassId');
  };

  const currentClass = classes.find((item) => item.id === currentClassId) || null;
  const value = useMemo(() => ({
    classes,
    currentClassId,
    currentClass,
    setCurrentClassId,
    loadingClasses,
    classError,
    reloadClasses
  }), [classes, currentClassId, currentClass, loadingClasses, classError]);

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>;
}

export function useClassRoom(): ClassContextValue {
  const value = useContext(ClassContext);
  if (!value) throw new Error('useClassRoom phải được dùng bên trong ClassProvider.');
  return value;
}
