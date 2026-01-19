// import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReactGA from 'react-ga';
import { RedditProvider } from './context/RedditContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/AppShell';
import About from './components/About';
import PostView from './components/PostView';
import Admin from './components/Admin';
import ForYouSettings from './components/ForYouSettings';
import ForYouReport from './components/ForYouReport';
import SubredditFeed from './components/SubredditFeed';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <RedditProvider>
          <div className='App'>
          <Routes>
            <Route index path='/' element={<AppShell />} />
            <Route path='/top' element={<AppShell />} />
            <Route path='/foryou' element={<AppShell />} />
            <Route path='/foryou/settings' element={<ForYouSettings />} />
            <Route path='/foryou/report' element={<ForYouReport />} />
            <Route path='/reddit' element={<AppShell />} />
            <Route path='/r/:name' element={<SubredditFeed />} />
            <Route path='/about' element={<About />} />
            <Route path='/p/:fullname' element={<PostView />} />
            <Route path='/p/:fullname/:slug' element={<PostView />} />
            <Route path='/admin' element={<Admin />} />
            </Routes>
          </div>
        </RedditProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
