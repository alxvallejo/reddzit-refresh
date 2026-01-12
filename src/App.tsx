// import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReactGA from 'react-ga';
import { RedditProvider } from './context/RedditContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/AppShell';
import About from './components/About';
import PostView from './components/PostView';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <RedditProvider>
          <div className='App'>
          <Routes>
            <Route index path='/' element={<AppShell />} />
            <Route path='/feed' element={<AppShell defaultTab="saved" />} />
            <Route path='/reddit' element={<AppShell defaultTab="saved" />} />
            <Route path='/about' element={<About />} />
            <Route path='/p/:fullname' element={<PostView />} />
            <Route path='/p/:fullname/:slug' element={<PostView />} />
            </Routes>
          </div>
        </RedditProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
