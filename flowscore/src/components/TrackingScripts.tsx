import Script from "next/script";

type Props = {
  facebookPixelId?: string | null;
  googleAnalyticsCode?: string | null;
  googleTagManagerId?: string | null;
  customTrackingScript?: string | null;
};

/** Renders quiz-owner-configured tracking scripts on the public scorecard
 *  pages. All inputs are operator-controlled so we trust them, but each
 *  script loads via next/script with afterInteractive so the public page is
 *  never blocked on a slow third-party tag. */
export default function TrackingScripts({
  facebookPixelId,
  googleAnalyticsCode,
  googleTagManagerId,
  customTrackingScript,
}: Props) {
  const fbId = facebookPixelId?.trim();
  const gtm = googleTagManagerId?.trim();
  const ga = googleAnalyticsCode?.trim();
  const custom = customTrackingScript?.trim();

  return (
    <>
      {fbId && (
        <Script id="fs-fb-pixel" strategy="afterInteractive">
          {`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(fbId)});
fbq('track', 'PageView');
          `}
        </Script>
      )}

      {gtm && (
        <Script id="fs-gtm" strategy="afterInteractive">
          {`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtm)});
          `}
        </Script>
      )}

      {ga && (
        // Operator pastes either a full GA snippet or just the measurement
        // ID. If it looks like a bare ID, wrap it; otherwise inject as-is.
        <Script id="fs-ga" strategy="afterInteractive">
          {/^G-[A-Z0-9-]+$|^UA-[A-Z0-9-]+$/i.test(ga)
            ? `
(function(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${ga}';document.head.appendChild(s);})();
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config', ${JSON.stringify(ga)});
            `
            : ga.replace(/<\/?script[^>]*>/gi, "")}
        </Script>
      )}

      {custom && (
        <Script id="fs-custom" strategy="afterInteractive">
          {custom.replace(/<\/?script[^>]*>/gi, "")}
        </Script>
      )}
    </>
  );
}
