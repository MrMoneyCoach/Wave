export default function Footer() {
  return (
    <footer className="bg-earth text-bare">
      <div className="mx-auto max-w-page px-6 sm:px-10 py-24">
        <div className="text-center">
          <p className="font-serif font-light text-[clamp(2.5rem,6vw,4.5rem)] tracking-wordmark lowercase">
            born bare
          </p>
          <p className="mt-4 font-serif italic text-bare/70 text-[clamp(1rem,1.6vw,1.25rem)]">
            Nothing but sleep.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-10 text-[12px] tracking-[0.18em] uppercase text-bare/60">
          <div>
            <p className="text-bare/40 mb-3">Shop</p>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-bare transition-colors">Bamboo nappies</a></li>
              <li><a href="#" className="hover:text-bare transition-colors">Subscription</a></li>
            </ul>
          </div>
          <div>
            <p className="text-bare/40 mb-3">About</p>
            <ul className="space-y-2">
              <li><a href="#story" className="hover:text-bare transition-colors">Our story</a></li>
              <li><a href="#" className="hover:text-bare transition-colors">Materials</a></li>
              <li><a href="#" className="hover:text-bare transition-colors">Sustainability</a></li>
            </ul>
          </div>
          <div>
            <p className="text-bare/40 mb-3">Help</p>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-bare transition-colors">FAQ</a></li>
              <li><a href="mailto:hello@bornbare.co.uk" className="hover:text-bare transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="text-bare/40 mb-3">Legal</p>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-bare transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-bare transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-20 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-bare/15 text-[11px] tracking-[0.22em] uppercase text-bare/40">
          <p>&copy; Born Bare {new Date().getFullYear()}</p>
          <p>wearebornbare.com</p>
        </div>
      </div>
    </footer>
  );
}
