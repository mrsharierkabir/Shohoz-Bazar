import { useSite } from '../context/SiteContext';

export default function TopBar() {
  const { settings } = useSite();
  return (
    <div className="topbar">
      <div className="container">
        <div className="topbar-left">
          <span className="topbar-item">📞 Hotline: {settings.hotline}</span>
          <span className="topbar-item">💬 Whatsapp: {settings.whatsapp}</span>
          <span className="topbar-hours">{settings.hours_text}</span>
        </div>
        <div className="topbar-right">
          <span className="dot" /> {settings.cash_on_delivery_text}
        </div>
      </div>
    </div>
  );
}
