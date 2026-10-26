import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';
import { Spinner } from './components/ui.jsx';
import Home from './pages/Home.jsx';
import Work from './pages/Work.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Packages from './pages/Packages.jsx';
import Services from './pages/Services.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';

// Admin is code-split so public visitors never download it
const Login = lazy(() => import('./pages/admin/Login.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const AProjects = lazy(() => import('./pages/admin/Projects.jsx'));
const ProjectEditor = lazy(() => import('./pages/admin/ProjectEditor.jsx'));
const APackages = lazy(() => import('./pages/admin/Packages.jsx'));
const Media = lazy(() => import('./pages/admin/Media.jsx'));
const Clients = lazy(() => import('./pages/admin/Clients.jsx'));
const ClientDetail = lazy(() => import('./pages/admin/Clients.jsx').then((m) => ({ default: m.ClientDetail })));
const ClientProject = lazy(() => import('./pages/admin/ClientProject.jsx'));
const Invoices = lazy(() => import('./pages/admin/Invoices.jsx'));
const InvoiceDetail = lazy(() => import('./pages/admin/Invoices.jsx').then((m) => ({ default: m.InvoiceDetail })));
const Enquiries = lazy(() => import('./pages/admin/Enquiries.jsx'));
const Settings = lazy(() => import('./pages/admin/Settings.jsx'));

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="work" element={<Work />} />
          <Route path="work/:slug" element={<ProjectDetail />} />
          <Route path="services" element={<Services />} />
          <Route path="packages" element={<Packages />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<AProjects />} />
          <Route path="projects/:id" element={<ProjectEditor />} />
          <Route path="packages" element={<APackages />} />
          <Route path="media" element={<Media />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="client-projects/:id" element={<ClientProject />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
