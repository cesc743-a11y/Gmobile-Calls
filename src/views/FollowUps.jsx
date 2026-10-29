import { dayKey, daysBetween, fmtDay, waLink, isMobile } from '../lib/util.js';
import { useT, money } from '../lib/i18n.js';

export default function FollowUps({ ctx, items }) {
  const { t, L, lang } = useT();
  const today = dayKey();
  const groups = [
    ['overdue', t('fuOverdue'), items.filter(c => c.follow_up_date < today), 'st-cancelled'],
    ['today', t('fuToday'), items.filter(c => c.follow_up_date === today), 'st-booked'],
    ['upcoming', t('fuUpcoming'), items.filter(c => c.follow_up_date > today), 'st-inquiry'],
  ];
  const tpl = ctx.settings[lang === 'ar' ? 'whatsapp_ar' : 'whatsapp_en'] || '';
  return (
    <div className="view">
      <p className="hint" style={{ margin: 0 }}>{t('fuHint')}</p>
      {!items.length && <div className="panel"><div className="empty"><b>{t('fuNone')}</b><span>{t('fuNoneSub')}</span></div></div>}
      {groups.filter(g => g[2].length).map(([k, label, list, cls]) => (
        <div key={k} className="panel fu-group">
          <h3>{label} <span className={'pill ' + cls}>{list.length}</span></h3>
          <div className="scroll"><table className="mini"><tbody>
            {list.map(c => (
              <tr key={c.id} className="call" onClick={() => ctx.openCall(c)}>
                <td><b>{c.name}</b><span className="sub mono">{c.phone}</span></td>
                <td>{c.device}<span className="sub">{c.quoted_price ? money(c.quoted_price) : L('price', c.price_range)}</span></td>
                <td><span className={'pill st-' + c.status}>{L('status', c.status)}</span></td>
                <td>{fmtDay(c.follow_up_date, lang)}{k === 'overdue' && <span className="sub">{t('fuDays', daysBetween(c.follow_up_date, today))}</span>}</td>
                <td>{ctx.nameOf(c.owner_id)}</td>
                <td onClick={e => e.stopPropagation()}>{isMobile(c.phone) && <a className="btn small wa" target="_blank" rel="noopener noreferrer" href={waLink(c.phone, tpl, { name: (c.name || '').split(' ')[0], device: c.device, price: c.quoted_price ? money(c.quoted_price) : '' })}>{t('whatsapp')}</a>}</td>
              </tr>))}
          </tbody></table></div>
        </div>
      ))}
    </div>
  );
}
