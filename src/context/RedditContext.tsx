import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RedditAuth } from '../helpers/RedditAuth';
import Reddit from '../helpers/Reddit';
import { getOptions, setOption } from '../helpers/Options';
import queryString from 'query-string';

interface RedditContextType {
  // Auth
  signedIn: boolean;
  user: any;
  loading: boolean;
  logout: () => void;
  
  // Feed
  saved: any[];
  after: string | null;
  fetchSaved: (params?: any) => Promise<void>;
  
  // Preferences
  darkMode: boolean;
  fontSize: number;
  toggleDarkMode: () => void;
  setFontSize: (size: number) => void;
  
  // Actions
  savePost: (id: string) => Promise<void>;
  unsavePost: (id: string) => Promise<void>;
  redirectForAuth: () => Promise<void>;
  
  // Helper
  redditHelper: any;
}

const RedditContext = createContext<RedditContextType | undefined>(undefined);

export const RedditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<any[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [redditHelper, setRedditHelper] = useState<any>(null); // Type as any for now due to JS helper
  
  const options = getOptions();
  const [darkMode, setDarkMode] = useState(options.darkMode ?? true);
  const [fontSize, setFontSizeState] = useState(options.fontSize || 18);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      const auth = new RedditAuth();
      const token = await auth.handleAuth();
      
      if (token) {
        const reddit = new Reddit({ accessToken: token });
        setRedditHelper(reddit);
        setSignedIn(true);
        
        try {
          await reddit.getMe();
          setUser(reddit.me);
        } catch (e) {
          console.error("Failed to fetch user", e);
        }
        
        // Clean up URL if we just auth'd
        const parsed = queryString.parse(window.location.search);
        if (parsed.code) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        // Not signed in or handling external link
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // Fetch saved on mount if signed in and user is loaded
  useEffect(() => {
    if (redditHelper && signedIn && user) {
      fetchSaved();
    }
  }, [redditHelper, signedIn, user]);

  const fetchSaved = useCallback(async (params = {}) => {
    if (!redditHelper) return;
    setLoading(true);
    
    // Check URL params if empty
    if (Object.keys(params).length === 0) {
      params = queryString.parse(window.location.search);
    }

    try {
      const result = await redditHelper.getSaved(params);
      setSaved(result.saved || []);
      setAfter(result.after);
    } catch (e) {
      console.error("Failed to fetch saved", e);
    } finally {
      setLoading(false);
    }
  }, [redditHelper]);

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    setOption({ darkMode: newVal });
  };
  
  const setFontSize = (size: number) => {
    setFontSizeState(size);
    setOption({ fontSize: size });
  };
  
  const savePost = async (id: string) => {
    if (redditHelper) {
      await redditHelper.save(id);
      setSaved(prev => prev.map(p => p.name === id ? { ...p, saved: true } : p));
    }
  };
  
  const unsavePost = async (id: string) => {
     if (redditHelper) {
      await redditHelper.unsave(id);
      setSaved(prev => prev.filter(p => p.name !== id));
    }
  };
  
  const logout = () => {
    localStorage.removeItem('redditCreds');
    localStorage.removeItem('redditRefreshToken');
    window.location.href = '/';
  };
  
  const redirectForAuth = async () => {
     const auth = new RedditAuth();
     await auth.redirectForAuth();
  };

  return (
    <RedditContext.Provider value={{
      signedIn, user, loading, logout,
      saved, after, fetchSaved,
      darkMode, fontSize, toggleDarkMode, setFontSize,
      savePost, unsavePost, redirectForAuth,
      redditHelper
    }}>
      {children}
    </RedditContext.Provider>
  );
};

export const useReddit = () => {
  const context = useContext(RedditContext);
  if (context === undefined) {
    throw new Error('useReddit must be used within a RedditProvider');
  }
  return context;
};
