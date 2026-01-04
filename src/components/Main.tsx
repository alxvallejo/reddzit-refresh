import { Link } from 'react-router-dom';
import './Main.scss';

const Main = () => {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <div className="logo-section">
          <img src="/favicon.png" alt="Reddzit" className="landing-logo" />
          <h1 className="landing-title">Reddzit</h1>
        </div>

        <p className="landing-tagline">
          Reddzit pulls your saved posts into a distraction-free reading queue,
          so you can finally find and finish the good stuff you saved.
        </p>

        <div className="features">
          <div className="feature">
            <span className="feature-icon">📚</span>
            <div className="feature-text">
              <h3>Review Your Saved Posts</h3>
              <p>Access all your saved Reddit content in one clean interface</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">🚫</span>
            <div className="feature-text">
              <h3>Ad-Free Reading</h3>
              <p>Enjoy distraction-free content without the clutter</p>
            </div>
          </div>
          <div className="feature">
            <span className="feature-icon">🔖</span>
            <div className="feature-text">
              <h3>Organize & Unsave</h3>
              <p>Easily manage your saved posts and clear the backlog</p>
            </div>
          </div>
        </div>

        <Link to="/reddit" className="cta-button">
          Connect with Reddit
        </Link>

        <p className="privacy-note">
          We only access your saved posts. Your data stays yours.
        </p>
      </div>
    </div>
  );
};

export default Main;
