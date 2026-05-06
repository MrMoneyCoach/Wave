import Nav from "./components/Nav";
import ColdOpen from "./sections/ColdOpen";
import SleepingBaby from "./sections/SleepingBaby";
import Promise from "./sections/Promise";
import Anatomy from "./sections/Anatomy";
import Substance from "./sections/Substance";
import Planet from "./sections/Planet";
import Founder from "./sections/Founder";
import Reserve from "./sections/Reserve";
import Footer from "./sections/Footer";

export default function App() {
  return (
    <div className="bg-bare text-earth">
      <Nav />
      <main>
        <ColdOpen />
        <SleepingBaby />
        <Promise />
        <Anatomy />
        <Substance />
        <Planet />
        <Founder />
        <Reserve />
      </main>
      <Footer />
    </div>
  );
}
