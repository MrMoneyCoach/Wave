const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://wearebornbare.com";

export default function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Born Bare",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
      "Bamboo nappies for better sleep. Honest materials, kinder to skin, gentler on the planet.",
    slogan: "Nothing but sleep.",
    email: "hello@bornbare.co.uk",
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
