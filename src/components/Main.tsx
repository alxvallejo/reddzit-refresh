import { Link } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';

const Main = () => {
  const { redirectForAuth } = useReddit();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)] p-8">
      <div className="max-w-[600px] text-center w-full">
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/favicon.png" 
            alt="Reddzit" 
            className="w-[120px] h-[120px] mb-4 drop-shadow-md max-sm:w-[100px] max-sm:h-[100px]" 
          />
          <h1 className="font-serif text-[3.5rem] text-white m-0 tracking-tight max-sm:text-[2.5rem]">
            Reddzit
          </h1>
        </div>

        <p className="text-xl text-white leading-relaxed mb-10 max-sm:text-lg">
          Reddzit pulls your saved posts into a distraction-free reading queue,
          so you can finally find and finish the good stuff you saved.
        </p>

        <div className="flex flex-col gap-5 mb-10 text-left">
          <div className="flex items-start gap-4 bg-white/50 p-5 rounded-xl shadow-md">
            <span className="text-3xl leading-none">📚</span>
            <div>
              <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">Review Your Saved Posts</h3>
              <p className="m-0 text-[0.95rem] text-gray-700">Access all your saved Reddit content in one clean interface</p>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-white/50 p-5 rounded-xl shadow-md">
            <span className="text-3xl leading-none">🚫</span>
            <div>
              <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">Ad-Free Reading</h3>
              <p className="m-0 text-[0.95rem] text-gray-700">Enjoy distraction-free content without the clutter</p>
            </div>
          </div>
          <div className="flex items-start gap-4 bg-white/50 p-5 rounded-xl shadow-md">
            <span className="text-3xl leading-none">🔖</span>
            <div>
              <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">Organize & Unsave</h3>
              <p className="m-0 text-[0.95rem] text-gray-700">Easily manage your saved posts and clear the backlog</p>
            </div>
          </div>
        </div>

        <button 
          onClick={redirectForAuth}
          className="inline-block bg-[#ff4500] text-white text-lg font-semibold py-4 px-10 rounded-full no-underline shadow-[0_4px_14px_rgba(255,69,0,0.3)] transition-all hover:bg-[#e03d00] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,69,0,0.4)] border-none cursor-pointer"
        >
          Connect with Reddit
        </button>

        <p className="mt-6 text-sm text-gray-600">
          We only access your saved posts. Your data stays yours.
        </p>
      </div>
    </div>
  );
};

export default Main;
