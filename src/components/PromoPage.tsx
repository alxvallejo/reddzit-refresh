import { useTheme } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faBookmark, faBinoculars } from '@fortawesome/free-solid-svg-icons';

const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/reddzit-save-quotes-from/pphbloclmhhppmiknfjpddkefnialknl';

function FeatureSection({
  icon,
  headline,
  copy,
  imageSrc,
  imageAlt,
  reverse,
  isLight,
}: {
  icon: typeof faQuoteLeft;
  headline: string;
  copy: string;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
  isLight: boolean;
}) {
  const tilt = reverse ? '-rotate-1' : 'rotate-1';
  const glowColor = isLight
    ? 'rgba(249, 115, 22, 0.15)'
    : 'rgba(182, 170, 241, 0.2)';

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
    </div>
  );

  const imageBlock = (
    <div className="flex items-center justify-center">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl blur-2xl scale-105"
          style={{ backgroundColor: glowColor }}
        />
        <img
          src={imageSrc}
          alt={imageAlt}
          className={`relative rounded-2xl shadow-2xl ${tilt} max-w-full`}
          style={{ maxHeight: '480px' }}
        />
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

export default function PromoPage() {
  const { isLight } = useTheme();

  const heroGlow = isLight
    ? 'radial-gradient(ellipse at center, rgba(249, 115, 22, 0.12) 0%, transparent 70%)'
    : 'radial-gradient(ellipse at center, rgba(159, 114, 214, 0.2) 0%, transparent 70%)';

  const ctaBg = isLight ? 'var(--theme-primary)' : 'var(--theme-primary)';
  const ctaText = isLight ? '#ffffff' : 'var(--theme-bg)';

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      {/* Hero Section */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 md:px-8 min-h-screen md:min-h-0"
        style={{ height: 'auto', minHeight: '100dvh', background: heroGlow }}
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
          Reddit is massive. Your time isn't.
        </p>

        <p
          className="text-base md:text-lg max-w-2xl mb-10 leading-relaxed"
          style={{ color: 'var(--theme-textMuted)' }}
        >
          A smarter Reddit client that learns what you care about, saves what
          matters, and cuts through the noise.
        </p>

        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 rounded-full text-lg font-semibold transition-transform hover:scale-105"
          style={{
            backgroundColor: ctaBg,
            color: ctaText,
          }}
        >
          Install Free Extension
        </a>

        {/* Floating popup preview — hidden on mobile */}
        <div className="hidden md:block absolute bottom-12 right-32 opacity-80">
          <img
            src="/promo-assets/popup.png"
            alt="Extension popup preview"
            className="rounded-xl shadow-xl rotate-2"
            style={{ height: '200px' }}
          />
        </div>
      </section>

      {/* Divider */}
      <div
        className="mx-auto max-w-6xl"
        style={{
          borderTop: '1px solid var(--theme-border)',
          opacity: 0.5,
        }}
      />

      {/* Feature 1: Save Quotes */}
      <FeatureSection
        icon={faQuoteLeft}
        headline="Save Quotes from Anywhere"
        copy="Highlight any text on any webpage and save it with one click. Organize quotes into stories, add personal notes, and tag them for easy retrieval. Your personal knowledge base, built as you browse."
        imageSrc="/promo-assets/save-quote.png"
        imageAlt="Save Quote modal"
        isLight={isLight}
      />

      {/* Divider */}
      <div
        className="mx-auto max-w-6xl"
        style={{
          borderTop: '1px solid var(--theme-border)',
          opacity: 0.5,
        }}
      />

      {/* Feature 2: Saved Posts */}
      <FeatureSection
        icon={faBookmark}
        headline="Review Saved Posts"
        copy="Browse your Reddit saved posts in a clean, distraction-free reader view with full article content. No ads, no sidebar, no infinite scroll into irrelevance — just the content you already chose to keep."
        imageSrc="/promo-assets/saved-posts.png"
        imageAlt="Saved posts feed"
        reverse
        isLight={isLight}
      />

      {/* Divider */}
      <div
        className="mx-auto max-w-6xl"
        style={{
          borderTop: '1px solid var(--theme-border)',
          opacity: 0.5,
        }}
      />

      {/* Feature 3: Discover */}
      <FeatureSection
        icon={faBinoculars}
        headline="Discover What Matters"
        copy="An AI-powered For You feed that analyzes your saved posts to understand your real interests. Plus a trending marquee and top posts across all of Reddit, so you never miss what's worth reading."
        imageSrc="/promo-assets/reader.png"
        imageAlt="Article reader view"
        isLight={isLight}
      />

      {/* Divider */}
      <div
        className="mx-auto max-w-6xl"
        style={{
          borderTop: '1px solid var(--theme-border)',
          opacity: 0.5,
        }}
      />

      {/* Bottom CTA */}
      <section className="flex flex-col items-center justify-center text-center py-16 md:py-24 px-6 md:px-8">
        <h2
          className="text-2xl md:text-4xl font-bold mb-6"
          style={{ color: 'var(--theme-text)' }}
        >
          Ready to take control of your feed?
        </h2>

        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-4 rounded-full text-lg font-semibold mb-4 transition-transform hover:scale-105"
          style={{
            backgroundColor: ctaBg,
            color: ctaText,
          }}
        >
          Add to Chrome — It's Free
        </a>

        <p
          className="text-sm"
          style={{ color: 'var(--theme-textMuted)' }}
        >
          Works with Chrome, Edge, Brave, and all Chromium browsers
        </p>
      </section>
    </div>
  );
}
