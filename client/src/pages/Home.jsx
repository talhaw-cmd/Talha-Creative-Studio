import { useRef } from 'react';
import { api } from '../lib/api.js';
import { useAsync, useTitle } from '../lib/useAsync.js';
import { useSplitHeadings } from '../lib/motion.js';
import Hero from '../components/Hero.jsx';
import WorkReel from '../components/WorkReel.jsx';
import ServiceStack from '../components/ServiceStack.jsx';
import Process from '../components/Process.jsx';
import CtaBanner from '../components/CtaBanner.jsx';

export default function Home() {
  useTitle('');
  const root = useRef(null);
  const work = useAsync(() => api.get('/projects', { limit: 8 }), []);
  const projects = work.data?.data || [];
  useSplitHeadings(root, []);
  return (
    <div ref={root}>
      <Hero projects={projects} />
      <WorkReel projects={projects} loading={work.loading} error={work.error} onRetry={work.reload} />
      <ServiceStack />
      <Process />
      <CtaBanner />
    </div>
  );
}
