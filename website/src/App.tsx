import Navigation from './components/Navigation';
import Hero from './components/Hero';
import Features from './components/Features';
import Usage from './components/Usage';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="App text-white flex flex-col min-h-screen">
      <Navigation />
      <main className="relative z-10 flex-grow">
        <Hero />
        <Features />
        <Usage />
      </main>
      <Footer />
    </div>
  );
}