import { Outlet } from 'react-router-dom';
import { Navbar } from '../navbar/navbar';
import { Footer } from '../footer/footer';
import { DemoBar } from '../demo-bar/demo-bar';

export const SiteLayout: React.FC = () => (
  <>
    <DemoBar />
    <Navbar />
    <Outlet />
    <Footer />
  </>
);
