import { Link } from 'react-router-dom';

export default function CtaBanner({ title = 'Have an idea worth bringing to life?', text = 'Tell me what you’re making and I’ll reply with a plan and a quote.', label = 'Contact us', to = '/contact', tone = '' }) {
  return (
    <section className="section">
      <div className={`banner ${tone}`}><h2>{title}</h2><p>{text}</p><Link className="btn lg" to={to}>{label}</Link></div>
    </section>
  );
}
