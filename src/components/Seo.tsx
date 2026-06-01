import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://reddzit.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

type SeoProps = {
  /** Full document title, e.g. "About Reddzit — a clean reader" */
  title: string;
  description: string;
  /** Route pathname, e.g. "/about". Used to build the canonical and og:url. */
  path: string;
  /** Absolute URL to the share image. Defaults to the site OG image. */
  image?: string;
  /** Emit <meta name="robots" content="noindex"> when true. */
  noindex?: boolean;
};

export default function Seo({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  noindex = false,
}: SeoProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex" /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:image" content={image} />
    </Helmet>
  );
}
