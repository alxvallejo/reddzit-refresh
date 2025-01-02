import { useState } from 'react';

// import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ReactGA from 'react-ga';
import RedditLogin from './components/RedditLogin';
import Main from './components/Main';
import About from './components/About';

function App() {
  const [count, setCount] = useState(0);

  return (
    <BrowserRouter>
      <div className='App'>
        <Routes>
          <Route index path='/' element={<Main />} />
          <Route path='/reddit' element={<RedditLogin />} />
          <Route path='/about' element={<About />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
