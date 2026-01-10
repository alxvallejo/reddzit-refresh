import { useState } from 'react';

// import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReactGA from 'react-ga';
import { RedditProvider } from './context/RedditContext';
import Feed from './components/Feed';
import Main from './components/Main';
import About from './components/About';
import PostView from './components/PostView';

function App() {
  const [count, setCount] = useState(0);

  return (
    <BrowserRouter>
      <RedditProvider>
        <div className='App'>
          <Routes>
            <Route index path='/' element={<Main />} />
            <Route path='/feed' element={<Feed />} />
            <Route path='/reddit' element={<Feed />} />
            <Route path='/about' element={<About />} />
            <Route path='/p/:fullname' element={<PostView />} />
            <Route path='/p/:fullname/:slug' element={<PostView />} />
          </Routes>
        </div>
      </RedditProvider>
    </BrowserRouter>
  );
}

export default App;
