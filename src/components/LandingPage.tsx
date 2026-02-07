import { Link } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faBinoculars,
  faQuoteLeft,
  faPenNib,
  faBolt,
  faPuzzlePiece,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import MainHeader from './MainHeader';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/pphbloclmhhppmiknfjpddkefnialknl';

function FeatureSection({
  icon,
  headline,
  copy,
  imageSrc,
  imageAlt,
  linkTo,
  linkLabel,
  externalLink,
  reverse,
  isLight,
}: {
  icon: IconDefinition;
  headline: string;
  copy: string;
  imageSrc?: string;
  imageAlt?: string;
  linkTo?: string;
  linkLabel: string;
  externalLink?: boolean;
  reverse?: boolean;
  isLight: boolean;
}) {
  const tilt = reverse ? '-rotate-1' : 'rotate-1';
  const glowColor = isLight
    ? 'rgba(249, 115, 22, 0.15)'
    : 'rgba(182, 170, 241, 0.2)';

  const linkButton = externalLink ? (
    <a
      href={linkTo}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-transform hover:scale-105 no-underline"
      style={{
        backgroundColor: isLight
          ? 'rgba(249, 115, 22, 0.1)'
          : 'rgba(182, 170, 241, 0.15)',
        color: 'var(--theme-primary)',
      }}
    >
      {linkLabel}
    </a>
  ) : linkTo ? (
    <Link
      to={linkTo}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-transform hover:scale-105 no-underline"
      style={{
        backgroundColor: isLight
          ? 'rgba(249, 115, 22, 0.1)'
          : 'rgba(182, 170, 241, 0.15)',
        color: 'var(--theme-primary)',
      }}
    >
      {linkLabel}
    </Link>
  ) : null;

  const textBlock = (
    <div className="flex flex-col justify-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
        style={{
          backgroundColor: isLight
            ? 'rgba(249, 115, 22, 0.1)'
            : 'rgba(182, 170, 241, 0.15)',
          color: 'var(--theme-primary)',
        }}
      >
        <FontAwesomeIcon icon={icon} />
      </div>
      <h2
        className="text-2xl md:text-3xl font-bold"
        style={{ color: 'var(--theme-text)' }}
      >
        {headline}
      </h2>
      <p
        className="text-lg leading-relaxed"
        style={{ color: 'var(--theme-textMuted)' }}
      >
        {copy}
      </p>
      {linkButton}
    </div>
  );

  const imageBlock = imageSrc ? (
    <div className="flex items-center justify-center">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl blur-2xl scale-105"
          style={{ backgroundColor: glowColor }}
        />
        <img
          src={imageSrc}
          alt={imageAlt || headline}
          className={`relative rounded-2xl shadow-2xl ${tilt} max-w-full`}
          style={{ maxHeight: '480px' }}
        />
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center">
      <div
        className="w-40 h-40 md:w-56 md:h-56 rounded-3xl flex items-center justify-center text-6xl md:text-8xl"
        style={{
          backgroundColor: isLight
            ? 'rgba(249, 115, 22, 0.08)'
            : 'rgba(182, 170, 241, 0.1)',
          color: 'var(--theme-primary)',
        }}
      >
        <FontAwesomeIcon icon={icon} />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-8 py-12 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
      {reverse ? (
        <>
          {imageBlock}
          {textBlock}
        </>
      ) : (
        <>
          {textBlock}
          {imageBlock}
        </>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div
      className="mx-auto max-w-6xl"
      style={{
        borderTop: '1px solid var(--theme-border)',
        opacity: 0.5,
      }}
    />
  );
}

export default function LandingPage() {
  const { signedIn, redirectForAuth } = useReddit();
  const { isLight } = useTheme();

  const heroGlow = isLight
    ? 'radial-gradient(ellipse at center, rgba(249, 115, 22, 0.12) 0%, transparent 70%)'
    : 'radial-gradient(ellipse at center, rgba(159, 114, 214, 0.2) 0%, transparent 70%)';

  const ctaBg = 'var(--theme-primary)';
  const ctaText = isLight ? '#ffffff' : 'var(--theme-bg)';

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      <MainHeader />

      {/* Hero Section */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 md:px-8"
        style={{
          minHeight: 'calc(100dvh - 64px)',
          background: heroGlow,
        }}
      >
        <div className="flex items-center gap-4 mb-6">
          <img
            src="/favicon.png"
            alt="Reddzit"
            className="w-14 h-14 md:w-20 md:h-20"
          />
          <h1
            className="text-4xl md:text-6xl font-bold"
            style={{
              fontFamily: '"Brygada 1918", serif',
              color: 'var(--theme-text)',
            }}
          >
            Reddzit
          </h1>
        </div>

        <p
          className="text-2xl md:text-3xl font-semibold mb-4"
          style={{ color: 'var(--theme-text)' }}
        >
          Keep track of your saved posts and comments.
        </p>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10 text-base md:text-lg" style={{ color: 'var(--theme-textMuted)' }}>
          <span className="flex items-center gap-2">
            <span style={{ color: 'var(--theme-primary)' }}>•</span>
            Saved Post Management
          </span>
          <span className="flex items-center gap-2">
            <span style={{ color: 'var(--theme-primary)' }}>•</span>
            Web Reader
          </span>
          <span className="flex items-center gap-2">
            <span style={{ color: 'var(--theme-primary)' }}>•</span>
            Writing Tool
          </span>
          <span className="flex items-center gap-2">
            <span style={{ color: 'var(--theme-primary)' }}>•</span>
            Chrome Extension
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/top"
            className="px-8 py-4 rounded-full text-lg font-semibold transition-transform hover:scale-105 no-underline"
            style={{
              backgroundColor: ctaBg,
              color: ctaText,
            }}
          >
            Browse Top Posts
          </Link>

          {!signedIn && (
            <button
              onClick={redirectForAuth}
              className="px-8 py-4 rounded-full text-lg font-semibold transition-transform hover:scale-105 border-2 cursor-pointer"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--theme-primary)',
                color: 'var(--theme-primary)',
              }}
            >
              Connect with Reddit
            </button>
          )}

          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-full text-lg font-semibold transition-transform hover:scale-105 border-2 no-underline"
            style={{
              backgroundColor: 'transparent',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-textMuted)',
            }}
          >
            <FontAwesomeIcon icon={faPuzzlePiece} className="mr-2" />
            Chrome Extension
          </a>
        </div>
      </section>

      <Divider />

      {/* Feature 1: Top Posts & Trending */}
      <FeatureSection
        icon={faArrowUp}
        headline="Top Posts & Trending"
        copy="See what's trending across all of Reddit with a live marquee and curated top posts. Stay informed without doomscrolling through endless feeds."
        imageSrc="/promo-assets/reader.png"
        imageAlt="Top posts reader view"
        linkTo="/top"
        linkLabel="Browse Top Posts"
        isLight={isLight}
      />

      <Divider />

      {/* Feature 2: For You Feed */}
      <FeatureSection
        icon={faBinoculars}
        headline="For You Feed"
        copy="An AI-powered persona that analyzes your saved posts to understand your real interests. Get personalized recommendations tailored to what you actually care about."
        imageSrc="/promo-assets/saved-posts.png"
        imageAlt="For You personalized feed"
        linkTo="/foryou"
        linkLabel="Explore For You"
        reverse
        isLight={isLight}
      />

      <Divider />

      {/* Feature 3: Save Quotes */}
      <FeatureSection
        icon={faQuoteLeft}
        headline="Save Quotes"
        copy="Highlight any text on any webpage and save it with one click using the browser extension. Organize quotes into collections and tag them for easy retrieval."
        imageSrc="/promo-assets/save-quote.png"
        imageAlt="Save quote modal"
        linkTo="/quotes"
        linkLabel="View Quotes"
        isLight={isLight}
      />

      <Divider />

      {/* Feature 4: Stories */}
      <FeatureSection
        icon={faPenNib}
        headline="Stories"
        copy="Build stories from your collected quotes and ideas. Weave together insights from across the web into cohesive narratives you can share or keep private."
        linkTo="/stories"
        linkLabel="View Stories"
        reverse
        isLight={isLight}
      />

      <Divider />

      {/* Feature 5: Daily Pulse */}
      <FeatureSection
        icon={faBolt}
        headline="Daily Pulse"
        copy="AI-generated briefings delivered to your inbox every morning. Get sentiment analysis and key takeaways from the topics you follow, without opening Reddit."
        linkTo="/top"
        linkLabel="See Top Posts"
        isLight={isLight}
      />

      <Divider />

      {/* Feature 6: Chrome Extension */}
      <FeatureSection
        icon={faPuzzlePiece}
        headline="Chrome Extension"
        copy="Install the free browser extension to save quotes, access your feeds, and get quick previews from any tab. Works with Chrome, Edge, Brave, and all Chromium browsers."
        imageSrc="/promo-assets/popup.png"
        imageAlt="Extension popup preview"
        linkTo={CHROME_STORE_URL}
        linkLabel="Get the Extension"
        externalLink
        reverse
        isLight={isLight}
      />

      <Divider />

      {/* Bottom CTA */}
      <section className="flex flex-col items-center justify-center text-center py-16 md:py-24 px-6 md:px-8">
        <h2
          className="text-2xl md:text-4xl font-bold mb-6"
          style={{ color: 'var(--theme-text)' }}
        >
          Ready to take control of your feed?
        </h2>

        <Link
          to="/top"
          className="px-8 py-4 rounded-full text-lg font-semibold mb-4 transition-transform hover:scale-105 no-underline"
          style={{
            backgroundColor: ctaBg,
            color: ctaText,
          }}
        >
          Get Started
        </Link>
      </section>
    </div>
  );
}
